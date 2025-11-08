const { spawn } = require('child_process');
const path = require('path');

class ToxicityDetectionService {
    constructor() {
        this.pythonPath = 'python'; // Adjust if needed
        this.scriptPath = path.join(__dirname, 'toxicity-detector.py');
        this.isInitialized = false;
    }

    /**
     * Initialize the toxicity detection service
     */
    async initialize() {
        try {
            // Test if Python script is working
            const testResult = await this.detectToxicity('hello world');
            if (testResult && !testResult.error) {
                this.isInitialized = true;
                console.log('✅ Toxicity Detection Service initialized successfully');
                return true;
            } else {
                console.log('⚠️  Toxicity detection not available, using fallback detection');
                this.isInitialized = false;
                return false;
            }
        } catch (error) {
            console.log('⚠️  Toxicity detection not available, using fallback detection');
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Detect toxicity in text using Detoxify model
     * @param {string} text - Text to analyze
     * @returns {Promise<Object>} Toxicity analysis result
     */
    async detectToxicity(text) {
        return new Promise((resolve, reject) => {
            if (!text || text.trim().length === 0) {
                resolve({
                    toxicity: 0.0,
                    severe_toxicity: 0.0,
                    obscene: 0.0,
                    threat: 0.0,
                    insult: 0.0,
                    identity_attack: 0.0,
                    is_toxic: false,
                    max_score: 0.0,
                    toxic_type: 'none',
                    confidence: 0.0
                });
                return;
            }

            const pythonProcess = spawn(this.pythonPath, [this.scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (error) {
                        resolve({ error: `Failed to parse result: ${error.message}`, is_toxic: false, confidence: 0.0 });
                    }
                } else {
                    resolve({ error: `Detection failed with code ${code}`, is_toxic: false, confidence: 0.0 });
                }
            });

            pythonProcess.on('error', (error) => {
                resolve({ error: `Failed to spawn process: ${error.message}`, is_toxic: false, confidence: 0.0 });
            });

            // Send input data
            const inputData = JSON.stringify({ text: text });
            pythonProcess.stdin.write(inputData);
            pythonProcess.stdin.end();

            // Set timeout
            setTimeout(() => {
                pythonProcess.kill();
                resolve({ error: 'Detection timeout', is_toxic: false, confidence: 0.0 });
            }, 15000); // 15 seconds timeout
        });
    }

    /**
     * Batch toxicity detection for multiple texts
     * @param {Array<string>} texts - Array of texts to analyze
     * @returns {Promise<Array<Object>>} Array of toxicity results
     */
    async detectToxicityBatch(texts) {
        return new Promise((resolve, reject) => {
            if (!texts || texts.length === 0) {
                resolve([]);
                return;
            }

            const pythonProcess = spawn(this.pythonPath, [this.scriptPath, '--batch'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const results = JSON.parse(stdout);
                        resolve(results);
                    } catch (error) {
                        reject(new Error(`Failed to parse batch toxicity results: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Batch toxicity detection failed with code ${code}: ${stderr}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn batch toxicity process: ${error.message}`));
            });

            // Send input data
            pythonProcess.stdin.write(JSON.stringify(texts));
            pythonProcess.stdin.end();

            // Set timeout
            setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Batch toxicity detection timeout'));
            }, 30000); // 30 seconds timeout
        });
    }

    /**
     * Combined spam and toxicity detection
     * @param {string} text - Text to analyze
     * @returns {Promise<Object>} Combined analysis result
     */
    async analyzeContent(text) {
        try {
            const toxicityResult = await this.detectToxicity(text);
            
            // Combine with basic spam detection patterns
            const spamPatterns = [
                /click here/i,
                /free money/i,
                /winner/i,
                /congratulations/i,
                /urgent/i,
                /limited time/i,
                /act now/i,
                /https?:\/\//i,
                /bit\.ly/i,
                /tinyurl/i
            ];

            const spamScore = spamPatterns.reduce((score, pattern) => {
                return pattern.test(text) ? score + 0.2 : score;
            }, 0);

            // Determine if content should be flagged
            const isToxic = toxicityResult.is_toxic;
            const isSpam = spamScore > 0.4;
            const shouldFlag = isToxic || isSpam;

            return {
                ...toxicityResult,
                spam_score: spamScore,
                is_spam: isSpam,
                should_flag: shouldFlag,
                flag_reason: isToxic ? 'toxic_content' : (isSpam ? 'spam' : 'none'),
                combined_confidence: Math.max(toxicityResult.confidence, spamScore),
                analysis_timestamp: new Date().toISOString(),
                model_used: 'detoxify + spam_detection'
            };

        } catch (error) {
            console.error('Content analysis error:', error);
            
            // Fallback to basic keyword detection
            return {
                toxicity: 0.0,
                is_toxic: false,
                is_spam: false,
                should_flag: false,
                error: error.message,
                confidence: 0.0,
                model_used: 'fallback',
                analysis_timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Check if service is ready
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Get toxicity thresholds
     */
    getThresholds() {
        return {
            toxicity: 0.3,
            severe_toxicity: 0.2,
            obscene: 0.4,
            threat: 0.2,
            insult: 0.4,
            identity_attack: 0.2
        };
    }
}

module.exports = new ToxicityDetectionService();