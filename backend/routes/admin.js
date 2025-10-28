// backend/routes/admin.js
const express = require('express');
const router = express.Router();

const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const Feedback = require('../models/Feedback');
const Blog = require('../models/Blog');
const CMPWallet = require('../models/CMPWallet');

// Middleware to check admin access (TODO: Add proper authentication)
const isAdmin = (req, res, next) => {
  // TODO: Implement proper admin authentication
  // For now, we'll allow all requests
  // In production, check JWT token and admin role
  next();
};

// ==================== DASHBOARD OVERVIEW ====================

// Get dashboard analytics overview
router.get('/analytics/overview', isAdmin, async (req, res) => {
  try {
    // Get total revenue from completed bookings
    const completedBookings = await Booking.find({ paymentStatus: 'completed' });
    const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);

    // Get revenue growth (compare with previous period)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentPeriodRevenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' }
        }
      }
    ]);

    const previousPeriodRevenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' }
        }
      }
    ]);

    const currentRevenue = currentPeriodRevenue[0]?.total || 0;
    const previousRevenue = previousPeriodRevenue[0]?.total || 0;
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : 0;

    // Get total users and growth
    const totalUsers = await User.countDocuments();
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    const newUsersLastMonth = await User.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });
    const userGrowth = newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
      : 0;

    // Get total bookings and growth
    const totalBookings = await Booking.countDocuments();
    const bookingsThisMonth = await Booking.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    const bookingsLastMonth = await Booking.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });
    const bookingGrowth = bookingsLastMonth > 0
      ? ((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth * 100).toFixed(1)
      : 0;

    // Get total tours
    const totalTours = await Tour.countDocuments();

    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate('userId', 'fullName email')
      .populate('tourId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get top tours by bookings
    const topTours = await Booking.aggregate([
      {
        $group: {
          _id: '$tourId',
          bookingCount: { $count: {} },
          totalRevenue: { $sum: '$totalPrice' }
        }
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'tours',
          localField: '_id',
          foreignField: '_id',
          as: 'tourDetails'
        }
      }
    ]);

    // Get revenue by month (last 6 months)
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    const revenueByMonth = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalPrice' },
          bookings: { $count: {} }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        totalUsers,
        userGrowth: parseFloat(userGrowth),
        totalBookings,
        bookingGrowth: parseFloat(bookingGrowth),
        totalTours,
        recentBookings: recentBookings.map(b => ({
          _id: b._id,
          customerName: b.userId?.fullName || 'Unknown',
          tourName: b.tourId?.title || 'Unknown',
          totalPrice: b.totalPrice,
          paymentStatus: b.paymentStatus,
          bookingStatus: b.bookingStatus,
          createdAt: b.createdAt
        })),
        topTours: topTours.map(t => ({
          _id: t._id,
          name: t.tourDetails[0]?.title || 'Unknown',
          bookings: t.bookingCount,
          revenue: t.totalRevenue
        })),
        revenueByMonth: revenueByMonth.map(r => ({
          month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
          revenue: r.revenue,
          bookings: r.bookings
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching dashboard data',
      message: error.message 
    });
  }
});

// ==================== TOURS MANAGEMENT ====================

// Get all tours with filters
router.get('/tours', isAdmin, async (req, res) => {
  try {
    const { search, type } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }

    const tours = await Tour.find(query);

    // Get booking count for each tour
    const toursWithStats = await Promise.all(
      tours.map(async (tour) => {
        const bookingCount = await Booking.countDocuments({ tourId: tour._id });
        const completedBookings = await Booking.find({ 
          tourId: tour._id, 
          paymentStatus: 'completed' 
        });
        const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        return {
          ...tour.toObject(),
          bookings: bookingCount,
          revenue: totalRevenue
        };
      })
    );

    res.json({
      success: true,
      data: toursWithStats
    });
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching tours',
      message: error.message 
    });
  }
});

// Create new tour
router.post('/tours', isAdmin, async (req, res) => {
  try {
    const tour = new Tour(req.body);
    await tour.save();
    
    res.status(201).json({
      success: true,
      data: tour,
      message: 'Tour created successfully'
    });
  } catch (error) {
    console.error('Error creating tour:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error creating tour',
      message: error.message 
    });
  }
});

// Update tour
router.put('/tours/:id', isAdmin, async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!tour) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tour not found' 
      });
    }
    
    res.json({
      success: true,
      data: tour,
      message: 'Tour updated successfully'
    });
  } catch (error) {
    console.error('Error updating tour:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating tour',
      message: error.message 
    });
  }
});

// Delete tour
router.delete('/tours/:id', isAdmin, async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    
    if (!tour) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tour not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Tour deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tour:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error deleting tour',
      message: error.message 
    });
  }
});

// ==================== USERS MANAGEMENT ====================

// Get all users with filters
router.get('/users', isAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'verified') {
      query.verified = true;
    } else if (status === 'unverified') {
      query.verified = false;
    }

    const users = await User.find(query).select('-password');

    // Get stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const bookings = await Booking.find({ userId: user._id });
        const completedBookings = bookings.filter(b => b.paymentStatus === 'completed');
        const totalSpent = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        return {
          ...user.toObject(),
          totalBookings: bookings.length,
          totalSpent
        };
      })
    );

    res.json({
      success: true,
      data: usersWithStats
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching users',
      message: error.message 
    });
  }
});

