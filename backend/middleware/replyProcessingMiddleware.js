const Comment = require('../models/Comment');
const replyModerationService = require('../services/replyModerationService');

/**
 * Middleware để process existing replies chưa được classify
 */
class ReplyProcessingMiddleware {
    constructor() {
        this.processingQueue = new Set();
        this.batchSize = 10;
        this.processInterval = 30000; // 30 seconds
    }

    /**
     * Khởi tạo background processing
     */
    startBackgroundProcessing() {
        console.log('🚀 Starting reply background processing...');
        
        // Process immediately on startup
        this.processUnclassifiedReplies();
        
        // Then process periodically
        setInterval(() => {
            this.processUnclassifiedReplies();
        }, this.processInterval);
    }

    /**
     * Process replies chưa được classify
     */
    async processUnclassifiedReplies() {
        try {
            console.log('🔍 Checking for unclassified replies...');

            // Find comments với replies chưa được process
            const comments = await Comment.find({
                'replies.moderation.processed': { $ne: true }
            })
            .limit(this.batchSize)
            .populate('replies.userId', 'name email');

            if (comments.length === 0) {
                console.log('✅ No unclassified replies found');
                return;
            }

            console.log(`📋 Found ${comments.length} comments with unclassified replies`);

            let processedCount = 0;
            let errorCount = 0;

            for (const comment of comments) {
                for (let i = 0; i < comment.replies.length; i++) {
                    const reply = comment.replies[i];
                    
                    // Skip if already processed or currently processing
                    if (reply.moderation?.processed || this.processingQueue.has(reply._id.toString())) {
                        continue;
                    }

                    try {
                        // Add to processing queue
                        this.processingQueue.add(reply._id.toString());

                        console.log(`🤖 Processing reply ${reply._id} from user ${reply.userId || comment.userId || 'Unknown'}`);

                        // Process với AI moderation - use comment's tourId and userId if reply doesn't have them
                        const moderationResult = await replyModerationService.processNewReply({
                            replyId: reply._id,
                            userId: reply.userId || comment.userId, // Use comment's userId if reply doesn't have one
                            tourId: comment.tourId,
                            content: reply.text,
                            metadata: {
                                isBackgroundProcessing: true,
                                originalTimestamp: reply.timestamp
                            }
                        });

                        // Update reply moderation status
                        comment.replies[i].moderation = {
                            processed: true,
                            classificationId: moderationResult.classification?._id,
                            status: this.getStatusFromAction(moderationResult.action),
                            isSpam: moderationResult.classification?.classification?.isSpam || false,
                            confidence: moderationResult.classification?.classification?.confidence || 0,
                            requiresReview: moderationResult.requiresReview || false
                        };

                        processedCount++;
                        console.log(`✅ Processed reply ${reply._id}: ${moderationResult.action}`);

                    } catch (error) {
                        console.error(`❌ Error processing reply ${reply._id}:`, error.message);
                        
                        // Mark as processed but with error status
                        comment.replies[i].moderation = {
                            processed: true,
                            status: 'pending',
                            requiresReview: true,
                            error: error.message
                        };
                        
                        errorCount++;
                    } finally {
                        // Remove from processing queue
                        this.processingQueue.delete(reply._id.toString());
                    }
                }

                // Save comment với updated moderation data
                try {
                    await comment.save();
                } catch (saveError) {
                    console.error(`❌ Error saving comment ${comment._id}:`, saveError.message);
                }

                // Add small delay to avoid overwhelming the API
                await this.delay(500);
            }

            console.log(`📊 Background processing completed: ${processedCount} processed, ${errorCount} errors`);

        } catch (error) {
            console.error('❌ Error in background reply processing:', error);
        }
    }

    /**
     * Convert moderation action to status
     */
    getStatusFromAction(action) {
        switch (action) {
            case 'auto_approve': return 'auto-approved';
            case 'auto_reject': return 'auto-rejected';
            case 'require_review': return 'pending';
            case 'pending_review': return 'pending';
            default: return 'pending';
        }
    }

    /**
     * Process specific reply by ID
     */
    async processReplyById(commentId, replyId) {
        try {
            const comment = await Comment.findById(commentId);
            if (!comment) {
                throw new Error('Comment not found');
            }

            const reply = comment.replies.id(replyId);
            if (!reply) {
                throw new Error('Reply not found');
            }

            if (reply.moderation?.processed) {
                console.log(`Reply ${replyId} already processed`);
                return reply.moderation;
            }

            console.log(`🎯 Processing specific reply ${replyId}`);

            const moderationResult = await replyModerationService.processNewReply({
                replyId: reply._id,
                userId: reply.userId,
                tourId: comment.tourId,
                content: reply.text,
                metadata: {
                    isManualProcessing: true
                }
            });

            // Update moderation status
            reply.moderation = {
                processed: true,
                classificationId: moderationResult.classification?._id,
                status: this.getStatusFromAction(moderationResult.action),
                isSpam: moderationResult.classification?.classification?.isSpam || false,
                confidence: moderationResult.classification?.classification?.confidence || 0,
                requiresReview: moderationResult.requiresReview || false
            };

            await comment.save();

            console.log(`✅ Manually processed reply ${replyId}: ${moderationResult.action}`);
            return reply.moderation;

        } catch (error) {
            console.error(`❌ Error processing reply ${replyId}:`, error);
            throw error;
        }
    }

    /**
     * Get processing statistics
     */
    async getProcessingStats() {
        try {
            const totalReplies = await Comment.aggregate([
                { $unwind: '$replies' },
                { $count: 'total' }
            ]);

            const processedReplies = await Comment.aggregate([
                { $unwind: '$replies' },
                { $match: { 'replies.moderation.processed': true } },
                { $count: 'processed' }
            ]);

            const spamReplies = await Comment.aggregate([
                { $unwind: '$replies' },
                { $match: { 'replies.moderation.isSpam': true } },
                { $count: 'spam' }
            ]);

            const pendingReplies = await Comment.aggregate([
                { $unwind: '$replies' },
                { $match: { 'replies.moderation.requiresReview': true } },
                { $count: 'pending' }
            ]);

            return {
                total: totalReplies[0]?.total || 0,
                processed: processedReplies[0]?.processed || 0,
                spam: spamReplies[0]?.spam || 0,
                pending: pendingReplies[0]?.pending || 0,
                processing: this.processingQueue.size
            };
        } catch (error) {
            console.error('Error getting processing stats:', error);
            return { total: 0, processed: 0, spam: 0, pending: 0, processing: 0 };
        }
    }

    /**
     * Helper delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stop background processing
     */
    stopBackgroundProcessing() {
        console.log('🛑 Stopping reply background processing...');
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}

// Export singleton instance
const replyProcessingMiddleware = new ReplyProcessingMiddleware();

module.exports = replyProcessingMiddleware;