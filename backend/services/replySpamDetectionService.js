const axios = require('axios');
const toxicityDetectionService = require('./toxicityDetectionService');

class ReplySpamDetectionService {
    constructor() {
        this.huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
        this.modelUrl = 'https://api-inference.huggingface.co/models/mrm8488/bert-tiny-finetuned-sms-spam-detection';
        this.headers = {
            'Authorization': `Bearer ${this.huggingFaceApiKey}`,
            'Content-Type': 'application/json'
        };
        this.toxicityServiceReady = false;
        // Don't initialize in constructor to avoid blocking
    }

    /**
     * Initialize toxicity detection service
     */
    async initializeToxicityService() {
        try {
            const result = await toxicityDetectionService.initialize();
            if (result) {
                console.log('✅ Enhanced spam detection with toxicity filtering enabled');
                return true;
            } else {
                console.log('⚠️  Using basic spam detection (toxicity detection unavailable)');
                return false;
            }
        } catch (error) {
            console.log('⚠️  Using basic spam detection (toxicity detection unavailable)');
            return false;
        }
    }

    /**
     * Enhanced spam/toxicity classification combining BERT and Detoxify
     * @param {string} text - Nội dung reply cần phân loại
     * @returns {Object} Kết quả phân loại {isSpam, confidence, label, scores, toxicity}
     */
    async classifyReply(text) {
        try {
            // Validate input
            if (!text || text.trim().length === 0) {
                throw new Error('Text content is required');
            }

            // Initialize toxicity service if not done yet (lazy loading)
            if (!this.toxicityServiceReady && !this.toxicityInitialized) {
                this.toxicityInitialized = true; // Prevent multiple initializations
                this.toxicityServiceReady = await this.initializeToxicityService();
            }

            let spamResult = null;
            let toxicityResult = null;

            // Run both detections in parallel for better performance
            const promises = [];

            // BERT spam detection
            promises.push(this.runBertSpamDetection(text));

            // Toxicity detection (if available)
            if (this.toxicityServiceReady) {
                promises.push(toxicityDetectionService.analyzeContent(text));
            }

            const results = await Promise.allSettled(promises);

            // Process BERT results
            if (results[0].status === 'fulfilled') {
                spamResult = results[0].value;
            } else {
                console.warn('BERT spam detection failed:', results[0].reason);
                spamResult = this.fallbackSpamDetection(text);
            }

            // Process toxicity results
            if (results[1] && results[1].status === 'fulfilled') {
                toxicityResult = results[1].value;
            }

            // Combine results
            const combinedResult = this.combineDetectionResults(spamResult, toxicityResult, text);
            
            console.log(`Enhanced Detection Result: ${combinedResult.label} (confidence: ${combinedResult.confidence.toFixed(2)}, toxic: ${combinedResult.is_toxic || false})`);
            return combinedResult;

        } catch (error) {
            console.error('Enhanced classification error:', error.message);
            
            // Fallback to basic keyword detection if everything fails
            return this.fallbackSpamDetection(text);
        }
    }

    /**
     * Run BERT spam detection (original method)
     */
    async runBertSpamDetection(text) {
        // Clean text before sending to model
        const cleanedText = this.preprocessText(text);

        // Call Hugging Face API
        const response = await axios.post(this.modelUrl, {
            inputs: cleanedText
        }, {
            headers: this.headers,
            timeout: 10000 // 10 seconds timeout
        });

        const predictions = response.data;
        
        // Process model output
        return this.processModelOutput(predictions, text);
    }

