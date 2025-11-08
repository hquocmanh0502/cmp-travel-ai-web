const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const ReplyClassification = require('../models/ReplyClassification');
const Tour = require('../models/Tour');
const RealTimeSpamFilter = require('../middleware/realTimeSpamFilter');

// Middleware để check admin (simplified for demo)
const requireAdmin = (req, res, next) => {
  // In production, implement proper admin authentication
  next();
};

// Get spam replies list
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, status = 'all' } = req.query;
    
    let query = {};
    if (status === 'spam') {
      query['classification.isSpam'] = true;
    } else if (status === 'clean') {
      query['classification.isSpam'] = false;
    }

    const spamClassifications = await ReplyClassification.find(query)
      .sort({ 'classification.processedAt': -1 })
      .limit(parseInt(limit));

    // Get comment info for each reply
    const repliesWithComments = await Promise.all(
      spamClassifications.map(async (classification) => {
        try {
          // Find comment containing the reply
          const comment = await Comment.findOne({ 
            'replies._id': classification.replyId 
          })
          .populate('tourId', 'name estimatedCost country location')
          .populate('userId', 'fullName email')
          .populate('replies.userId', 'fullName email');

          if (!comment) {
            console.log('No comment found for replyId:', classification.replyId);
            // Return basic data even if comment not found
            return {
              _id: classification._id,
              replyId: classification.replyId,
              commentId: null,
              content: classification.content || 'No content',
              classification: classification.classification,
              status: classification.status,
              replyAuthor: 'Unknown',
              reviewContent: 'Comment not found',
              reviewAuthor: 'Unknown',
              tourName: 'Unknown Tour',
              tourPrice: 0,
              tourLocation: 'Unknown',
              processedAt: classification.classification?.processedAt || classification.createdAt
            };
          }

          // Find the specific reply within the comment
          const reply = comment.replies.find(r => 
            r._id.toString() === classification.replyId.toString()
          );

          if (!reply) {
            console.log('No reply found in comment for replyId:', classification.replyId);
            // Return data with comment info but no reply details
            return {
              _id: classification._id,
              replyId: classification.replyId,
              commentId: comment._id,
              content: classification.content || 'No content',
              classification: classification.classification,
              status: classification.status,
              replyAuthor: 'Reply not found',
              reviewContent: comment.content ? 
                (typeof comment.content === 'string' ? 
                  comment.content.substring(0, 100) + '...' : 
                  comment.content.text ? comment.content.text.substring(0, 100) + '...' : 'No content'
                ) : 'No content',
              reviewRating: comment.content?.rating || 0,
              reviewAuthor: comment.userId?.fullName || comment.userId?.email || 'Anonymous',
              tourName: comment.tourId?.name || 'Unknown Tour',
              tourPrice: comment.tourId?.estimatedCost || comment.tourId?.pricing?.basePrice || 0,
              tourLocation: comment.tourId?.location || comment.tourId?.country || 'Unknown Location',
              processedAt: classification.classification?.processedAt || classification.createdAt
            };
          }

          return {
            _id: classification._id,
            replyId: classification.replyId,
            commentId: comment._id,
            content: classification.content || reply.text || 'No content',
            classification: classification.classification,
            status: classification.status,
            
            // Reply details
            replyAuthor: reply.userId?.fullName || reply.userId?.email || 'Anonymous',
            replyDate: reply.timestamp,
            
            // Review/Comment details
            reviewContent: comment.content ? 
              (typeof comment.content === 'string' ? 
                comment.content.substring(0, 100) + '...' : 
                comment.content.text ? comment.content.text.substring(0, 100) + '...' : 'No content'
              ) : 'No content',
            reviewRating: comment.content?.rating || 0,
            reviewAuthor: comment.userId?.fullName || comment.userId?.email || 'Anonymous',
            
            // Tour details
            tourId: comment.tourId?._id,
            tourName: comment.tourId?.name || 'Unknown Tour',
            tourPrice: comment.tourId?.estimatedCost || comment.tourId?.pricing?.basePrice || 0,
            tourLocation: comment.tourId?.location || comment.tourId?.country || 'Unknown Location',
            
            processedAt: classification.classification.processedAt
          };
        } catch (error) {
          console.error('Error processing classification:', classification._id, error);
          return {
            _id: classification._id,
            replyId: classification.replyId,
            commentId: null,
            content: classification.content,
            classification: classification.classification,
            status: classification.status,
            replyAuthor: 'Error',
            reviewContent: 'Error loading',
            reviewAuthor: 'Error',
            tourName: 'Error',
            processedAt: classification.classification.processedAt
          };
        }
      })
    );

    res.json({
      success: true,
      spamReplies: repliesWithComments
    });

  } catch (error) {
    console.error('Error fetching spam replies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching spam replies',
      error: error.message
    });
  }
});