// Update user
router.put('/users/:id', isAdmin, async (req, res) => {
  try {
    // Don't allow password update through this endpoint
    delete req.body.password;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating user',
      message: error.message 
    });
  }
});

// Block/Unblock user
router.put('/users/:id/block', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    user.blocked = !user.blocked;
    await user.save();
    
    res.json({
      success: true,
      data: user,
      message: `User ${user.blocked ? 'blocked' : 'unblocked'} successfully`
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error blocking user',
      message: error.message 
    });
  }
});

// ==================== HOTELS MANAGEMENT ====================

// Get all hotels with filters
router.get('/hotels', isAdmin, async (req, res) => {
  try {
    const { search, stars } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (stars && stars !== 'all') {
      query.stars = parseInt(stars);
    }

    const hotels = await Hotel.find(query);

    res.json({
      success: true,
      data: hotels
    });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching hotels',
      message: error.message 
    });
  }
});

// Create new hotel
router.post('/hotels', isAdmin, async (req, res) => {
  try {
    const hotel = new Hotel(req.body);
    await hotel.save();
    
    res.status(201).json({
      success: true,
      data: hotel,
      message: 'Hotel created successfully'
    });
  } catch (error) {
    console.error('Error creating hotel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error creating hotel',
      message: error.message 
    });
  }
});

// Update hotel
router.put('/hotels/:id', isAdmin, async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!hotel) {
      return res.status(404).json({ 
        success: false, 
        error: 'Hotel not found' 
      });
    }
    
    res.json({
      success: true,
      data: hotel,
      message: 'Hotel updated successfully'
    });
  } catch (error) {
    console.error('Error updating hotel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating hotel',
      message: error.message 
    });
  }
});

// Delete hotel
router.delete('/hotels/:id', isAdmin, async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    
    if (!hotel) {
      return res.status(404).json({ 
        success: false, 
        error: 'Hotel not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Hotel deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error deleting hotel',
      message: error.message 
    });
  }
});

// ==================== REVIEWS MANAGEMENT ====================

// Get all reviews with filters
router.get('/reviews', isAdmin, async (req, res) => {
  try {
    const { search, status, rating } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (rating && rating !== 'all') {
      query.rating = parseInt(rating);
    }

    const reviews = await Feedback.find(query)
      .populate('userId', 'fullName email avatar')
      .populate('tourId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reviews
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

// Approve review
router.put('/reviews/:id/approve', isAdmin, async (req, res) => {
  try {
    const review = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).populate('userId', 'fullName email')
     .populate('tourId', 'title');
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Review not found' 
      });
    }
    
    res.json({
      success: true,
      data: review,
      message: 'Review approved successfully'
    });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error approving review',
      message: error.message 
    });
  }
});

// Reject review
router.put('/reviews/:id/reject', isAdmin, async (req, res) => {
  try {
    const review = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).populate('userId', 'fullName email')
     .populate('tourId', 'title');
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Review not found' 
      });
    }
    
    res.json({
      success: true,
      data: review,
      message: 'Review rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error rejecting review',
      message: error.message 
    });
  }
});

// Delete review
router.delete('/reviews/:id', isAdmin, async (req, res) => {
  try {
    const review = await Feedback.findByIdAndDelete(req.params.id);
    
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

// Reply to review
router.post('/reviews/:id/reply', isAdmin, async (req, res) => {
  try {
    const { reply } = req.body;
    
    const review = await Feedback.findByIdAndUpdate(
      req.params.id,
      { 
        adminResponse: reply,
        respondedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'fullName email')
     .populate('tourId', 'title');
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        error: 'Review not found' 
      });
    }
    
    res.json({
      success: true,
      data: review,
      message: 'Reply posted successfully'
    });
  } catch (error) {
    console.error('Error replying to review:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error replying to review',
      message: error.message 
    });
  }
});

// ==================== BOOKINGS MANAGEMENT ====================

// Get bookings stats
router.get('/bookings/stats', isAdmin, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ bookingStatus: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ bookingStatus: 'confirmed' });
    const completedBookings = await Booking.countDocuments({ bookingStatus: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ bookingStatus: 'cancelled' });

    res.json({
      success: true,
      data: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings
      }
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching booking stats',
      message: error.message 
    });
  }
});

// ==================== BLOG MANAGEMENT ====================

// Get all blogs
router.get('/blogs', isAdmin, async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: blogs
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching blogs',
      message: error.message 
    });
  }
});

// Create new blog
router.post('/blogs', isAdmin, async (req, res) => {
  try {
    const blog = new Blog(req.body);
    await blog.save();
    
    res.status(201).json({
      success: true,
      data: blog,
      message: 'Blog created successfully'
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error creating blog',
      message: error.message 
    });
  }
});

// Update blog
router.put('/blogs/:id', isAdmin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blog not found' 
      });
    }
    
    res.json({
      success: true,
      data: blog,
      message: 'Blog updated successfully'
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating blog',
      message: error.message 
    });
  }
});

// Delete blog
router.delete('/blogs/:id', isAdmin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blog not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error deleting blog',
      message: error.message 
    });
  }
});

module.exports = router;
