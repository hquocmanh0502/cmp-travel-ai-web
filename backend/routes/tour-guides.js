const express = require('express');
const router = express.Router();
const TourGuide = require('../models/TourGuide');
const GuideReview = require('../models/GuideReview');
const { isAdmin } = require('../middleware/adminAuth');

// ==================== TOUR GUIDE MANAGEMENT ====================

// Get all tour guides (with filters)
router.get('/tour-guides', isAdmin, async (req, res) => {
  try {
    const { status, availability, specialty, search } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (availability) query.availability = availability;
    if (specialty) query.specialties = { $in: [specialty] };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }
    
    const guides = await TourGuide.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: guides,
      count: guides.length
    });
  } catch (error) {
    console.error('Error fetching tour guides:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching tour guides',
      message: error.message 
    });
  }
});

// Get single tour guide by ID
router.get('/tour-guides/:id', isAdmin, async (req, res) => {
  try {
    const guide = await TourGuide.findById(req.params.id);
    
    if (!guide) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tour guide not found' 
      });
    }
    
    // Get reviews for this guide
    const reviews = await GuideReview.find({ 
      guideId: req.params.id,
      status: 'approved'
    })
      .populate('userId', 'fullName email')
      .populate('tourId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: {
        ...guide.toObject(),
        recentReviews: reviews
      }
    });
  } catch (error) {
    console.error('Error fetching tour guide:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching tour guide',
      message: error.message 
    });
  }
});

// Create new tour guide
router.post('/tour-guides', isAdmin, async (req, res) => {
  try {
    const guide = new TourGuide(req.body);
    await guide.save();
    
    res.status(201).json({
      success: true,
      data: guide,
      message: 'Tour guide created successfully'
    });
  } catch (error) {
    console.error('Error creating tour guide:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already exists',
        message: 'A tour guide with this email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Error creating tour guide',
      message: error.message 
    });
  }
});

// Update tour guide
router.put('/tour-guides/:id', isAdmin, async (req, res) => {
  try {
    const guide = await TourGuide.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!guide) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tour guide not found' 
      });
    }
    
    res.json({
      success: true,
      data: guide,
      message: 'Tour guide updated successfully'
    });
  } catch (error) {
    console.error('Error updating tour guide:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating tour guide',
      message: error.message 
    });
  }
});

// Delete tour guide
router.delete('/tour-guides/:id', isAdmin, async (req, res) => {
  try {
    const guide = await TourGuide.findByIdAndDelete(req.params.id);
    
    if (!guide) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tour guide not found' 
      });
    }
    
    // Optional: Delete associated reviews
    await GuideReview.deleteMany({ guideId: req.params.id });
    
    res.json({
      success: true,
      message: 'Tour guide deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tour guide:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error deleting tour guide',
      message: error.message 
    });
  }
});

// ==================== GUIDE REVIEWS MANAGEMENT ====================

// Get all reviews for a specific guide
router.get('/tour-guides/:id/reviews', async (req, res) => {
  try {
    const { status = 'approved', limit = 50 } = req.query;
    
    const query = { guideId: req.params.id };
    if (status) query.status = status;
    
    const reviews = await GuideReview.find(query)
      .populate('userId', 'fullName email avatar')
      .populate('tourId', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: reviews,
      count: reviews.length
    });
  } catch (error) {
    console.error('Error fetching guide reviews:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching reviews',
      message: error.message 
    });
  }
});

// Get all reviews (admin)
router.get('/guide-reviews', isAdmin, async (req, res) => {
  try {
    const { status, guideId } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (guideId) query.guideId = guideId;
    
    const reviews = await GuideReview.find(query)
      .populate('userId', 'fullName email')
      .populate('guideId', 'name avatar')
      .populate('tourId', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: reviews,
      count: reviews.length
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching reviews',
      message: error.message 
    });
  }
});

// Approve/Reject review
router.put('/guide-reviews/:id/status', isAdmin, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
    }
    
    const review = await GuideReview.findByIdAndUpdate(
      req.params.id,
      { status, adminResponse },
      { new: true }
    );
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Review not found' 
      });
    }
    
    // Update guide rating
    const TourGuide = require('../models/TourGuide');
    const guide = await TourGuide.findById(review.guideId);
    if (guide) {
      await guide.updateRating();
    }
    
    res.json({
      success: true,
      data: review,
      message: `Review ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating review',
      message: error.message 
    });
  }
});

// Delete review (admin)
router.delete('/guide-reviews/:id', isAdmin, async (req, res) => {
  try {
    const review = await GuideReview.findByIdAndDelete(req.params.id);
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Review not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error deleting review',
      message: error.message 
    });
  }
});

// ==================== STATISTICS ====================

// Get tour guide statistics
router.get('/tour-guides/stats/overview', isAdmin, async (req, res) => {
  try {
    const totalGuides = await TourGuide.countDocuments();
    const activeGuides = await TourGuide.countDocuments({ status: 'active' });
    const availableGuides = await TourGuide.countDocuments({ availability: 'available' });
    const totalReviews = await GuideReview.countDocuments({ status: 'approved' });
    const pendingReviews = await GuideReview.countDocuments({ status: 'pending' });
    
    // Average rating across all guides
    const guides = await TourGuide.find();
    const avgRating = guides.length > 0
      ? guides.reduce((sum, g) => sum + g.rating, 0) / guides.length
      : 0;
    
    res.json({
      success: true,
      data: {
        totalGuides,
        activeGuides,
        availableGuides,
        totalReviews,
        pendingReviews,
        averageRating: avgRating.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching statistics',
      message: error.message 
    });
  }
});

module.exports = router;
