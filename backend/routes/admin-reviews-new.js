const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

// GET /api/admin/reviews - Get all reviews with efficient search + pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, rating, adminReplied } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('\n🔍 REVIEWS API REQUEST:', { page, limit, search, rating, adminReplied });
    
    // Build base filter
    let baseFilter = {};
    
    if (rating && rating !== 'all') {
      baseFilter['content.rating'] = parseInt(rating);
      console.log('📊 Added rating filter:', parseInt(rating));
    }
    
    // Admin replied filter - will be applied in both regular and search queries
    let adminReplyFilter = {};
    if (adminReplied && adminReplied !== 'all') {
      console.log(`🔄 Processing adminReplied filter: "${adminReplied}"`);
      
      if (adminReplied === 'true') {
        adminReplyFilter = { 'replies': { $elemMatch: { isAdmin: true } } };
        console.log('✅ Filter: Looking for reviews WITH admin replies');
      } else if (adminReplied === 'false') {
        adminReplyFilter = {
          $or: [
            { 'replies': { $size: 0 } },
            { 'replies': { $not: { $elemMatch: { isAdmin: true } } } }
          ]
        };
        console.log('✅ Filter: Looking for reviews WITHOUT admin replies');
      }
      
      // Add to base filter for regular queries
      Object.assign(baseFilter, adminReplyFilter);
      console.log('📋 adminReplyFilter applied:', JSON.stringify(adminReplyFilter, null, 2));
    }
    
    console.log('📋 Final baseFilter:', JSON.stringify(baseFilter, null, 2));

    let paginatedReviews, totalFilteredResults;

    if (search && search.trim()) {
      console.log(`🔎 Performing GLOBAL search for: "${search}"`);
      
      // Use aggregation pipeline for cross-collection search
      const searchRegex = new RegExp(search, 'i');
      
      const pipeline = [
        { $match: baseFilter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'tours', 
            localField: 'tourId',
            foreignField: '_id',
            as: 'tour'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'replies.userId',
            foreignField: '_id',
            as: 'replyUsers'
          }
        },
        {
          $match: {
            $or: [
              { 'content.text': searchRegex },    // Nội dung review
              { 'user.fullName': searchRegex },   // Tên user  
              { 'tour.name': searchRegex }        // Tên tour
            ]
          }
        },
        // Apply admin reply filter after search if specified
        ...(Object.keys(adminReplyFilter).length > 0 ? [{ $match: adminReplyFilter }] : []),
        { $sort: { 'timestamps.createdAt': -1 } }
      ];

      console.log('🔍 Aggregation pipeline steps:', pipeline.length);
      console.log('🔧 Pipeline with admin filter:', JSON.stringify(pipeline, null, 2));

      // Get total count for ALL search results (not just current page)
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await Comment.aggregate(countPipeline);
      totalFilteredResults = countResult[0]?.total || 0;
      
      console.log('📊 Count pipeline result:', countResult);

      // Get paginated results from ALL search results
      const dataPipeline = [
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) }
      ];
      
      const results = await Comment.aggregate(dataPipeline);
      
      // Transform aggregation results to match populate format
      paginatedReviews = results.map(doc => ({
        ...doc,
        userId: doc.user[0] || null,
        tourId: doc.tour[0] || null,
        replies: (doc.replies || []).map(reply => {
          // Find the user info for this reply
          const replyUser = doc.replyUsers?.find(user => 
            user._id.toString() === reply.userId?.toString()
          );
          return {
            ...reply,
            userId: replyUser || reply.userId
          };
        })
      }));
      
      console.log(`🔎 GLOBAL search found ${totalFilteredResults} total results across ALL pages`);
      console.log(`📄 Showing ${results.length} results for page ${page}`);
      
    } else {
      console.log('📋 No search - using regular pagination');
      
      // Regular pagination without search
      totalFilteredResults = await Comment.countDocuments(baseFilter);
      
      paginatedReviews = await Comment.find(baseFilter)
        .populate('userId', 'fullName email avatar')
        .populate('tourId', 'name country img')
        .populate('replies.userId', 'fullName email avatar')
        .sort({ 'timestamps.createdAt': -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
        
      console.log(`📄 Found ${totalFilteredResults} total, showing ${paginatedReviews.length}`);
    }

    if (paginatedReviews.length > 0) {
      console.log('👤 First review user:', paginatedReviews[0].userId?.fullName || 'No user');
      console.log('🏖️ First review tour:', paginatedReviews[0].tourId?.name || 'No tour');
      console.log('💬 First review replies count:', paginatedReviews[0].replies?.length || 0);
      
      if (paginatedReviews[0].replies?.length > 0) {
        console.log('💬 First review first reply:', {
          isAdmin: paginatedReviews[0].replies[0].isAdmin,
          adminName: paginatedReviews[0].replies[0].adminName,
          text: paginatedReviews[0].replies[0].text?.substring(0, 50) + '...'
        });
      }
    }

    // Transform to frontend format
    const transformedReviews = paginatedReviews.map(review => ({
      id: review._id,
      _id: review._id,
      userName: review.userId?.fullName || 'Unknown User',
      userEmail: review.userId?.email || 'No email',
      userAvatar: review.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userId?.fullName || 'User')}&background=0D8ABC&color=fff`,
      tourName: review.tourId?.name || 'Unknown Tour',
      tourCountry: review.tourId?.country || 'Unknown',
      tourImage: review.tourId?.img?.[0] || '',
      rating: review.content?.rating || 0,
      comment: review.content?.text || '',
      images: review.content?.images || [],
      detailedRating: review.content?.detailedRating || {},
      status: review.moderation?.status || 'pending',
      verified: review.verified?.isVerified || false,
      verifiedAt: review.verified?.verifiedAt,
      date: review.timestamps?.createdAt || new Date(),
      updatedAt: review.timestamps?.updatedAt,
      helpful: review.reactions?.helpful?.length || 0,
      likes: review.reactions?.likes?.length || 0,
      repliesCount: review.replies?.length || 0,
      replies: (review.replies || []).map((reply, replyIndex) => {
        const transformedReply = {
          ...reply,
          userName: reply.isAdmin ? 'CMP Travel' : (reply.userId?.fullName || 'Anonymous'),
          userAvatar: reply.isAdmin 
            ? 'https://ui-avatars.com/api/?name=CMP%20Travel&background=2563eb&color=fff&size=32' 
            : (reply.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userId?.fullName || 'User')}&background=6b7280&color=fff&size=32`),
          isAdmin: reply.isAdmin || false,
          timestamp: reply.timestamp,
          text: reply.text
        };
        
        return transformedReply;
      }),
      aiAnalysis: {
        sentiment: review.aiAnalysis?.sentiment?.label || 'neutral',
        toxicity: review.aiAnalysis?.toxicity || 0,
        categories: review.aiAnalysis?.categories || []
      },
      tripDetails: review.tripDetails || {}
    }));

    const totalPages = Math.ceil(totalFilteredResults / parseInt(limit));

    console.log(`✅ Returning ${transformedReviews.length} transformed reviews`);
    console.log(`📊 Total: ${totalFilteredResults}, Pages: ${totalPages}, Current: ${page}`);

    res.json({
      success: true,
      data: transformedReviews,
      stats: {
        total: totalFilteredResults,
        page: parseInt(page),
        totalPages: totalPages,
        hasNext: parseInt(page) * parseInt(limit) < totalFilteredResults,
        hasPrev: parseInt(page) > 1,
        showing: `${skip + 1}-${Math.min(skip + parseInt(limit), totalFilteredResults)} of ${totalFilteredResults}`,
        searchTerm: search || null
      }
    });

  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// GET /api/admin/reviews/stats - Get review statistics  
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching review statistics...');
    
    const total = await Comment.countDocuments();
    const pending = await Comment.countDocuments({ 'moderation.status': 'pending' });
    const approved = await Comment.countDocuments({ 'moderation.status': 'approved' });
    const rejected = await Comment.countDocuments({ 'moderation.status': 'rejected' });
    const verified = await Comment.countDocuments({ 'verified.isVerified': true });
    
    // Calculate average rating
    const ratingAgg = await Comment.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$content.rating' } } }
    ]);
    const avgRating = ratingAgg[0]?.avgRating || 0;

    const stats = {
      total,
      pending,
      approved,
      rejected,
      verified,
      avgRating: Math.round(avgRating * 10) / 10
    };

    console.log('📈 Review stats:', stats);

    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// PUT /api/admin/reviews/:id/status - Update review status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected.'
      });
    }

    const review = await Comment.findByIdAndUpdate(
      req.params.id,
      { 
        'moderation.status': status,
        'moderation.moderatedAt': new Date(),
        'timestamps.updatedAt': new Date()
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    console.log(`✅ Updated review ${req.params.id} status to ${status}`);

    res.json({
      success: true,
      message: 'Review status updated successfully',
      data: review
    });

  } catch (error) {
    console.error('❌ Error updating review status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/admin/reviews/:id - Delete review
router.delete('/:id', async (req, res) => {
  try {
    const review = await Comment.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    console.log(`✅ Deleted review ${req.params.id}`);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error', 
      error: error.message
    });
  }
});

// POST /api/admin/reviews/:id/reply - Add admin reply
router.post('/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required'
      });
    }

    console.log(`💬 Adding admin reply to review ${req.params.id}`);
    console.log(`💬 Reply text: "${text.trim()}"`);

    const newReply = {
      userId: null, // Admin reply
      text: text.trim(),
      timestamp: new Date(),
      isAdmin: true,
      adminRole: 'customer_service',
      adminName: 'CMP Travel' // Tên hiển thị cho admin
    };
    
    console.log(`💬 New reply object:`, newReply);

    const review = await Comment.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          replies: newReply
        },
        'timestamps.updatedAt': new Date()
      },
      { new: true }
    ).populate('userId', 'fullName email avatar')
     .populate('tourId', 'name country img');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    console.log(`✅ Admin reply added to review ${req.params.id}`);
    console.log(`💬 Review now has ${review.replies?.length || 0} replies`);
    
    if (review.replies?.length > 0) {
      const lastReply = review.replies[review.replies.length - 1];
      console.log(`💬 Last reply:`, {
        isAdmin: lastReply.isAdmin,
        adminName: lastReply.adminName,
        text: lastReply.text
      });
    }

    res.json({
      success: true,
      message: 'Admin reply added successfully',
      data: review
    });

  } catch (error) {
    console.error('❌ Error adding admin reply:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;