// Get spam detection statistics
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    const totalClassifications = await ReplyClassification.countDocuments();
    const spamCount = await ReplyClassification.countDocuments({ 'classification.isSpam': true });
    const cleanCount = await ReplyClassification.countDocuments({ 'classification.isSpam': false });
    
    const bertCount = await ReplyClassification.countDocuments({ 
      'classification.modelUsed': { $regex: 'bert', $options: 'i' } 
    });
    const fallbackCount = await ReplyClassification.countDocuments({ 
      'classification.modelUsed': 'fallback-keyword-detection' 
    });

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSpam = await ReplyClassification.countDocuments({
      'classification.isSpam': true,
      'classification.processedAt': { $gte: yesterday }
    });

    const statistics = {
      total: totalClassifications,
      spam: spamCount,
      clean: cleanCount,
      bert: bertCount,
      fallback: fallbackCount,
      spamRate: totalClassifications > 0 ? (spamCount / totalClassifications) * 100 : 0,
      recentSpam,
      averageSpamConfidence: 0,
      averageCleanConfidence: 0
    };

    // Calculate average confidences
    const avgSpamConfidence = await ReplyClassification.aggregate([
      { $match: { 'classification.isSpam': true } },
      { $group: { _id: null, avg: { $avg: '$classification.confidence' } } }
    ]);

    const avgCleanConfidence = await ReplyClassification.aggregate([
      { $match: { 'classification.isSpam': false } },
      { $group: { _id: null, avg: { $avg: '$classification.confidence' } } }
    ]);

    if (avgSpamConfidence.length > 0) {
      statistics.averageSpamConfidence = avgSpamConfidence[0].avg;
    }

    if (avgCleanConfidence.length > 0) {
      statistics.averageCleanConfidence = avgCleanConfidence[0].avg;
    }

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Error fetching spam statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Trigger spam scan
router.post('/scan', requireAdmin, async (req, res) => {
  try {
    // Import the spam filtering functions
    const { filterSpamReplies } = require('../filter-spam-replies');
    
    // Run spam filtering in background
    filterSpamReplies()
      .then(result => {
        console.log('✅ Manual spam scan completed:', result);
      })
      .catch(error => {
        console.error('❌ Manual spam scan failed:', error);
      });

    res.json({
      success: true,
      message: 'Spam scan started successfully'
    });

  } catch (error) {
    console.error('Error starting spam scan:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting spam scan',
      error: error.message
    });
  }
});

// Remove spam reply
router.delete('/:replyId/remove', requireAdmin, async (req, res) => {
  try {
    const { replyId } = req.params;

    // Find the comment containing this reply
    const comment = await Comment.findOne({ 'replies._id': replyId });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      });
    }

    // Remove the reply from the comment
    comment.replies = comment.replies.filter(
      reply => reply._id.toString() !== replyId.toString()
    );

    await comment.save();

    // Also remove from ReplyClassification
    await ReplyClassification.deleteOne({ replyId });

    res.json({
      success: true,
      message: 'Spam reply removed successfully'
    });

  } catch (error) {
    console.error('Error removing spam reply:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing spam reply',
      error: error.message
    });
  }
});

