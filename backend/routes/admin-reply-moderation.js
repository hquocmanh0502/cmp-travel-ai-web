const express = require('express');
const router = express.Router();
const ReplyClassification = require('../models/ReplyClassification');
const replySpamDetectionService = require('../services/replySpamDetectionService');
const replyProcessingMiddleware = require('../middleware/replyProcessingMiddleware');
const User = require('../models/User');

// Middleware to check admin permissions (temporarily disabled for testing)
const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] || req.query.adminId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Admin ID required'
            });
        }

        // Temporarily bypass admin role check for testing
        // const user = await User.findById(userId);
        // if (!user || user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'Admin access required'
        //     });
        // }

        req.adminId = userId;
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Authentication error',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/replies - Get all replies with filtering
 * Query params: status, isSpam, priority, page, limit, search
 */
router.get('/replies', requireAdmin, async (req, res) => {
    try {
        const {
            status = 'all',
            isSpam = 'all',
            priority = 'all',
            page = 1,
            limit = 20,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter query
        const filter = {};
        
        if (status !== 'all') {
            filter['moderation.status'] = status;
        }
        
        if (isSpam !== 'all') {
            filter['classification.isSpam'] = isSpam === 'true';
        }
        
        if (priority !== 'all') {
            filter.priority = priority;
        }

        if (search) {
            filter.content = { $regex: search, $options: 'i' };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Sort configuration
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const replies = await ReplyClassification.find(filter)
            .populate('userId', 'name email avatar')
            .populate('tourId', 'name country img')
            .populate('replyId')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ReplyClassification.countDocuments(filter);
        
        // Get statistics
        const stats = await ReplyClassification.getSpamStatistics();

        res.json({
            success: true,
            replies,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                count: total,
                limit: parseInt(limit)
            },
            statistics: stats
        });

    } catch (error) {
        console.error('Error fetching replies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch replies',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/replies/pending - Get pending reviews
 */
router.get('/replies/pending', requireAdmin, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const pendingReplies = await ReplyClassification.getPendingReviews(parseInt(limit));
        
        res.json({
            success: true,
            replies: pendingReplies,
            count: pendingReplies.length
        });

    } catch (error) {
        console.error('Error fetching pending replies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending replies',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/replies/statistics - Get detailed statistics
 */
router.get('/replies/statistics', requireAdmin, async (req, res) => {
    try {
        const { dateRange } = req.query;
        let range = {};
        
        if (dateRange) {
            const [start, end] = dateRange.split(',');
            range = { start: new Date(start), end: new Date(end) };
        }

        const stats = await ReplyClassification.getSpamStatistics(range);
        
        // Additional analytics
        const priorityStats = await ReplyClassification.aggregate([
            { $group: {
                _id: '$priority',
                count: { $sum: 1 }
            }}
        ]);

        const flagStats = await ReplyClassification.aggregate([
            { $unwind: '$flags' },
            { $group: {
                _id: '$flags.type',
                count: { $sum: 1 }
            }}
        ]);

        res.json({
            success: true,
            statistics: {
                general: stats,
                byPriority: priorityStats,
                byFlags: flagStats
            }
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/replies/:id/approve - Approve a reply
 */
router.put('/replies/:id/approve', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes = '' } = req.body;

        const reply = await ReplyClassification.findById(id);
        if (!reply) {
            return res.status(404).json({
                success: false,
                message: 'Reply not found'
            });
        }

        await reply.approve(req.adminId, notes);

        res.json({
            success: true,
            message: 'Reply approved successfully',
            reply
        });

    } catch (error) {
        console.error('Error approving reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve reply',
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/replies/:id/reject - Reject a reply
 */
router.put('/replies/:id/reject', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes = '' } = req.body;

        const reply = await ReplyClassification.findById(id);
        if (!reply) {
            return res.status(404).json({
                success: false,
                message: 'Reply not found'
            });
        }

        await reply.reject(req.adminId, notes);

        res.json({
            success: true,
            message: 'Reply rejected successfully',
            reply
        });

    } catch (error) {
        console.error('Error rejecting reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject reply',
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/replies/:id/flag - Add flag to reply
 */
router.put('/replies/:id/flag', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, confidence = 1 } = req.body;

        const reply = await ReplyClassification.findById(id);
        if (!reply) {
            return res.status(404).json({
                success: false,
                message: 'Reply not found'
            });
        }

        await reply.addFlag(type, confidence, 'admin');

        res.json({
            success: true,
            message: 'Flag added successfully',
            reply
        });

    } catch (error) {
        console.error('Error adding flag:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add flag',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/replies/bulk-action - Bulk actions on replies
 */
router.post('/replies/bulk-action', requireAdmin, async (req, res) => {
    try {
        const { action, replyIds, notes = '' } = req.body;

        if (!action || !replyIds || !Array.isArray(replyIds)) {
            return res.status(400).json({
                success: false,
                message: 'Action and reply IDs are required'
            });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const replyId of replyIds) {
            try {
                const reply = await ReplyClassification.findById(replyId);
                if (!reply) {
                    results.failed++;
                    results.errors.push(`Reply ${replyId} not found`);
                    continue;
                }

                switch (action) {
                    case 'approve':
                        await reply.approve(req.adminId, notes);
                        break;
                    case 'reject':
                        await reply.reject(req.adminId, notes);
                        break;
                    default:
                        throw new Error(`Unknown action: ${action}`);
                }

                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Error processing ${replyId}: ${error.message}`);
            }
        }

        res.json({
            success: true,
            message: `Bulk action completed: ${results.success} successful, ${results.failed} failed`,
            results
        });

    } catch (error) {
        console.error('Error in bulk action:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk action failed',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/replies/classify - Manually classify a reply
 */
router.post('/replies/classify', requireAdmin, async (req, res) => {
    try {
        const { content, replyId, userId, tourId } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required'
            });
        }

        // Classify using AI
        const classification = await replySpamDetectionService.classifyReply(content);

        // Create or update classification record
        let replyClassification;
        if (replyId) {
            replyClassification = await ReplyClassification.findOneAndUpdate(
                { replyId },
                {
                    content,
                    classification,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } else {
            // Manual classification without existing reply
            replyClassification = new ReplyClassification({
                content,
                userId,
                tourId,
                classification
            });
            await replyClassification.save();
        }

        res.json({
            success: true,
            classification,
            replyClassification
        });

    } catch (error) {
        console.error('Error classifying reply:', error);
        res.status(500).json({
            success: false,
            message: 'Classification failed',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/replies/:id - Get single reply details
 */
router.get('/replies/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const reply = await ReplyClassification.findById(id)
            .populate('userId', 'name email avatar')
            .populate('tourId', 'name country img')
            .populate('replyId')
            .populate('moderation.reviewedBy', 'name email');

        if (!reply) {
            return res.status(404).json({
                success: false,
                message: 'Reply not found'
            });
        }

        res.json({
            success: true,
            reply
        });

    } catch (error) {
        console.error('Error fetching reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reply',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/replies/processing/stats - Get background processing statistics
 */
router.get('/replies/processing/stats', requireAdmin, async (req, res) => {
    try {
        const stats = await replyProcessingMiddleware.getProcessingStats();
        
        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error fetching processing stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch processing stats',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/replies/processing/trigger - Manually trigger background processing
 */
router.post('/replies/processing/trigger', requireAdmin, async (req, res) => {
    try {
        // Trigger background processing manually
        replyProcessingMiddleware.processUnclassifiedReplies();
        
        res.json({
            success: true,
            message: 'Background processing triggered successfully'
        });

    } catch (error) {
        console.error('Error triggering processing:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger processing',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/replies/:commentId/:replyId/process - Process specific reply
 */
router.post('/replies/:commentId/:replyId/process', requireAdmin, async (req, res) => {
    try {
        const { commentId, replyId } = req.params;
        
        const moderation = await replyProcessingMiddleware.processReplyById(commentId, replyId);
        
        res.json({
            success: true,
            message: 'Reply processed successfully',
            moderation
        });

    } catch (error) {
        console.error('Error processing specific reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process reply',
            error: error.message
        });
    }
});

module.exports = router;