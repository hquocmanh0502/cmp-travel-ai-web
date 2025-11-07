const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const UserBan = require('../models/UserBan');
const replyModerationService = require('../services/replyModerationService');
const RealTimeSpamFilter = require('../middleware/realTimeSpamFilter');
const UserBanService = require('../services/userBanService');

// Middleware kiểm tra authentication
const authenticate = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.userId = userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication' });
  }
};

// Middleware kiểm tra ban status
const checkBanStatus = async (req, res, next) => {
  try {
    const userId = req.userId;
    const banInfo = await UserBanService.isUserBanned(userId, 'reply_ban');
    
    if (banInfo) {
      return res.status(403).json({
        error: 'You are banned from posting replies',
        banned: true,
        banInfo: {
          reason: banInfo.reason,
          severity: banInfo.severity,
          remainingTime: banInfo.getRemainingTime(),
          endDate: banInfo.endDate,
          appealStatus: banInfo.appealStatus
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking ban status:', error);
    res.status(500).json({ error: 'Error checking ban status' });
  }
};

// GET - Lấy reviews của tour với sorting và filtering
router.get('/', async (req, res) => {
  try {
    const { tourId, sort = 'newest', rating, verified } = req.query;
    
    if (!tourId) {
      return res.status(400).json({ error: 'Tour ID is required' });
    }

    // Convert tourId string to ObjectId if valid
    let tourObjectId;
    try {
      if (mongoose.Types.ObjectId.isValid(tourId)) {
        tourObjectId = new mongoose.Types.ObjectId(tourId);
      } else {
        return res.status(400).json({ error: 'Invalid Tour ID format' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid Tour ID' });
    }

    // Build query with ObjectId
    let query = { tourId: tourObjectId };
    
    if (rating) {
      query['content.rating'] = parseInt(rating);
    }
    
    if (verified === 'true') {
      query['verified.isVerified'] = true;
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { 'content.rating': -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOption = { 'content.rating': 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { 'reactions.helpful': -1, createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const comments = await Comment.find(query)
      .populate('userId', 'fullName avatar')
      .populate('replies.userId', 'fullName avatar')
      .sort(sortOption)
      .lean();

    // Calculate helpful count and transform admin replies for each comment
    const commentsWithCounts = comments.map(comment => {
      const transformedComment = {
        ...comment,
        helpfulCount: comment.reactions?.helpful?.length || 0,
        replyCount: comment.replies?.length || 0,
        replies: (comment.replies || []).map(reply => {
          return {
            ...reply,
            userName: reply.isAdmin ? 'CMP Travel' : (reply.userId?.fullName || 'Anonymous')
          };
        })
      };
      return transformedComment;
    });

    res.json(commentsWithCounts);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Error fetching comments' });
  }
});

// POST - Tạo review mới (chỉ người đã đi tour)
router.post('/', authenticate, async (req, res) => {
  try {
    const { tourId, content } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!tourId || !content?.text || !content?.rating) {
      return res.status(400).json({ 
        error: 'Tour ID, review text, and rating are required' 
      });
    }

    // Kiểm tra xem user đã complete tour này chưa
    const booking = await Booking.findOne({
      userId: userId,
      tourId: tourId,
      status: 'completed' // Chỉ completed mới được review
    });

    if (!booking) {
      return res.status(403).json({ 
        error: 'You need to complete this tour before writing a review' 
      });
    }

    // Kiểm tra xem đã review chưa
    if (booking.hasReviewed) {
      return res.status(400).json({ 
        error: 'You have already reviewed this tour' 
      });
    }

    // Tạo review mới
    const newComment = new Comment({
      tourId,
      userId,
      content: {
        text: content.text,
        rating: content.rating,
        images: content.images || [],
        detailedRating: content.detailedRating || {}
      },
      verified: {
        isVerified: true,
        bookingId: booking._id.toString(),
        verifiedAt: new Date()
      },
      tripDetails: {
        travelDate: booking.bookingDate,
        groupSize: booking.numberOfPeople
      }
    });

    await newComment.save();

    // Update booking: mark as reviewed and save reviewId
    booking.hasReviewed = true;
    booking.reviewId = newComment._id;
    await booking.save();

    // Populate user info
    await newComment.populate('userId', 'fullName avatar');

    res.status(201).json({
      message: 'Review submitted successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Error creating review' });
  }
});

// POST - Reply to review (tất cả user đăng nhập) with real-time spam filtering
router.post('/:commentId/reply', authenticate, checkBanStatus, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, userConfirmedSpam, flagForReview } = req.body;
    const userId = req.userId;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    console.log(`📝 Processing reply from user ${userId}:`, {
      userConfirmedSpam,
      flagForReview,
      textPreview: text.substring(0, 50) + '...'
    });

    // 🛡️ REAL-TIME SPAM FILTERING (skip if user already confirmed)
    let filterResult = null;
    if (!userConfirmedSpam) {
      console.log(`🛡️ Filtering reply from user ${userId}: "${text.substring(0, 50)}..."`);
      
      filterResult = await RealTimeSpamFilter.filterReply(
        text.trim(), 
        comment.tourId, 
        commentId,
        { userId, userAgent: req.headers['user-agent'], ip: req.ip }
      );
      
      // Block if spam/toxic detected and user hasn't confirmed
      if (filterResult.action === 'block') {
        console.log(`❌ Reply blocked: ${filterResult.reason}`);
        return res.status(403).json({
          success: false,
          message: 'Your reply has been blocked for containing inappropriate content.',
          reason: filterResult.reason,
          blocked: true,
          detection: {
            isSpam: filterResult.detection?.isSpam,
            confidence: filterResult.detection?.confidence,
            toxicType: filterResult.detection?.toxic_type
          }
        });
      }
    }

    // Create reply 
    const newReply = {
      userId: userId,
      text: text.trim(),
      timestamp: new Date(),
      // Add moderation status based on filtering or user confirmation
      moderation: {
        status: (userConfirmedSpam || flagForReview || filterResult?.action === 'flag') ? 'pending' : 'approved',
        automated: !userConfirmedSpam,
        userConfirmedSpam: userConfirmedSpam || false,
        confidence: filterResult?.detection?.confidence || 0,
        modelUsed: filterResult?.detection?.modelUsed || 'real-time-filter',
        processedAt: new Date(),
        flagReason: userConfirmedSpam ? 'User confirmed spam content' : 
                   (filterResult?.action === 'flag' ? filterResult.reason : null),
        adminReviewRequired: userConfirmedSpam || flagForReview || false
      }
    };

    console.log(`✅ Reply created with moderation status: ${newReply.moderation.status}`, {
      userConfirmedSpam,
      flagForReview,
      adminReviewRequired: newReply.moderation.adminReviewRequired
    });

    // Add reply to comment
    comment.replies.push(newReply);
    await comment.save();

    // Get the newly created reply with its ID
    const savedReply = comment.replies[comment.replies.length - 1];

    // Update classification with actual reply ID
    if (filterResult && filterResult.classification) {
      await RealTimeSpamFilter.updateClassificationWithReplyId(
        filterResult.classification, 
        savedReply._id
      );
    }

    console.log(`✅ Reply created: ${savedReply._id} (${filterResult?.action || 'user-confirmed'})`);

    // Prepare response
    let response = {
      success: true,
      reply: {
        _id: savedReply._id,
        userId: savedReply.userId,
        text: savedReply.text,
        timestamp: savedReply.timestamp,
        moderation: savedReply.moderation
      }
    };

    // Add warning for flagged content
    if (filterResult?.action === 'flag' || userConfirmedSpam) {
      response.warning = userConfirmedSpam ? 
        'Your reply has been submitted and flagged for admin review.' :
        'Your reply has been flagged for review and may take time to appear.';
      response.flagged = true;
    }

    res.status(201).json(response);

    // Process reply with AI spam detection asynchronously
    try {
      const moderationResult = await replyModerationService.processNewReply({
        replyId: savedReply._id,
        userId: userId,
        tourId: comment.tourId,
        content: text.trim(),
        metadata: {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          commentId: commentId
        }
      });

      console.log(`Reply moderation result: ${moderationResult.action} for reply ${savedReply._id}`);

      // Update reply moderation status in comment
      const replyIndex = comment.replies.length - 1;
      comment.replies[replyIndex].moderation = {
        processed: true,
        classificationId: moderationResult.classification?._id,
        status: moderationResult.action === 'auto_approve' ? 'auto-approved' : 
                moderationResult.action === 'auto_reject' ? 'auto-rejected' : 'pending',
        isSpam: moderationResult.classification?.classification?.isSpam || false,
        confidence: moderationResult.classification?.classification?.confidence || 0,
        requiresReview: moderationResult.requiresReview || false
      };

      // If auto-rejected, mark reply as hidden or remove it
      if (moderationResult.action === 'auto_reject') {
        comment.replies[replyIndex].moderation.status = 'auto-rejected';
        await comment.save();
        
        // Don't return, just log since response already sent
        console.log('Reply was rejected by automated moderation:', {
          error: 'Reply was rejected by automated moderation',
          reason: 'Content flagged as spam or inappropriate',
          classification: moderationResult.classification?.classification,
          confidence: (moderationResult.classification?.classification?.confidence * 100).toFixed(1) + '%'
        });
      }

      // Save updated comment with moderation data
      await comment.save();

      // Record violation if spam/toxic detected
      if (moderationResult.classification && moderationResult.classification.classification) {
        const classification = moderationResult.classification.classification;
        
        // Check for violations
        if (classification.isSpam && classification.confidence > 0.7) {
          await UserBanService.recordViolation({
            userId: userId,
            replyId: savedReply._id,
            commentId: commentId,
            tourId: comment.tourId,
            violationType: 'spam',
            content: text.trim(),
            severity: classification.confidence > 0.9 ? 'high' : 'medium',
            confidence: classification.confidence,
            aiClassificationId: moderationResult.classification._id
          });
          console.log(`🚨 Spam violation recorded for user ${userId} (confidence: ${(classification.confidence * 100).toFixed(1)}%)`);
        }

        // Check for toxicity
        if (classification.toxic_type && classification.toxic_type !== 'none') {
          const toxicityMap = {
            'hate_speech': 'hate_speech',
            'harassment': 'harassment',
            'toxic': 'toxic',
            'inappropriate': 'inappropriate'
          };

          const violationType = toxicityMap[classification.toxic_type] || 'toxic';
          const severity = classification.confidence > 0.8 ? 'high' : 'medium';

          await UserBanService.recordViolation({
            userId: userId,
            replyId: savedReply._id,
            commentId: commentId,
            tourId: comment.tourId,
            violationType: violationType,
            content: text.trim(),
            severity: severity,
            confidence: classification.confidence,
            aiClassificationId: moderationResult.classification._id
          });
          console.log(`🚨 ${violationType} violation recorded for user ${userId} (confidence: ${(classification.confidence * 100).toFixed(1)}%)`);
        }
      }

      // If requires review, continue but notify admin
      if (moderationResult.action === 'require_review') {
        console.log(`Reply ${savedReply._id} requires admin review - flagged for moderation`);
      }

    } catch (moderationError) {
      console.error('Error in reply moderation:', moderationError);
      // Continue without blocking user - admin can review later
      const replyIndex = comment.replies.length - 1;
      comment.replies[replyIndex].moderation = {
        processed: false,
        status: 'pending',
        requiresReview: true
      };
      await comment.save();
    }

  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create reply',
      message: error.message 
    });
  }
});

// POST - Mark review as helpful
router.post('/:commentId/helpful', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const helpfulArray = comment.reactions.helpful || [];
    const userIndex = helpfulArray.findIndex(id => id.toString() === userId);

    if (userIndex > -1) {
      // Remove helpful
      helpfulArray.splice(userIndex, 1);
    } else {
      // Add helpful
      helpfulArray.push(userId);
    }

    comment.reactions.helpful = helpfulArray;
    await comment.save();

    res.json({
      message: 'Updated successfully',
      helpfulCount: helpfulArray.length,
      isHelpful: userIndex === -1
    });
  } catch (error) {
    console.error('Error updating helpful:', error);
    res.status(500).json({ error: 'Error updating helpful' });
  }
});

// DELETE - Xóa review (chỉ owner)
router.delete('/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    const comment = await Comment.findOne({
      _id: commentId,
      userId: userId
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    await comment.deleteOne();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Error deleting review' });
  }
});

// GET - Check if user can review this tour
router.get('/can-review/:tourId', authenticate, async (req, res) => {
  try {
    const { tourId } = req.params;
    const userId = req.userId;

    // Check if user has completed booking for this tour
    const completedBooking = await Booking.findOne({
      userId: userId,
      tourId: tourId,
      status: 'completed'
    });

    if (!completedBooking) {
      return res.json({
        canReview: false,
        reason: 'not_completed',
        message: 'You need to complete this tour before writing a review'
      });
    }

    // Check if already reviewed
    if (completedBooking.hasReviewed) {
      return res.json({
        canReview: false,
        reason: 'already_reviewed',
        message: 'You have already reviewed this tour',
        reviewId: completedBooking.reviewId
      });
    }

    // User can review!
    res.json({
      canReview: true,
      bookingId: completedBooking._id,
      message: 'You can write a review for this tour'
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ error: 'Error checking review eligibility' });
  }
});

// POST - Report a review
router.post('/:commentId/report', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;
    const { reason, description } = req.body;

    // Validate reason
    const validReasons = ['spam', 'inappropriate', 'offensive', 'fake', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ 
        error: 'Invalid reason. Must be one of: spam, inappropriate, offensive, fake, other' 
      });
    }

    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already reported this review
    const existingReport = comment.reports.find(
      report => report.userId.toString() === userId && report.status === 'pending'
    );

    if (existingReport) {
      return res.status(400).json({ 
        error: 'You have already reported this review' 
      });
    }

    // Add report
    comment.reports.push({
      userId: userId,
      reason: reason,
      description: description || '',
      timestamp: new Date(),
      status: 'pending'
    });

    await comment.save();

    res.json({
      message: 'Report submitted successfully',
      reportCount: comment.reports.length
    });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ error: 'Error reporting review' });
  }
});

