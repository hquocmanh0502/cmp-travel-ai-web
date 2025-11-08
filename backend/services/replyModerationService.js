const ReplyClassification = require('../models/ReplyClassification');
const replySpamDetectionService = require('./replySpamDetectionService');

class ReplyModerationService {
    constructor() {
        this.autoModerationThresholds = {
            autoApprove: 0.95, // Ham confidence > 95% = auto approve
            autoReject: 0.90,   // Spam confidence > 90% = auto reject
            requireReview: 0.7  // Spam confidence > 70% = require admin review
        };
    }

    /**
     * Tự động phân loại và kiểm duyệt reply khi user submit
     * @param {Object} replyData - {replyId, userId, tourId, content, metadata}
     * @returns {Object} Classification result với action recommendations
     */
    async processNewReply(replyData) {
        try {
            const { replyId, userId, tourId, content, metadata = {} } = replyData;

            console.log(`Processing new reply from user ${userId} for tour ${tourId}`);

            // Step 1: AI Classification
            const classification = await replySpamDetectionService.classifyReply(content);
            
            // Step 2: Additional content analysis
            const contentAnalysis = this.analyzeContent(content);
            
            // Step 3: User behavior analysis
            const userRiskScore = await this.getUserRiskScore(userId);
            
            // Step 4: Create classification record
            const replyClassification = new ReplyClassification({
                replyId,
                userId,
                tourId,
                content,
                classification,
                metadata: {
                    ...metadata,
                    ...contentAnalysis,
                    userRiskScore
                }
            });

            // Step 5: Apply auto-moderation rules
            const moderationResult = this.applyAutoModeration(replyClassification);
            
            // Step 6: Add flags based on analysis
            await this.addAutomaticFlags(replyClassification, contentAnalysis, userRiskScore);
            
            // Step 7: Save to database
            await replyClassification.save();

            console.log(`Reply processed: ${moderationResult.action} (confidence: ${classification.confidence.toFixed(2)})`);

            return {
                success: true,
                classification: replyClassification,
                action: moderationResult.action,
                reason: moderationResult.reason,
                requiresReview: moderationResult.requiresReview,
                autoModerated: moderationResult.autoModerated
            };

        } catch (error) {
            console.error('Error processing reply:', error);
            
            // Fallback: create basic record with error status
            try {
                const fallbackClassification = new ReplyClassification({
                    replyId: replyData.replyId,
                    userId: replyData.userId,
                    tourId: replyData.tourId,
                    content: replyData.content,
                    classification: {
                        isSpam: false,
                        label: 'error',
                        confidence: 0,
                        modelUsed: 'fallback-error-handling',
                        processedAt: new Date()
                    },
                    moderation: {
                        status: 'pending' // Require manual review if processing fails
                    }
                });
                
                await fallbackClassification.save();
                
                return {
                    success: false,
                    error: error.message,
                    classification: fallbackClassification,
                    action: 'require_review',
                    reason: 'Processing error - manual review required'
                };
            } catch (saveError) {
                console.error('Failed to save fallback classification:', saveError);
                throw error;
            }
        }
    }

