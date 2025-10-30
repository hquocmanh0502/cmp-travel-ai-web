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
    // Get total revenue from paid bookings
    const paidBookings = await Booking.find({ paymentStatus: 'paid' });
    const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

    // Get revenue growth (compare with previous period)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentPeriodRevenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    const previousPeriodRevenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
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
      .populate('tourId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get top tours by bookings
    const topTours = await Booking.aggregate([
      {
        $group: {
          _id: '$tourId',
          bookingCount: { $count: {} },
          totalRevenue: { $sum: '$totalAmount' }
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
          paymentStatus: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
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
          tourName: b.tourId?.name || 'Unknown',
          totalPrice: b.totalAmount,
          paymentStatus: b.paymentStatus,
          bookingStatus: b.status,
          createdAt: b.createdAt
        })),
        topTours: topTours.map(t => ({
          _id: t._id,
          name: t.tourDetails[0]?.name || 'Unknown',
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

// Get full data for export
router.get('/export/full-data', isAdmin, async (req, res) => {
  try {
    // Get ALL bookings with user and tour details
    const allBookings = await Booking.find()
      .populate('userId', 'fullName email phoneNumber')
      .populate('tourId', 'name price')
      .sort({ createdAt: -1 })
      .lean();

    // Format bookings for export
    const formattedBookings = allBookings.map(booking => ({
      _id: booking._id,
      customerName: booking.userId?.fullName || booking.fullName || 'N/A',
      email: booking.userId?.email || booking.email || 'N/A',
      phone: booking.userId?.phoneNumber || booking.phoneNumber || 'N/A',
      tourName: booking.tourId?.name || booking.tourName || 'N/A',
      tourDate: booking.tourDate,
      numberOfGuests: booking.numberOfGuests || 0,
      totalPrice: booking.totalAmount || 0,
      paymentStatus: booking.paymentStatus || 'pending',
      bookingStatus: booking.status || 'pending',
      bookingDate: booking.createdAt,
      paymentMethod: booking.paymentMethod || 'N/A'
    }));

    // Get ALL tours with stats
    const allTours = await Tour.find().lean();
    const toursWithStats = await Promise.all(
      allTours.map(async (tour) => {
        const bookingCount = await Booking.countDocuments({ tourId: tour._id });
        const paidBookings = await Booking.find({ 
          tourId: tour._id, 
          paymentStatus: 'paid' 
        });
        const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        return {
          _id: tour._id,
          name: tour.name,
          country: tour.country,
          city: tour.city,
          price: tour.price,
          duration: tour.duration,
          maxGroupSize: tour.maxGroupSize,
          rating: tour.rating,
          totalBookings: bookingCount,
          totalRevenue: totalRevenue
        };
      })
    );

    // Get revenue by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const revenueByMonth = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const formattedRevenueByMonth = revenueByMonth.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: item.revenue,
      bookings: item.bookings
    }));

    res.json({
      success: true,
      data: {
        bookings: formattedBookings,
        tours: toursWithStats,
        revenueByMonth: formattedRevenueByMonth,
        exportDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching export data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching export data',
      message: error.message 
    });
  }
});

// Get all tours with filters
router.get('/tours', isAdmin, async (req, res) => {
  try {
    const { search, type } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
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
        const paidBookings = await Booking.find({ 
          tourId: tour._id, 
          paymentStatus: 'paid' 
        });
        const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

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
      .populate('tourId', 'name')
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
     .populate('tourId', 'name');
    
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
     .populate('tourId', 'name');
    
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
     .populate('tourId', 'name');
    
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
// ==================== BOOKINGS MANAGEMENT ====================

// Get all bookings with filters and pagination
router.get('/bookings', isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = '', 
      paymentStatus = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Search by customer name, email, tour name
    if (search) {
      query.$or = [
        { 'customerInfo.fullName': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { tourName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by booking status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by payment status
    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    // Count total documents
    const total = await Booking.countDocuments(query);
    
    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Fetch bookings with pagination
    const bookings = await Booking.find(query)
      .populate('userId', 'fullName email phoneNumber')
      .populate('tourId', 'name price country city duration')
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Format response
    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      bookingId: 'BOOK' + booking._id.toString().slice(-8).toUpperCase(),
      customerName: booking.customerInfo?.fullName || booking.userId?.fullName || 'N/A',
      customerEmail: booking.customerInfo?.email || booking.userId?.email || 'N/A',
      customerPhone: booking.customerInfo?.phone || booking.userId?.phoneNumber || 'N/A',
      tourName: booking.tourName || booking.tourId?.name || 'N/A',
      tourLocation: booking.tourId ? `${booking.tourId.city}, ${booking.tourId.country}` : 'N/A',
      departureDate: booking.departureDate,
      checkinDate: booking.checkinDate,
      checkoutDate: booking.checkoutDate,
      totalGuests: (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0),
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paymentDetails?.paidAmount || 0,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      bookingDate: booking.createdAt,
      updatedAt: booking.updatedAt
    }));

    res.json({
      success: true,
      data: {
        bookings: formattedBookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching bookings',
      message: error.message 
    });
  }
});

// Get booking stats (must be BEFORE /bookings/:id)
router.get('/bookings/stats', isAdmin, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

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

// Get single booking detail
router.get('/bookings/:id', isAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'fullName email phoneNumber avatar')
      .populate('tourId')
      .populate('hotelId', 'name address rating')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Format detailed response
    const detailedBooking = {
      _id: booking._id,
      bookingId: 'BOOK' + booking._id.toString().slice(-8).toUpperCase(),
      
      // Customer Info
      customer: {
        id: booking.userId?._id,
        name: booking.customerInfo?.fullName || booking.userId?.fullName || 'N/A',
        email: booking.customerInfo?.email || booking.userId?.email || 'N/A',
        phone: booking.customerInfo?.phone || booking.userId?.phoneNumber || 'N/A',
        title: booking.customerInfo?.title || 'Mr',
        specialRequests: booking.customerInfo?.specialRequests || '',
        avatar: booking.userId?.avatar
      },
      
      // Tour Info
      tour: {
        id: booking.tourId?._id,
        name: booking.tourName || booking.tourId?.name || 'N/A',
        price: booking.tourId?.price,
        duration: booking.tourId?.duration,
        location: booking.tourId ? `${booking.tourId.city}, ${booking.tourId.country}` : 'N/A',
        image: booking.tourId?.image
      },
      
      // Hotel Info
      hotel: booking.hotelId ? {
        id: booking.hotelId._id,
        name: booking.hotelName || booking.hotelId.name,
        address: booking.hotelId.address,
        rating: booking.hotelId.rating
      } : null,
      
      // Dates
      dates: {
        departure: booking.departureDate,
        checkin: booking.checkinDate,
        checkout: booking.checkoutDate,
        booking: booking.createdAt,
        updated: booking.updatedAt
      },
      
      // Guests
      guests: {
        adults: booking.adults,
        children: booking.children,
        infants: booking.infants,
        total: (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
      },
      
      // Rooms
      rooms: booking.rooms,
      totalRooms: Object.values(booking.rooms || {}).reduce((sum, count) => sum + count, 0),
      
      // Services
      services: booking.services,
      
      // Pricing
      pricing: {
        tourBaseCost: booking.tourBaseCost,
        accommodationCost: booking.accommodationCost,
        servicesCost: booking.servicesCost,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paymentDetails?.paidAmount || 0,
        remainingAmount: booking.totalAmount - (booking.paymentDetails?.paidAmount || 0)
      },
      
      // Status
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      
      // Payment Details
      paymentDetails: {
        paidAmount: booking.paymentDetails?.paidAmount || 0,
        paidAt: booking.paymentDetails?.paidAt,
        paymentReference: booking.paymentDetails?.paymentReference,
        paymentNote: booking.paymentDetails?.paymentNote
      },
      
      // CMP Wallet (if used)
      cmpWalletPayment: booking.paymentMethod === 'cmp_wallet' ? booking.cmpWalletPayment : null,
      
      // Review
      hasReviewed: booking.hasReviewed,
      reviewId: booking.reviewId,
      
      // Admin
      adminNotes: booking.adminNotes,
      
      // Cancellation
      cancellation: booking.status === 'cancelled' ? {
        date: booking.cancellationDate,
        reason: booking.cancellationReason
      } : null,
      
      // Validation
      roomValidation: booking.roomValidation
    };

    res.json({
      success: true,
      data: detailedBooking
    });
  } catch (error) {
    console.error('Error fetching booking detail:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching booking detail',
      message: error.message 
    });
  }
});

// Update booking
router.put('/bookings/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow updating certain fields
    delete updates._id;
    delete updates.userId;
    delete updates.tourId;
    delete updates.createdAt;
    
    const booking = await Booking.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: booking,
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating booking',
      message: error.message 
    });
  }
});

