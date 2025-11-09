const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');
const User = require('../models/User');
const { applyVIPDiscount, calculateVIPLevel } = require('../services/vipService');

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 verifyAuth - authHeader:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ verifyAuth - No valid auth header');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('🔑 verifyAuth - token:', token);
    
    // Extract userId from token (token is base64 encoded "userId:timestamp")
    let userId;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      console.log('🔓 verifyAuth - decoded token:', decoded);
      userId = decoded.split(':')[0]; // Extract userId before the colon
      console.log('👤 verifyAuth - extracted userId:', userId);
    } catch (error) {
      console.log('❌ verifyAuth - Failed to decode token:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token format' 
      });
    }
    
    if (!userId) {
      console.log('❌ verifyAuth - Invalid token');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    // Attach userId to request
    req.userId = userId;
    console.log('✅ verifyAuth - userId attached:', userId);
    
    next();
  } catch (error) {
    console.log('❌ verifyAuth - Error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Invalid authentication' 
    });
  }
};

// =============================================
// CREATE BOOKING
// =============================================
router.post('/', verifyAuth, async (req, res) => {
  try {
    const {
      userId,
      tourId,
      hotelId,
      selectedGuide,
      checkinDate,
      checkoutDate,
      departureDate,
      adults,
      children,
      infants,
      rooms,
      services,
      customerInfo,
      tourBaseCost,
      accommodationCost,
      servicesCost,
      totalAmount
    } = req.body;
    
    // Validate required fields
    if (!userId || !tourId || !checkinDate || !adults) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, tourId, checkinDate, adults'
      });
    }
    
    // Verify tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        error: 'Tour not found'
      });
    }
    
    // Verify hotel exists (if provided)
    let hotel = null;
    if (hotelId) {
      hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        return res.status(404).json({
          success: false,
          error: 'Hotel not found'
        });
      }
    }
    
    // Verify tour guide exists (if provided)
    let guide = null;
    if (selectedGuide) {
      const TourGuide = require('../models/TourGuide');
      guide = await TourGuide.findById(selectedGuide);
      if (!guide) {
        console.warn('⚠️ Tour guide not found:', selectedGuide);
        // Don't fail booking if guide not found, just proceed without guide
      }
    }
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Calculate VIP discount
    const originalAmount = parseFloat(totalAmount) || 0;
    const discountResult = applyVIPDiscount(originalAmount, user.membershipLevel || 'bronze');
    
    // Create booking with VIP discount
    const booking = new Booking({
      userId,
      tourId,
      tourName: tour.name, // ✅ Store tour name
      hotelId,
      hotelName: hotel ? hotel.name : 'No hotel selected', // ✅ Store hotel name
      selectedGuide: guide ? guide._id : null,
      guideName: guide ? guide.name : null, // ✅ Store guide name
      checkinDate: new Date(checkinDate),
      checkoutDate: new Date(checkoutDate || checkinDate),
      departureDate: new Date(departureDate || checkinDate),
      adults: parseInt(adults),
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
      rooms: rooms || {},
      services: services || {},
      customerInfo,
      tourBaseCost: parseFloat(tourBaseCost) || 0,
      accommodationCost: parseFloat(accommodationCost) || 0,
      servicesCost: parseFloat(servicesCost) || 0,
      vipDiscount: {
        membershipLevel: user.membershipLevel || 'bronze',
        discountPercentage: discountResult.discount,
        discountAmount: discountResult.discountAmount,
        originalAmount: discountResult.originalPrice
      },
      totalAmount: discountResult.finalPrice,
      status: 'pending',
      paymentStatus: 'unpaid'
    });
    
    // Validate room capacity (pre-save hook will handle this)
    const validation = booking.validateRoomCapacity();
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        validation
      });
    }
    
    // Save booking
    await booking.save();
    
    // Populate tour and hotel details
    await booking.populate('tourId', 'name country img rating estimatedCost duration pricing');
    if (hotelId) {
      await booking.populate('hotelId', 'name address rating');
    }
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      bookingId: booking.bookingId,
      booking: booking
    });
    
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error creating booking'
    });
  }
});