    /**
     * Combine BERT spam detection and toxicity detection results
     */
    combineDetectionResults(spamResult, toxicityResult, originalText) {
        // Default to spam result
        let combined = { ...spamResult };

        if (toxicityResult && !toxicityResult.error) {
            // Enhanced toxicity keywords for Vietnamese
            const toxicKeywords = [
                'fuck', 'shit', 'damn', 'bitch', 'asshole',
                'đồ chó', 'đĩ', 'mẹ kiếp', 'cút', 'đm',
                'vl', 'vcl', 'cc', 'đcm', 'cmm'
            ];

            const hasToxicKeywords = toxicKeywords.some(keyword => 
                originalText.toLowerCase().includes(keyword.toLowerCase())
            );

            // If content is toxic OR contains obvious toxic keywords, flag as spam
            if (toxicityResult.is_toxic || hasToxicKeywords || toxicityResult.should_flag) {
                combined.isSpam = true;
                combined.label = 'spam';
                combined.confidence = Math.max(combined.confidence, toxicityResult.combined_confidence || 0.8);
                combined.toxicity_detected = true;
                combined.toxic_type = toxicityResult.toxic_type || 'profanity';
                combined.modelUsed = 'bert + detoxify + keywords';
            }

            // Add toxicity details
            combined.toxicity = {
                is_toxic: toxicityResult.is_toxic,
                confidence: toxicityResult.confidence,
                toxic_type: toxicityResult.toxic_type,
                scores: {
                    toxicity: toxicityResult.toxicity,
                    severe_toxicity: toxicityResult.severe_toxicity,
                    obscene: toxicityResult.obscene,
                    threat: toxicityResult.threat,
                    insult: toxicityResult.insult,
                    identity_attack: toxicityResult.identity_attack
                }
            };
        } else {
            // Fallback: check for obvious toxic patterns if toxicity service failed
            const toxicPatterns = [
                /f+u+c+k+/i,
                /s+h+i+t+/i,
                /b+i+t+c+h+/i,
                /đồ\s*chó/i,
                /mẹ\s*kiếp/i,
                /c+ú+t+/i
            ];

            const hasToxicPattern = toxicPatterns.some(pattern => pattern.test(originalText));
            if (hasToxicPattern) {
                combined.isSpam = true;
                combined.label = 'spam';
                combined.confidence = Math.max(combined.confidence, 0.85);
                combined.toxicity_detected = true;
                combined.toxic_type = 'profanity_pattern';
                combined.modelUsed = combined.modelUsed + ' + pattern_detection';
            }
        }

        return combined;
    }

    /**
     * Xử lý output từ model
     * @param {Array} predictions - Array kết quả từ model
     * @param {string} originalText - Text gốc
     * @returns {Object} Processed result
     */
    processModelOutput(predictions, originalText) {
        if (!predictions || predictions.length === 0) {
            throw new Error('No predictions received from model');
        }

        // Tìm label với confidence cao nhất
        const topPrediction = predictions.reduce((prev, current) => 
            (prev.score > current.score) ? prev : current
        );

        const isSpam = topPrediction.label.toLowerCase() === 'spam';
        const confidence = topPrediction.score;

        return {
            isSpam,
            label: topPrediction.label,
            confidence,
            scores: predictions,
            originalText,
            processedAt: new Date(),
            modelUsed: 'bert-tiny-finetuned-sms-spam-detection'
        };
    }