    /**
     * Phân tích nội dung reply để tìm patterns đáng ngờ
     * @param {string} content - Nội dung reply
     * @returns {Object} Content analysis results
     */
    analyzeContent(content) {
        const analysis = {
            replyLength: content.length,
            wordCount: content.split(/\s+/).length,
            hasLinks: /https?:\/\//.test(content),
            hasEmails: /\S+@\S+\.\S+/.test(content),
            hasPhones: /(\+\d{1,3}[- ]?)?\d{10,}/.test(content),
            hasCapitalWords: /[A-Z]{3,}/.test(content),
            hasSpecialChars: /[!@#$%^&*()]{3,}/.test(content),
            repetitiveContent: this.checkRepetitiveContent(content),
            suspiciousKeywords: this.checkSuspiciousKeywords(content)
        };

        // Calculate content risk score
        analysis.contentRiskScore = this.calculateContentRiskScore(analysis);

        return analysis;
    }

    /**
     * Kiểm tra nội dung lặp lại
     * @param {string} content 
     * @returns {boolean}
     */
    checkRepetitiveContent(content) {
        const words = content.toLowerCase().split(/\s+/);
        const wordCount = {};
        
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        // Check if any word repeats more than 30% of total words
        const maxRepeat = Math.max(...Object.values(wordCount));
        return maxRepeat > words.length * 0.3;
    }

    /**
     * Kiểm tra từ khóa đáng ngờ
     * @param {string} content 
     * @returns {Array} Array of suspicious keywords found
     */
    checkSuspiciousKeywords(content) {
        const suspiciousKeywords = [
            'click here', 'free money', 'urgent', 'limited time',
            'call now', 'act now', 'guaranteed', 'winner',
            'đây là link', 'miễn phí', 'quà tặng', 'khuyến mãi',
            'gọi ngay', 'cơ hội', 'giới hạn', 'chiến thắng'
        ];

        const lowerContent = content.toLowerCase();
        return suspiciousKeywords.filter(keyword => 
            lowerContent.includes(keyword)
        );
    }

    /**
     * Tính điểm rủi ro nội dung
     * @param {Object} analysis 
     * @returns {number} Risk score 0-100
     */
    calculateContentRiskScore(analysis) {
        let risk = 0;

        // Length-based risk
        if (analysis.replyLength < 10) risk += 20;
        if (analysis.replyLength > 1000) risk += 15;
        
        // Suspicious elements
        if (analysis.hasLinks) risk += 25;
        if (analysis.hasEmails) risk += 30;
        if (analysis.hasPhones) risk += 35;
        if (analysis.hasCapitalWords) risk += 15;
        if (analysis.hasSpecialChars) risk += 10;
        if (analysis.repetitiveContent) risk += 20;
        
        // Keyword-based risk
        risk += analysis.suspiciousKeywords.length * 10;

        return Math.min(risk, 100);
    }

    /**
     * Lấy điểm rủi ro của user dựa trên lịch sử
     * @param {string} userId 
     * @returns {number} User risk score 0-100
     */
    async getUserRiskScore(userId) {
        try {
            // Get user's previous replies in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const userReplies = await ReplyClassification.find({
                userId,
                createdAt: { $gte: thirtyDaysAgo }
            }).limit(50);

            if (userReplies.length === 0) {
                return 20; // New user default risk
            }

            // Calculate metrics
            const spamCount = userReplies.filter(r => r.classification.isSpam).length;
            const rejectedCount = userReplies.filter(r => r.moderation.status === 'rejected').length;
            const avgConfidence = userReplies.reduce((sum, r) => sum + r.classification.confidence, 0) / userReplies.length;
            
            // Calculate risk score
            let risk = 0;
            risk += (spamCount / userReplies.length) * 50; // Spam ratio
            risk += (rejectedCount / userReplies.length) * 30; // Rejection ratio
            risk += (1 - avgConfidence) * 20; // Low confidence penalty

            return Math.min(risk, 100);

        } catch (error) {
            console.error('Error calculating user risk score:', error);
            return 50; // Default medium risk if calculation fails
        }
    }

    /**
     * Áp dụng quy tắc auto-moderation
     * @param {Object} replyClassification 
     * @returns {Object} Moderation decision
     */
    applyAutoModeration(replyClassification) {
        const { classification, metadata } = replyClassification;
        const { confidence, isSpam } = classification;
        const { contentRiskScore, userRiskScore } = metadata;

        // Calculate combined risk score
        const combinedRisk = (
            (isSpam ? confidence : 0) * 0.5 +
            (contentRiskScore / 100) * 0.3 +
            (userRiskScore / 100) * 0.2
        );

        // Auto-reject if very high spam confidence and risk
        if (isSpam && confidence > this.autoModerationThresholds.autoReject && combinedRisk > 0.8) {
            replyClassification.moderation.status = 'rejected';
            replyClassification.moderation.autoModerated = true;
            replyClassification.priority = 'low';
            
            return {
                action: 'auto_reject',
                reason: `High spam confidence (${(confidence * 100).toFixed(1)}%) with high risk score`,
                requiresReview: false,
                autoModerated: true
            };
        }

        // Auto-approve if very high ham confidence and low risk
        if (!isSpam && confidence > this.autoModerationThresholds.autoApprove && combinedRisk < 0.2) {
            replyClassification.moderation.status = 'auto-approved';
            replyClassification.moderation.autoModerated = true;
            replyClassification.priority = 'low';
            
            return {
                action: 'auto_approve',
                reason: `High ham confidence (${(confidence * 100).toFixed(1)}%) with low risk score`,
                requiresReview: false,
                autoModerated: true
            };
        }

        // Require review for uncertain or risky content
        if (isSpam && confidence > this.autoModerationThresholds.requireReview) {
            replyClassification.moderation.status = 'pending';
            replyClassification.priority = combinedRisk > 0.6 ? 'high' : 'medium';
            
            return {
                action: 'require_review',
                reason: `Spam detected with ${(confidence * 100).toFixed(1)}% confidence - requires manual review`,
                requiresReview: true,
                autoModerated: false
            };
        }

        // Default: pending review
        replyClassification.moderation.status = 'pending';
        replyClassification.priority = 'medium';
        
        return {
            action: 'pending_review',
            reason: 'Standard review required',
            requiresReview: true,
            autoModerated: false
        };
    }

    /**
     * Thêm flags tự động dựa trên analysis
     * @param {Object} replyClassification 
     * @param {Object} contentAnalysis 
     * @param {number} userRiskScore 
     */
    async addAutomaticFlags(replyClassification, contentAnalysis, userRiskScore) {
        // Flag spam
        if (replyClassification.classification.isSpam) {
            replyClassification.flags.push({
                type: 'spam',
                confidence: replyClassification.classification.confidence,
                flaggedBy: 'ai',
                flaggedAt: new Date()
            });
        }

        // Flag promotional content
        if (contentAnalysis.hasLinks || contentAnalysis.suspiciousKeywords.length > 0) {
            replyClassification.flags.push({
                type: 'promotional',
                confidence: Math.min(contentAnalysis.contentRiskScore / 100, 1),
                flaggedBy: 'ai',
                flaggedAt: new Date()
            });
        }

        // Flag fake/suspicious based on user risk
        if (userRiskScore > 70) {
            replyClassification.flags.push({
                type: 'fake',
                confidence: userRiskScore / 100,
                flaggedBy: 'ai',
                flaggedAt: new Date()
            });
        }

        // Flag inappropriate based on content patterns
        if (contentAnalysis.hasCapitalWords || contentAnalysis.hasSpecialChars) {
            replyClassification.flags.push({
                type: 'inappropriate',
                confidence: 0.6,
                flaggedBy: 'ai',
                flaggedAt: new Date()
            });
        }
    }

    /**
     * Batch process existing replies for classification
     * @param {number} limit - Number of replies to process
     * @returns {Object} Processing results
     */
    async batchProcessExistingReplies(limit = 100) {
        try {
            // Find unprocessed replies (assuming we have a Comment model)
            const Comment = require('../models/Comment');
            const unprocessedReplies = await Comment.find({
                // Add criteria for replies that haven't been processed
                processed: { $ne: true }
            }).limit(limit);

            const results = {
                processed: 0,
                failed: 0,
                errors: []
            };

            for (const reply of unprocessedReplies) {
                try {
                    await this.processNewReply({
                        replyId: reply._id,
                        userId: reply.userId,
                        tourId: reply.tourId,
                        content: reply.content,
                        metadata: {
                            ipAddress: reply.ipAddress,
                            userAgent: reply.userAgent
                        }
                    });

                    // Mark as processed
                    reply.processed = true;
                    await reply.save();

                    results.processed++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Reply ${reply._id}: ${error.message}`);
                }
            }

            return results;

        } catch (error) {
            console.error('Error in batch processing:', error);
            throw error;
        }
    }
}

module.exports = new ReplyModerationService();