// Get spam trends (for charts)
router.get('/trends', requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trends = await ReplyClassification.aggregate([
      {
        $match: {
          'classification.processedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$classification.processedAt" } },
            isSpam: "$classification.isSpam"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Format data for charts
    const chartData = {};
    trends.forEach(item => {
      const date = item._id.date;
      if (!chartData[date]) {
        chartData[date] = { date, spam: 0, clean: 0, total: 0 };
      }
      
      if (item._id.isSpam) {
        chartData[date].spam = item.count;
      } else {
        chartData[date].clean = item.count;
      }
      chartData[date].total += item.count;
    });

    const formattedData = Object.values(chartData);

    res.json({
      success: true,
      trends: formattedData
    });

  } catch (error) {
    console.error('Error fetching spam trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trends',
      error: error.message
    });
  }
});

// Bulk actions
router.post('/bulk-action', requireAdmin, async (req, res) => {
  try {
    const { action, replyIds } = req.body; // action: 'remove', 'approve', 'reject'

    if (!action || !replyIds || !Array.isArray(replyIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data'
      });
    }

    let result = { processed: 0, errors: 0 };

    for (const replyId of replyIds) {
      try {
        if (action === 'remove') {
          // Remove reply from comment
          const comment = await Comment.findOne({ 'replies._id': replyId });
          if (comment) {
            comment.replies = comment.replies.filter(
              reply => reply._id.toString() !== replyId.toString()
            );
            await comment.save();
            
            // Remove classification
            await ReplyClassification.deleteOne({ replyId });
            result.processed++;
          }
        } else if (action === 'approve' || action === 'reject') {
          // Update reply status
          const comment = await Comment.findOne({ 'replies._id': replyId });
          if (comment) {
            const reply = comment.replies.id(replyId);
            if (reply) {
              reply.moderation.status = action === 'approve' ? 'approved' : 'rejected';
              await comment.save();
              result.processed++;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing reply ${replyId}:`, error);
        result.errors++;
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      result
    });

  } catch (error) {
    console.error('Error in bulk action:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk action',
      error: error.message
    });
  }
});

// Test enhanced detection system
router.post('/test-detection', requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for testing'
      });
    }

    // Import spam detection service
    const replySpamDetectionService = require('../services/replySpamDetectionService');
    
    // Test the enhanced detection
    console.log(`\n🧪 Testing enhanced detection for: "${text}"`);
    const result = await replySpamDetectionService.classifyReply(text);

    res.json({
      success: true,
      message: 'Detection test completed',
      input: text,
      result: {
        isSpam: result.isSpam,
        label: result.label,
        confidence: result.confidence,
        modelUsed: result.modelUsed,
        toxicity_detected: result.toxicity_detected,
        toxic_type: result.toxic_type,
        toxicity: result.toxicity,
        detection_details: result.detection_details
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing detection:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing detection',
      error: error.message
    });
  }
});

// Get real-time filtering statistics
router.get('/real-time-stats', requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const stats = await RealTimeSpamFilter.getFilteringStats(parseInt(days));
    
    // Calculate percentages
    const blockRate = stats.total > 0 ? (stats.blocked / stats.total) * 100 : 0;
    const flagRate = stats.total > 0 ? (stats.flagged / stats.total) * 100 : 0;
    const allowRate = stats.total > 0 ? (stats.allowed / stats.total) * 100 : 0;
    
    res.json({
      success: true,
      stats: {
        ...stats,
        blockRate: parseFloat(blockRate.toFixed(2)),
        flagRate: parseFloat(flagRate.toFixed(2)),
        allowRate: parseFloat(allowRate.toFixed(2))
      },
      period: `${days} days`
    });
    
  } catch (error) {
    console.error('Error fetching real-time stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching real-time filtering statistics',
      error: error.message
    });
  }
});

module.exports = router;