// =============================================
// GET USER'S BOOKINGS
// =============================================
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;
    
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const bookings = await Booking.find(query)
      .populate('tourId', 'name country description img rating estimatedCost duration pricing')
      .populate('hotelId', 'name address rating')
      .populate('selectedGuide', 'name email avatar rating experience languages specialties')
      .sort({ bookingDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // ✅ Check if user has reviewed each guide
    const GuideReview = require('../models/GuideReview');
    
    const bookingsWithReviewStatus = await Promise.all(
      bookings.map(async (booking) => {
        const bookingObj = booking.toObject();
        
        // Check if guide was reviewed
        if (bookingObj.selectedGuide) {
          const existingReview = await GuideReview.findOne({
            userId: userId,
            guideId: bookingObj.selectedGuide._id,
            bookingId: booking._id
          });
          bookingObj.hasReviewedGuide = !!existingReview;
        } else {
          bookingObj.hasReviewedGuide = false;
        }
        
        return bookingObj;
      })
    );
    
    const total = await Booking.countDocuments(query);
    
    res.json({
      success: true,
      bookings: bookingsWithReviewStatus,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching bookings'
    });
  }
});

// =============================================
// GET SINGLE BOOKING
// =============================================
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId)
      .populate('tourId')
      .populate('hotelId')
      .populate('userId', 'fullName email');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      booking
    });
    
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching booking'
    });
  }
});

// =============================================
// UPDATE BOOKING STATUS
// =============================================
router.patch('/:bookingId/status', verifyAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    booking.status = status;
    if (adminNotes) {
      booking.adminNotes = adminNotes;
    }
    
    if (status === 'cancelled') {
      booking.cancellationDate = new Date();
      booking.cancellationReason = req.body.cancellationReason || 'User requested';
    }
    
    await booking.save();
    
    res.json({
      success: true,
      message: 'Booking status updated',
      booking
    });
    
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating booking'
    });
  }
});

// =============================================
// CANCEL BOOKING
// =============================================
router.post('/:bookingId/cancel', verifyAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Booking already cancelled'
      });
    }
    
    booking.status = 'cancelled';
    booking.cancellationDate = new Date();
    booking.cancellationReason = reason || 'User requested cancellation';
    
    await booking.save();
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
    
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Error cancelling booking'
    });
  }
});

// =============================================
// VALIDATE ROOM CAPACITY (TEST ENDPOINT)
// =============================================
router.post('/validate-rooms', async (req, res) => {
  try {
    const { adults, children, infants, rooms } = req.body;
    
    // Create temporary booking for validation
    const tempBooking = new Booking({
      userId: '000000000000000000000000', // Dummy ID for validation
      tourId: '000000000000000000000000', // Dummy ID for validation
      checkinDate: new Date(),
      checkoutDate: new Date(),
      departureDate: new Date(),
      adults: parseInt(adults) || 0,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
      rooms: rooms || {},
      customerInfo: {
        fullName: 'Test',
        email: 'test@test.com',
        phone: '0000000000'
      },
      totalAmount: 0
    });
    
    const validation = tempBooking.validateRoomCapacity();
    
    res.json({
      success: true,
      validation
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// =============================================
// GET BOOKING STATISTICS
// =============================================
router.get('/stats/summary', async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    const pending = await Booking.countDocuments({ status: 'pending' });
    const confirmed = await Booking.countDocuments({ status: 'confirmed' });
    const cancelled = await Booking.countDocuments({ status: 'cancelled' });
    const completed = await Booking.countDocuments({ status: 'completed' });
    
    const totalRevenue = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        total,
        pending,
        confirmed,
        cancelled,
        completed,
        revenue: totalRevenue[0]?.total || 0
      }
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching statistics'
    });
  }
});

