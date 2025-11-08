const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Tour = require('../models/Tour');
const User = require('../models/User');

// Debug logging function
const debugLog = (action, data) => {
  console.log(`[ADMIN-REVIEWS] ${new Date().toISOString()}`);
  console.log(`Action: ${action}`);
  console.log('Data:', data);
  console.log('='.repeat(60));
};

// GET - Lấy tất cả reviews cho admin với filtering và pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const {
      search,
      status,
      rating,
      verified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    debugLog('GET_REVIEWS_REQUEST', { 
      page, limit, search, status, rating, verified, sortBy, sortOrder 
    });

    // Build filter
    let filter = {};
    
    if (search) {
      filter.$or = [
        { 'content.text': { $regex: search, $options: 'i' } }
        // Note: User and tour search will be handled after population
      ];
    }
    
    // Remove status filter - show all reviews
    
    if (rating && rating !== 'all') {
      filter['content.rating'] = parseInt(rating);
    }
    
    if (verified === 'true') {
      filter['verified.isVerified'] = true;
    } else if (verified === 'false') {
      filter['verified.isVerified'] = false;
    }

    // Build sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    debugLog('FILTER_AND_SORT', { filter, sortOptions });

    // Execute query with populate
    const reviews = await Comment.find(filter)
      .populate('userId', 'name email avatar')
      .populate('tourId', 'name country img')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Debug: Log database query results
    console.log('\n🔍 DATABASE QUERY DEBUG:');
    console.log('Filter used:', JSON.stringify(filter, null, 2));
    console.log('Total documents found:', reviews.length);
    
    if (reviews.length > 0) {
      console.log('First document from DB:', JSON.stringify(reviews[0], null, 2));
      console.log('User populated:', !!reviews[0].userId);
      console.log('Tour populated:', !!reviews[0].tourId);
      console.log('Content structure:', reviews[0].content);
      console.log('Verified structure:', reviews[0].verified);
    }

    // Get total count
    const total = await Comment.countDocuments(filter);

    // Apply search filter after population if needed
    let finalReviews = reviews;
    if (search) {
      const searchLower = search.toLowerCase();
      finalReviews = reviews.filter(review => {
        return (
          review.content?.text?.toLowerCase().includes(searchLower) ||
          review.userId?.name?.toLowerCase().includes(searchLower) ||
          review.userId?.email?.toLowerCase().includes(searchLower) ||
          review.tourId?.name?.toLowerCase().includes(searchLower) ||
          review.tourId?.country?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Transform data for frontend
    console.log('\n✨ TRANSFORMATION DEBUG:');
    console.log('Total reviews to transform:', finalReviews.length);
    if (finalReviews.length > 0) {
      console.log('Sample review before transform - structure keys:', Object.keys(finalReviews[0]));
      console.log('Sample review userId:', finalReviews[0].userId);
      console.log('Sample review tourId:', finalReviews[0].tourId);
      console.log('Sample review content:', finalReviews[0].content);
    }

    const transformedReviews = finalReviews.map(review => {
      const transformed = {
        _id: review._id,
        userName: review.userId?.name || 'Unknown User',
        userEmail: review.userId?.email || 'No email',
        userAvatar: review.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userId?.name || 'User')}&background=0D8ABC&color=fff`,
        tourName: review.tourId?.name || 'Unknown Tour',
        tourCountry: review.tourId?.country || 'Unknown',
        tourImage: review.tourId?.img || '',
        rating: review.content?.rating || 0,
        comment: review.content?.text || '',
        images: review.content?.images || [],
        detailedRating: review.content?.detailedRating || {},
        status: review.moderation?.status || 'pending',
        verified: review.verified?.isVerified || false,
        verifiedAt: review.verified?.verifiedAt,
        date: review.timestamps?.createdAt || review.createdAt,
        updatedAt: review.timestamps?.updatedAt || review.updatedAt,
        helpful: review.helpful?.count || review.reactions?.helpful?.length || 0,
        likes: review.reactions?.likes?.length || 0,
        repliesCount: review.replies?.length || 0,
        aiAnalysis: {
          sentiment: review.aiAnalysis?.sentiment || {},
          toxicity: review.aiAnalysis?.toxicity || 0,
          categories: review.aiAnalysis?.categories || []
        },
        tripDetails: review.tripDetails || {}
      };
      return transformed;
    });

    console.log('\nSample review after transform:');
    if (transformedReviews[0]) {
      console.log('- userName:', transformedReviews[0].userName);
      console.log('- tourName:', transformedReviews[0].tourName);
      console.log('- comment:', transformedReviews[0].comment.substring(0, 50) + '...');
      console.log('- rating:', transformedReviews[0].rating);
      console.log('- verified:', transformedReviews[0].verified);
    }

    const stats = {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    debugLog('GET_REVIEWS_SUCCESS', { 
      reviewsCount: transformedReviews.length, 
      stats 
    });

    res.json({
      success: true,
      data: transformedReviews,
      stats,
      count: transformedReviews.length
    });

  } catch (error) {
    debugLog('GET_REVIEWS_ERROR', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
});

// GET - Lấy statistics cho dashboard
router.get('/stats', async (req, res) => {
  try {
    debugLog('GET_STATS_REQUEST', {});

    const [
      totalReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      verifiedReviews,
      avgRating,
      ratingDistribution
    ] = await Promise.all([
      Comment.countDocuments(),
      Comment.countDocuments({ 'moderation.status': 'pending' }),
      Comment.countDocuments({ 'moderation.status': 'approved' }),
      Comment.countDocuments({ 'moderation.status': 'rejected' }),
      Comment.countDocuments({ 'verified.isVerified': true }),
      Comment.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$content.rating' } } }
      ]),
      Comment.aggregate([
        { $group: { _id: '$content.rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const stats = {
      total: totalReviews,
      pending: pendingReviews,
      approved: approvedReviews,
      rejected: rejectedReviews,
      verified: verifiedReviews,
      avgRating: avgRating[0]?.avgRating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    debugLog('GET_STATS_SUCCESS', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    debugLog('GET_STATS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// PUT - Update review status (approve/reject)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    debugLog('UPDATE_STATUS_REQUEST', { id, status, adminNote });

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }

    const review = await Comment.findByIdAndUpdate(
      id,
      {
        'moderation.status': status,
        'moderation.processed': true,
        'moderation.processedAt': new Date(),
        'moderation.adminNote': adminNote || '',
        'timestamps.updatedAt': new Date()
      },
      { new: true }
    ).populate('userId', 'name email')
     .populate('tourId', 'name');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    debugLog('UPDATE_STATUS_SUCCESS', { 
      reviewId: review._id, 
      newStatus: status,
      user: review.userId?.name,
      tour: review.tourId?.name
    });

    res.json({
      success: true,
      message: `Review ${status} successfully`,
      data: review
    });

  } catch (error) {
    debugLog('UPDATE_STATUS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update review status',
      error: error.message
    });
  }
});

// DELETE - Delete review (hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    debugLog('DELETE_REVIEW_REQUEST', { id });

    const review = await Comment.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await Comment.findByIdAndDelete(id);

    debugLog('DELETE_REVIEW_SUCCESS', { 
      reviewId: id,
      reviewContent: review.content?.text?.substring(0, 50) + '...'
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    debugLog('DELETE_REVIEW_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    });
  }
});

// POST - Add admin reply to review
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, adminRole = 'manager' } = req.body;

    debugLog('ADD_REPLY_REQUEST', { reviewId: id, text, adminRole });

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required'
      });
    }

    const review = await Comment.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const newReply = {
      userId: new mongoose.Types.ObjectId(), // Admin user ID - should be from auth
      text: text.trim(),
      timestamp: new Date(),
      isAdmin: true,
      adminRole: adminRole,
      moderation: {
        processed: true,
        status: 'auto-approved',
        isSpam: false,
        confidence: 1.0,
        requiresReview: false
      },
      reactions: {
        likes: [],
        helpful: []
      }
    };

    review.replies.push(newReply);
    review.timestamps.updatedAt = new Date();

    await review.save();

    debugLog('ADD_REPLY_SUCCESS', { 
      reviewId: id,
      replyId: newReply._id,
      adminRole
    });

    res.json({
      success: true,
      message: 'Admin reply added successfully',
      data: {
        reply: newReply,
        totalReplies: review.replies.length
      }
    });

  } catch (error) {
    debugLog('ADD_REPLY_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to add reply',
      error: error.message
    });
  }
});

// GET - Get single review details with replies
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    debugLog('GET_REVIEW_DETAIL_REQUEST', { id });

    const review = await Comment.findById(id)
      .populate('userId', 'name email avatar')
      .populate('tourId', 'name country img description')
      .populate('replies.userId', 'name avatar')
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    debugLog('GET_REVIEW_DETAIL_SUCCESS', { 
      reviewId: id,
      user: review.userId?.name,
      tour: review.tourId?.name,
      repliesCount: review.replies?.length || 0
    });

    res.json({
      success: true,
      data: review
    });

  } catch (error) {
    debugLog('GET_REVIEW_DETAIL_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review details',
      error: error.message
    });
  }
});

module.exports = router;
