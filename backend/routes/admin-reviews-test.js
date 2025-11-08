const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');
const Tour = require('../models/Tour');

// Simple test route
router.get('/test', async (req, res) => {
  try {
    console.log('🔍 Testing simple review fetch...');
    
    // Get just 2 reviews
    const reviews = await Comment.find()
      .populate('userId', 'fullName email avatar')
      .populate('tourId', 'name country img')
      .limit(2)
      .lean();

    console.log(`✅ Found ${reviews.length} reviews`);
    
    if (reviews.length > 0) {
      console.log('👤 First review user:', reviews[0].userId?.fullName);
      console.log('🏖️ First review tour:', reviews[0].tourId?.name);
    }

    // Transform to simple format
    const transformedReviews = reviews.map(review => ({
      id: review._id,
      userName: review.userId?.fullName || 'Unknown User',
      userEmail: review.userId?.email || 'No email',
      tourName: review.tourId?.name || 'Unknown Tour',
      tourCountry: review.tourId?.country || 'Unknown',
      rating: review.content?.rating || 0,
      comment: review.content?.text || '',
      verified: review.verified?.isVerified || false,
      date: review.timestamps?.createdAt || new Date(),
      status: review.moderation?.status || 'pending'
    }));

    console.log('✅ Transformation successful');

    res.json({
      success: true,
      data: transformedReviews,
      test: true
    });

  } catch (error) {
    console.error('❌ Test route error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      test: true
    });
  }
});

module.exports = router;