// GET - Check user ban status
router.get('/ban-status', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const banInfo = await UserBanService.isUserBanned(userId, 'reply_ban');
    
    if (banInfo) {
      res.json({
        banned: true,
        banInfo: {
          reason: banInfo.reason,
          severity: banInfo.severity,
          remainingTime: banInfo.getRemainingTime(),
          endDate: banInfo.endDate,
          appealStatus: banInfo.appealStatus
        }
      });
    } else {
      res.json({ banned: false });
    }
  } catch (error) {
    console.error('Error checking ban status:', error);
    res.status(500).json({ error: 'Error checking ban status' });
  }
});

// POST - Submit ban appeal
router.post('/appeal-ban', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Appeal reason is required' });
    }

    // Find active ban for user
    const activeBan = await UserBan.findOne({
      userId: userId,
      isActive: true,
      appealStatus: 'none'
    });

    if (!activeBan) {
      return res.status(404).json({ error: 'No active ban found or appeal already submitted' });
    }

    // Update ban with appeal
    activeBan.appealStatus = 'pending';
    activeBan.appealReason = reason.trim();
    activeBan.appealedAt = new Date();
    await activeBan.save();

    res.json({
      success: true,
      message: 'Appeal submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting appeal:', error);
    res.status(500).json({ error: 'Error submitting appeal' });
  }
});

module.exports = router;