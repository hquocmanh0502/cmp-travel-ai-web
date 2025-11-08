const ReplySpamDetectionService = require('../services/replySpamDetectionService');
const ReplyClassification = require('../models/ReplyClassification');

/**
 * Real-time spam filtering middleware
 * Filters replies before they are saved to prevent spam/toxic content
 */
class RealTimeSpamFilter {
  
  /**
   * Filter reply content in real-time
   * @param {string} content - Reply content to filter
   * @param {string} tourId - Associated tour ID
   * @param {string} commentId - Associated comment ID
   * @param {Object} options - Additional options
   * @returns {Object} - Filter result with action recommendation
   */
  static async filterReply(content, tourId, commentId, options = {}) {
    try {
      console.log(`🛡️ Real-time filtering reply: "${content.substring(0, 50)}..."`);
      
      // Run enhanced spam detection
      const detection = await ReplySpamDetectionService.classifyReply(content);
      
      console.log(`🔍 Detection result: ${detection.label} (${(detection.confidence * 100).toFixed(1)}%)`);
      
      // Determine action based on detection results
      let action = 'allow'; // Default action
      let reason = '';
      
      // Block high-confidence spam
      if (detection.isSpam && detection.confidence >= 0.8) {
        action = 'block';
        reason = `High confidence spam detected (${(detection.confidence * 100).toFixed(1)}%)`;
      }
      
      // Block toxic content
      if (detection.toxicity_detected) {
        action = 'block';
        reason = `Toxic content detected: ${detection.toxic_type}`;
      }
      
      // Flag for review (medium confidence)
      if (detection.isSpam && detection.confidence >= 0.5 && detection.confidence < 0.8) {
        action = 'flag';
        reason = `Medium confidence spam - flagged for review (${(detection.confidence * 100).toFixed(1)}%)`;
      }
      
      // Save classification result for tracking
      const classification = new ReplyClassification({
        replyId: null, // Will be set after reply is created
        tourId,
        commentId,
        content,
        classification: {
          isSpam: detection.isSpam,
          label: detection.label,
          confidence: detection.confidence,
          modelUsed: detection.modelUsed,
          processedAt: new Date(),
          toxicity_detected: detection.toxicity_detected,
          toxic_type: detection.toxic_type,
          toxicity: detection.toxicity,
          detection_details: detection.detection_details
        },
        status: action === 'block' ? 'blocked' : (action === 'flag' ? 'flagged' : 'approved'),
        realTimeFiltered: true
      });
      
      // Save for tracking (but don't wait for it)
      classification.save().catch(err => {
        console.error('Error saving real-time classification:', err);
      });
      
      return {
        action, // 'allow', 'flag', 'block'
        reason,
        detection,
        classification: classification._id
      };
      
    } catch (error) {
      console.error('Real-time spam filtering error:', error);
      
      // Fallback: allow with warning if detection fails
      return {
        action: 'allow',
        reason: 'Detection service unavailable - allowed with warning',
        detection: null,
        error: error.message
      };
    }
  }
  
  /**
   * Express middleware for real-time filtering
   */
  static middleware() {
    return async (req, res, next) => {
      // Only apply to reply creation/update endpoints
      if (req.method === 'POST' && req.path.includes('reply')) {
        try {
          const { content, tourId, commentId } = req.body;
          
          if (content) {
            const filterResult = await this.filterReply(content, tourId, commentId);
            
            // Attach filter result to request
            req.spamFilterResult = filterResult;
            
            // Block if necessary
            if (filterResult.action === 'block') {
              return res.status(403).json({
                success: false,
                message: 'Your reply has been blocked for containing inappropriate content.',
                reason: filterResult.reason,
                blocked: true
              });
            }
            
            // Add warning for flagged content
            if (filterResult.action === 'flag') {
              req.spamWarning = filterResult.reason;
            }
          }
        } catch (error) {
          console.error('Spam filtering middleware error:', error);
          // Continue processing if filtering fails
        }
      }
      
      next();
    };
  }
  
  /**
   * Update classification with actual reply ID after reply is created
   */
  static async updateClassificationWithReplyId(classificationId, replyId) {
    try {
      if (classificationId && replyId) {
        await ReplyClassification.findByIdAndUpdate(classificationId, {
          replyId: replyId
        });
        console.log(`✅ Updated classification ${classificationId} with reply ID ${replyId}`);
      }
    } catch (error) {
      console.error('Error updating classification with reply ID:', error);
    }
  }
  
  /**
   * Get real-time filtering statistics
   */
  static async getFilteringStats(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const stats = await ReplyClassification.aggregate([
        {
          $match: {
            realTimeFiltered: true,
            'classification.processedAt': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const result = {
        total: 0,
        allowed: 0,
        flagged: 0,
        blocked: 0
      };
      
      stats.forEach(stat => {
        result.total += stat.count;
        result[stat._id] = stat.count;
      });
      
      return result;
      
    } catch (error) {
      console.error('Error getting filtering stats:', error);
      return { total: 0, allowed: 0, flagged: 0, blocked: 0 };
    }
  }
}

module.exports = RealTimeSpamFilter;