// Update booking status
router.put('/bookings/:id/status', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const updateData = { status };
    
    // If cancelling, save cancellation info
    if (status === 'cancelled') {
      updateData.cancellationDate = new Date();
      updateData.cancellationReason = reason || 'Cancelled by admin';
    }
    
    const booking = await Booking.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: booking,
      message: `Booking status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating booking status',
      message: error.message 
    });
  }
});

// Update payment status
router.put('/bookings/:id/payment', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paidAmount, paymentReference, paymentNote } = req.body;
    
    if (!['unpaid', 'partial', 'paid', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status'
      });
    }
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Update payment info
    booking.paymentStatus = paymentStatus;
    
    if (paidAmount !== undefined) {
      booking.paymentDetails.paidAmount = paidAmount;
      booking.paymentDetails.paidAt = new Date();
    }
    
    if (paymentReference) {
      booking.paymentDetails.paymentReference = paymentReference;
    }
    
    if (paymentNote) {
      booking.paymentDetails.paymentNote = paymentNote;
    }
    
    await booking.save();
    
    res.json({
      success: true,
      data: booking,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating payment',
      message: error.message 
    });
  }
});

// Delete/Cancel booking
router.delete('/bookings/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Soft delete by setting status to cancelled
    const booking = await Booking.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'cancelled',
          cancellationDate: new Date(),
          cancellationReason: reason || 'Cancelled by admin'
        }
      },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error cancelling booking',
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

// ==================== USERS MANAGEMENT ====================

// Get all users with pagination, search, and filters
router.get('/users', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const verified = req.query.verified; // undefined, 'true', or 'false'
    const blocked = req.query.blocked; // undefined, 'true', or 'false'

    // Build query
    const query = {};
    
    // Search in username, email, fullName
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by verified status
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }

    // Filter by blocked status
    if (blocked !== undefined) {
      query.blocked = blocked === 'true';
    }

    // Get users
    const users = await User.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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

// Get users statistics
router.get('/users/stats', isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ verified: true });
    const blockedUsers = await User.countDocuments({ blocked: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        blockedUsers,
        newUsersThisMonth,
        activeUsers: totalUsers - blockedUsers
      }
    });
  } catch (error) {
    console.error('Error fetching users stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching users statistics',
      message: error.message 
    });
  }
});

// Get single user details
router.get('/users/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get user's booking count
    const bookingCount = await Booking.countDocuments({ userId: req.params.id });

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        bookingCount
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching user details',
      message: error.message 
    });
  }
});

// Update user details
router.put('/users/:id', isAdmin, async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      phone, 
      dateOfBirth, 
      gender, 
      address,
      verified,
      blocked
    } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (address !== undefined) updateData.address = address;
    if (verified !== undefined) updateData.verified = verified;
    if (blocked !== undefined) updateData.blocked = blocked;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
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

// Update user status (verify/block)
router.put('/users/:id/status', isAdmin, async (req, res) => {
  try {
    const { verified, blocked } = req.body;
    
    const updateData = {};
    if (verified !== undefined) updateData.verified = verified;
    if (blocked !== undefined) updateData.blocked = blocked;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
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
      message: 'User status updated successfully'
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating user status',
      message: error.message 
    });
  }
});

// Delete user (soft delete - block user)
router.delete('/users/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { blocked: true } },
      { new: true }
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
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error deleting user',
      message: error.message 
    });
  }
});

module.exports = router;