    /**
     * Tiền xử lý text trước khi gửi đến model
     * @param {string} text - Raw text
     * @returns {string} Cleaned text
     */
    preprocessText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .slice(0, 512); // Truncate to max BERT length
    }

    /**
     * Enhanced fallback spam detection với toxic keywords
     * @param {string} text - Text to check
     * @returns {Object} Basic spam detection result
     */
    fallbackSpamDetection(text) {
        const spamKeywords = [
            'click here', 'free money', 'winner', 'congratulations',
            'urgent', 'limited time', 'act now', 'call now',
            'đây là link', 'miễn phí', 'quà tặng', 'khuyến mãi',
            'http://', 'https://', 'bit.ly', 'tinyurl'
        ];

        // Enhanced toxic keywords list
        const toxicKeywords = [
            'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
            'đồ chó', 'đĩ', 'mẹ kiếp', 'cút', 'đm', 'dmm',
            'vl', 'vcl', 'cc', 'đcm', 'cmm', 'clm',
            'đồ ngu', 'đồ khốn', 'chết tiệt', 'khốn nạn'
        ];

        const lowerText = text.toLowerCase();
        
        // Check spam patterns
        const spamScore = spamKeywords.reduce((score, keyword) => {
            return lowerText.includes(keyword) ? score + 1 : score;
        }, 0);

        // Check toxic patterns with higher weight
        const toxicScore = toxicKeywords.reduce((score, keyword) => {
            return lowerText.includes(keyword) ? score + 2 : score; // Higher weight for toxic content
        }, 0);

        // Enhanced pattern matching for variations
        const toxicPatterns = [
            /f+u+c+k+/i,           // fuuuuck, fuckkkk
            /s+h+i+t+/i,           // shiiiit, shitttt  
            /b+i+t+c+h+/i,         // biiiitch
            /a+s+s+h+o+l+e+/i,     // asssshole
            /đ+ồ+\s*c+h+ó+/i,      // đồồồ chóóó
            /m+ẹ+\s*k+i+ế+p+/i,    // mẹeee kiếppp
            /c+ú+t+/i,             // cúúút
            /đ+m+/i,               // đmmmm
            /v+l+/i,               // vllll
            /c+c+(?![a-z])/i       // cccc (not followed by letters)
        ];

        const patternScore = toxicPatterns.reduce((score, pattern) => {
            return pattern.test(text) ? score + 2 : score;
        }, 0);

        const totalScore = spamScore + toxicScore + patternScore;
        const isSpam = totalScore >= 2 || toxicScore >= 2; // Lower threshold if toxic content detected

        // Higher confidence for toxic content
        let confidence = Math.min(totalScore / 5, 0.9);
        if (toxicScore > 0 || patternScore > 0) {
            confidence = Math.max(confidence, 0.8); // Minimum 80% confidence for toxic content
        }

        const detectionType = toxicScore > 0 || patternScore > 0 ? 'toxic' : 'spam';

        return {
            isSpam,
            label: isSpam ? 'spam' : 'ham',
            confidence,
            scores: [
                { label: 'spam', score: isSpam ? confidence : 1 - confidence },
                { label: 'ham', score: isSpam ? 1 - confidence : confidence }
            ],
            originalText: text,
            processedAt: new Date(),
            modelUsed: 'enhanced-fallback-detection',
            toxicity_detected: toxicScore > 0 || patternScore > 0,
            toxic_type: detectionType,
            detection_details: {
                spam_score: spamScore,
                toxic_score: toxicScore,
                pattern_score: patternScore,
                total_score: totalScore
            },
            fallback: true
        };
    }

    /**
     * Batch classify multiple replies
     * @param {Array<string>} texts - Array of reply texts
     * @returns {Array<Object>} Array of classification results
     */
    async classifyBatch(texts) {
        const results = [];
        
        for (const text of texts) {
            try {
                const result = await this.classifyReply(text);
                results.push(result);
                
                // Add small delay to avoid rate limiting
                await this.delay(100);
            } catch (error) {
                console.error(`Error classifying text: ${text.slice(0, 50)}...`, error.message);
                results.push({
                    isSpam: false,
                    label: 'error',
                    confidence: 0,
                    originalText: text,
                    error: error.message,
                    processedAt: new Date()
                });
            }
        }
        
        return results;
    }

    /**
     * Get spam detection statistics
     * @param {Array<Object>} classifications - Array of classification results
     * @returns {Object} Statistics summary
     */
    getStatistics(classifications) {
        const total = classifications.length;
        const spam = classifications.filter(c => c.isSpam).length;
        const ham = total - spam;
        const avgConfidence = classifications.reduce((sum, c) => sum + c.confidence, 0) / total;

        return {
            total,
            spam,
            ham,
            spamPercentage: ((spam / total) * 100).toFixed(2),
            hamPercentage: ((ham / total) * 100).toFixed(2),
            averageConfidence: avgConfidence.toFixed(3)
        };
    }

    /**
     * Helper delay function
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new ReplySpamDetectionService();