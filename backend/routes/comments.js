const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Booking = require('../models/Booking');
const User = require('../models/User');

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

    // Calculate helpful count for each comment
    const commentsWithCounts = comments.map(comment => ({
      ...comment,
      helpfulCount: comment.reactions?.helpful?.length || 0,
      replyCount: comment.replies?.length || 0
    }));

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

// POST - Reply to review (tất cả user đăng nhập)
router.post('/:commentId/reply', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Add reply
    comment.replies.push({
      userId: userId,
      text: text.trim(),
      timestamp: new Date()
    });

    await comment.save();
    await comment.populate('replies.userId', 'fullName avatar');

    res.status(201).json({
      message: 'Reply added successfully',
      reply: comment.replies[comment.replies.length - 1]
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Error adding reply' });
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

module.exports = router;