// =============================================
// PAY WITH WALLET
// =============================================
router.post('/:bookingId/pay-with-wallet', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Verify booking belongs to user
    if (booking.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: This booking does not belong to you'
      });
    }

    // Check if already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'This booking has already been paid'
      });
    }

    // Check booking status
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot pay for a cancelled booking'
      });
    }

    // Find user and check wallet balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const walletBalance = user.wallet?.balance || 0;
    const bookingAmount = booking.totalAmount;

    if (walletBalance < bookingAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient wallet balance',
        balance: walletBalance,
        required: bookingAmount,
        shortage: bookingAmount - walletBalance
      });
    }

    // Deduct from wallet
    user.wallet.balance -= bookingAmount;

    // Add transaction to wallet history
    user.wallet.transactions.push({
      type: 'payment',
      amount: bookingAmount,
      description: `Payment for booking: ${booking.tourName || 'Tour'}`,
      reference: bookingId,
      status: 'completed',
      date: new Date(),
      completedAt: new Date(),
      bookingDetails: {
        tourName: booking.tourName,
        checkinDate: booking.checkinDate,
        checkoutDate: booking.checkoutDate,
        adults: booking.adults,
        children: booking.children
      }
    });

    await user.save();

    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    if (!booking.paymentDetails) {
      booking.paymentDetails = {};
    }
    booking.paymentDetails.paidAt = new Date();
    booking.paymentDetails.paymentMethod = 'CMP Wallet';
    booking.paymentDetails.transactionId = user.wallet.transactions[user.wallet.transactions.length - 1]._id.toString();

    await booking.save();

    // Populate booking details
    await booking.populate('tourId', 'name country img rating estimatedCost duration');
    if (booking.hotelId) {
      await booking.populate('hotelId', 'name location rating pricePerNight');
    }

    res.json({
      success: true,
      message: 'Payment successful! Your booking is now confirmed.',
      booking,
      walletBalance: user.wallet.balance,
      amountPaid: bookingAmount
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error processing payment'
    });
  }
});

// POST /api/bookings/:bookingId/review-guide - Submit guide review
router.post('/:bookingId/review-guide', verifyAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, comment, detailedRatings } = req.body;
    const userId = req.userId;

    console.log('📝 Review guide request:', { bookingId, userId, rating, comment, detailedRatings });

    // Validate booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        error: 'Booking not found' 
      });
    }

    console.log('🔍 Ownership check:', {
      bookingUserId: booking.userId,
      bookingUserIdString: booking.userId.toString(),
      requestUserId: userId,
      match: booking.userId.toString() === userId.toString()
    });

    // Check if user owns this booking
    if (booking.userId.toString() !== userId.toString()) {
      console.log('❌ Ownership check failed');
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized - You do not own this booking' 
      });
    }

    console.log('✅ Ownership check passed');

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ 
        success: false,
        error: 'Can only review completed bookings' 
      });
    }

    // Check if guide was assigned
    if (!booking.selectedGuide) {
      return res.status(400).json({ 
        success: false,
        error: 'No tour guide assigned to this booking' 
      });
    }

    // Check if already reviewed
    const GuideReview = require('../models/GuideReview');
    const existingReview = await GuideReview.findOne({
      userId: userId,
      guideId: booking.selectedGuide,
      bookingId: bookingId
    });

    if (existingReview) {
      return res.status(400).json({ 
        success: false,
        error: 'You have already reviewed this tour guide' 
      });
    }

    // Create guide review
    const reviewData = {
      guideId: booking.selectedGuide,
      userId: userId,
      tourId: booking.tourId,
      bookingId: bookingId,
      rating: rating,
      comment: comment,
      status: 'approved', // Auto-approve user reviews
      isVerified: true // User completed the tour
    };

    // Add detailed ratings if provided
    if (detailedRatings && Object.keys(detailedRatings).length > 0) {
      reviewData.detailedRatings = detailedRatings;
    }

    const review = new GuideReview(reviewData);
    await review.save();

    console.log('✅ Guide review created:', review._id);

    // Update guide rating
    const TourGuide = require('../models/TourGuide');
    const guide = await TourGuide.findById(booking.selectedGuide);
    if (guide) {
      await guide.updateRating();
      console.log('✅ Guide rating updated');
    }

    res.json({
      success: true,
      message: 'Guide review submitted successfully',
      review: review
    });

  } catch (error) {
    console.error('❌ Error submitting guide review:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error submitting guide review'
    });
  }
});

module.exports = router;
