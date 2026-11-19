const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');
const User = require('../models/User');
const { applyVIPDiscount, calculateVIPLevel, recordSpend } = require('../services/vipService');
const { cancelAndRefund } = require('../services/refundService');
const { calculateBookingPrice } = require('../services/pricingService');
const {
  seatsFor, findDeparture, upcomingDepartures, reserveSeats, releaseSeats
} = require('../services/departureService');
const { requireAuth, requireSelfOrAdmin } = require('../middleware/auth');
const { quoteTrip } = require('../services/smartTourService');
const crypto = require('crypto');

// Xác thực bằng JWT thật.
//
// Bản cũ chỉ base64-decode token rồi tin luôn userId nằm trong đó, nên bất kỳ ai
// cũng tự tạo được token cho tài khoản bất kỳ. Giờ chữ ký JWT được kiểm tra trước,
// req.userId chỉ là alias của req.user.id để phần còn lại của file không phải đổi.
const verifyAuth = (req, res, next) => {
  return requireAuth(req, res, () => {
    req.userId = req.user.id;
    next();
  });
};

// Chỉ chủ đơn đặt (hoặc admin) mới được xem/sửa/huỷ/thanh toán một booking.
const requireBookingOwner = async (req, res, next) => {
  return verifyAuth(req, res, async () => {
    try {
      const booking = await Booking.findById(req.params.bookingId).select('userId');

      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      if (req.user.role !== 'admin' && String(booking.userId) !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to manage this booking'
        });
      }

      next();
    } catch (err) {
      console.error('requireBookingOwner error:', err);
      return res.status(500).json({ success: false, error: 'Failed to verify access rights' });
    }
  });
};

// /user/:userId - chỉ chủ tài khoản hoặc admin.
router.param('userId', requireSelfOrAdmin('userId'));

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

    // Tour doan chi chay theo LICH KHOI HANH. Ngay khach gui phai trung mot chuyen
    // con trong tuong lai; ngay nhan/tra phong lay tu chuyen do, khong tin client.
    const seats = seatsFor({ adults, children });
    const departure = findDeparture(tour, departureDate || checkinDate);
    if (!departure || new Date(departure.startDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'There is no scheduled departure on this date. Please choose one of the available departures.',
        code: 'NO_DEPARTURE',
        upcomingDepartures: upcomingDepartures(tour, { seats })
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
    // Tinh lai toan bo gia o SERVER.
    //
    // Truoc day backend nhan thang totalAmount va accommodationCost do client gui,
    // nen chi can sua request la dat duoc tour gia 0 dong. Gio moi con so deu tinh
    // lai tu du lieu tour trong DB; so client gui len chi dung de doi chieu.
    const priced = calculateBookingPrice(tour, {
      adults, children, infants, hotelId, guide, servicesCost,
      // Gia theo mua cua chuyen - cung so voi /tours/:id/quote va SmartTour
      departureDate: departure.startDate
    });

    const clientTotal = parseFloat(totalAmount) || 0;
    if (clientTotal && Math.abs(clientTotal - priced.subtotal) > 1) {
      console.warn(`Gia client gui (${clientTotal}) lech gia server tinh (${priced.subtotal}) - dung gia server`);
    }

    const discountResult = applyVIPDiscount(priced.subtotal, user.membershipLevel || 'bronze');
    
    // Create booking with VIP discount
    const booking = new Booking({
      userId,
      tourId,
      tourName: tour.name, // ✅ Store tour name
      hotelId,
      hotelName: hotel ? hotel.name : 'No hotel selected', // ✅ Store hotel name
      selectedGuide: guide ? guide._id : null,
      guideName: guide ? guide.name : null, // ✅ Store guide name
      departureId: departure._id,
      // Suy ra tu chuyen: nhan phong ngay khoi hanh, tra phong ngay cuoi tour
      checkinDate: departure.startDate,
      checkoutDate: departure.endDate,
      departureDate: departure.startDate,
      adults: parseInt(adults),
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
      rooms: rooms || {},
      services: services || {},
      customerInfo,
      tourBaseCost: priced.tourBaseCost,
      accommodationCost: priced.accommodationCost,
      hotelTierLevel: priced.hotelTier ? priced.hotelTier.level : null,
      servicesCost: priced.servicesCost,
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
    
    // Giu cho TRUOC khi luu: tru nguyen tu, het cho thi dung lai.
    const reserved = await reserveSeats(tour._id, departure._id, seats);
    if (!reserved) {
      return res.status(409).json({
        success: false,
        error: 'Not enough seats left on this departure.',
        code: 'SOLD_OUT',
        upcomingDepartures: upcomingDepartures(tour, { seats })
      });
    }

    try {
      await booking.save();
    } catch (saveError) {
      // Luu that bai thi tra lai cho vua giu, neu khong cho se mat vinh vien
      await releaseSeats(tour._id, departure._id, seats);
      throw saveError;
    }
    
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
// CREATE TRIP BOOKING (SmartTour: 2-3 tour noi tiep)
// =============================================
// Body: { stops: [{ tourId, startDay }], adults, children, infants, rooms, customerInfo }
// Tao 1 booking / tour, chung tripId. Gia, ngay, chang noi deu tinh lai o server
// (quoteTrip). Giu cho TAT CA tour hoac khong tour nao.
router.post('/trip', verifyAuth, async (req, res) => {
  const reserved = [];
  const saved = [];
  try {
    const { stops, adults, children, infants, rooms, customerInfo, services } = req.body || {};
    if (!customerInfo?.fullName || !customerInfo?.email || !customerInfo?.phone) {
      return res.status(400).json({ success: false, error: 'Customer name, email and phone are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let trip;
    try {
      trip = await quoteTrip({ stops, adults, children, infants });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, error: err.message });
      throw err;
    }

    const tripId = crypto.randomUUID();
    const level = user.membershipLevel || 'bronze';
    const bookings = trip.stops.map((s, i) => {
      const conn = i ? trip.connections[i - 1] : null;
      const discount = applyVIPDiscount(s.quote.subtotal, level);
      return new Booking({
        userId: user._id,
        tourId: s.tour._id,
        tourName: s.tour.name,
        hotelId: s.tour.standardHotelId,
        hotelName: s.tour.standardHotel || 'Standard hotel',
        departureId: s.departure._id,
        checkinDate: s.departure.startDate,
        checkoutDate: s.departure.endDate,
        departureDate: s.departure.startDate,
        adults: parseInt(adults),
        children: parseInt(children) || 0,
        infants: parseInt(infants) || 0,
        rooms: rooms || {},
        services: services || {},
        customerInfo,
        tourBaseCost: s.quote.tourBaseCost,
        accommodationCost: s.quote.accommodationCost,
        servicesCost: 0,
        vipDiscount: {
          membershipLevel: level,
          discountPercentage: discount.discount,
          discountAmount: discount.discountAmount,
          originalAmount: discount.originalPrice
        },
        // Giam gia VIP chi tren gia tour; chang noi la chi phi van chuyen/luu tru
        totalAmount: discount.finalPrice + (conn ? conn.cost : 0),
        tripId,
        tripOrder: i + 1,
        tripConnection: conn ? {
          fromTour: conn.from, mode: conn.mode,
          leaveDay: conn.leaveDay, leaveAt: conn.leaveAt,
          arriveDay: conn.arriveDay, arriveAt: conn.arriveAt,
          connectionNights: conn.connectionNights,
          transportCost: conn.transportCost, nightsCost: conn.nightsCost
        } : undefined,
        status: 'pending',
        paymentStatus: 'unpaid'
      });
    });

    const roomCheck = bookings[0].validateRoomCapacity();
    if (!roomCheck.isValid) {
      return res.status(400).json({ success: false, error: roomCheck.error, validation: roomCheck });
    }

    const seats = seatsFor({ adults, children });
    for (const b of bookings) {
      if (!(await reserveSeats(b.tourId, b.departureId, seats))) {
        return res.status(409).json({
          success: false,
          error: `Not enough seats left on ${b.tourName} (${b.departureDate.toISOString().slice(0, 10)}). Please plan again.`,
          code: 'SOLD_OUT'
        });
      }
      reserved.push(b);
    }

    for (const b of bookings) saved.push(await b.save());
    reserved.length = 0; // da luu het -> khong tra cho nua

    res.status(201).json({
      success: true,
      message: 'Trip booked successfully',
      tripId,
      bookingIds: saved.map(b => b.bookingId),
      totalAmount: saved.reduce((s, b) => s + b.totalAmount, 0),
      bookings: saved
    });
  } catch (error) {
    console.error('Trip booking error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error creating trip booking' });
  } finally {
    // Loi giua chung (het cho o tour sau, luu that bai): tra cho + xoa booking
    // da luu, de khong co chuyen "nua voi" giu cho
    if (reserved.length) {
      await Promise.all(reserved.map(b => releaseSeats(b.tourId, b.departureId, seatsFor(b)))).catch(console.error);
      await Booking.deleteMany({ _id: { $in: saved.map(b => b._id) } }).catch(console.error);
    }
  }
});

// =============================================
// PAY TRIP WITH WALLET - tru vi 1 lan cho moi booking chua tra cua chuyen
// =============================================
router.post('/trip/:tripId/pay-with-wallet', verifyAuth, async (req, res) => {
  try {
    const due = await Booking.find({
      tripId: req.params.tripId,
      userId: req.userId,
      status: { $ne: 'cancelled' },
      paymentStatus: { $ne: 'paid' }
    }).sort({ tripOrder: 1 });
    if (!due.length) {
      return res.status(400).json({ success: false, error: 'Nothing left to pay on this trip' });
    }

    const amount = due.reduce((s, b) => s + b.totalAmount, 0);
    const names = due.map(b => b.tourName).join(' + ');
    const payResult = await User.updateOne(
      { _id: req.userId, 'wallet.balance': { $gte: amount } },
      {
        $inc: { 'wallet.balance': -amount },
        $push: {
          'wallet.transactions': {
            type: 'payment',
            amount,
            description: `Payment for trip: ${names}`,
            reference: req.params.tripId,
            status: 'completed',
            date: new Date(),
            completedAt: new Date()
          }
        }
      }
    );
    if (payResult.modifiedCount === 0) {
      const user = await User.findById(req.userId, 'wallet.balance').lean();
      const balance = user?.wallet?.balance || 0;
      return res.status(400).json({
        success: false, error: 'Insufficient wallet balance',
        balance, required: amount, shortage: amount - balance
      });
    }

    const fresh = await User.findById(req.userId, { 'wallet.balance': 1, 'wallet.transactions': { $slice: -1 } }).lean();
    const paidAt = new Date();
    // Tung booking: paidAmount = phan cua no; chung 1 giao dich vi
    await Booking.bulkWrite(due.map(b => ({
      updateOne: {
        filter: { _id: b._id },
        update: {
          $set: {
            paymentStatus: 'paid',
            status: 'confirmed',
            paymentMethod: 'cmp_wallet',
            'paymentDetails.paidAmount': b.totalAmount,
            'paymentDetails.paidAt': paidAt,
            cmpWalletPayment: {
              transactionId: String(fresh.wallet.transactions[0]._id),
              transactionDate: paidAt,
              amountDeducted: b.totalAmount,
              walletBalanceAfter: fresh.wallet.balance,
              paymentConfirmed: true
            }
          }
        }
      }
    })));
    await recordSpend(req.userId, amount, due.length);

    res.json({
      success: true,
      message: 'Payment successful! Your trip is now confirmed.',
      tripId: req.params.tripId,
      paidBookings: due.length,
      amountPaid: amount,
      walletBalance: fresh.wallet.balance
    });
  } catch (error) {
    console.error('Trip payment error:', error);
    res.status(500).json({ success: false, error: error.message || 'Error processing payment' });
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
router.get('/:bookingId', requireBookingOwner, async (req, res) => {
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
router.patch('/:bookingId/status', requireBookingOwner, async (req, res) => {
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

    // Chu booking chi duoc tu HUY (cung luat hoan tien voi /cancel). Truoc day
    // khach tu dat duoc 'confirmed'/'completed' cho booking chua tra tien.
    if (req.user.role !== 'admin') {
      if (status !== 'cancelled') {
        return res.status(403).json({ success: false, error: 'You can only cancel your booking' });
      }
      const result = await cancelAndRefund(booking._id, { reason: req.body.cancellationReason });
      if (!result) return res.status(400).json({ success: false, error: 'Booking already cancelled' });
      return res.json({ success: true, message: 'Booking status updated', ...result });
    }

    // Admin: cung luat voi /api/admin/bookings/:id/status
    if (booking.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({ success: false, error: 'A cancelled booking cannot be reopened' });
    }
    if (status === 'cancelled') {
      await cancelAndRefund(booking._id, { byAdmin: true, reason: req.body.cancellationReason });
    }
    await Booking.updateOne({ _id: booking._id }, { $set: { status, ...(adminNotes ? { adminNotes } : {}) } });
    booking.status = status;
    
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
router.post('/:bookingId/cancel', requireBookingOwner, async (req, res) => {
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
    
    // Huy + tra ghe + hoan tien theo so ngay truoc khoi hanh (services/refundService)
    const result = await cancelAndRefund(booking._id, { reason });
    if (!result) {
      return res.status(400).json({
        success: false,
        error: 'Booking already cancelled'
      });
    }

    res.json({
      success: true,
      message: result.refundAmount
        ? `Booking cancelled. $${result.refundAmount.toLocaleString('en-US')} (${Math.round(result.refundRate * 100)}%) refunded to your wallet.`
        : 'Booking cancelled successfully',
      refundAmount: result.refundAmount,
      refundRate: result.refundRate,
      booking: result.booking
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
router.post('/:bookingId/pay-with-wallet', requireBookingOwner, async (req, res) => {
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

    // Tour thuoc chuyen SmartTour: tra mot lan ca chuyen
    if (booking.tripId) {
      return res.status(400).json({
        success: false,
        error: 'This tour is part of a trip. Please pay for the whole trip.',
        code: 'PAY_TRIP',
        tripId: booking.tripId
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

    // Tru tien nguyen tu, kem dieu kien so du van du.
    //
    // Truoc day la kiem tra so du roi moi tru trong buoc rieng, nen hai request
    // thanh toan dong thoi deu vuot qua buoc kiem tra va tai khoan bi am tien.
    const payResult = await User.updateOne(
      { _id: user._id, 'wallet.balance': { $gte: bookingAmount } },
      {
        $inc: { 'wallet.balance': -bookingAmount },
        $push: {
          'wallet.transactions': {
            type: 'payment',
            amount: bookingAmount,
            description: `Payment for booking: ${booking.tourName || 'Tour'}`,
            reference: bookingId,
            status: 'completed',
            date: new Date(),
            completedAt: new Date()
          }
        }
      }
    );

    if (payResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient wallet balance'
      });
    }

    // Doc lai SAU khi tru: so du moi + giao dich vua them (truoc day lay giao
    // dich cuoi tu ban user cu -> transactionId tro nham giao dich truoc do)
    const freshUser = await User.findById(user._id, { 'wallet.balance': 1, 'wallet.transactions': { $slice: -1 } }).lean();
    user.wallet.balance = freshUser.wallet.balance;

    // Update booking payment status. paymentMethod la truong o goc schema
    // (paymentDetails.paymentMethod khong co trong schema -> bi bo im lang)
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.paymentMethod = 'cmp_wallet';
    booking.paymentDetails = { ...(booking.paymentDetails?.toObject?.() || {}), paidAmount: bookingAmount, paidAt: new Date() };
    booking.cmpWalletPayment = {
      transactionId: String(freshUser.wallet.transactions[0]._id),
      transactionDate: new Date(),
      amountDeducted: bookingAmount,
      walletBalanceBefore: walletBalance,
      walletBalanceAfter: freshUser.wallet.balance,
      paymentConfirmed: true
    };

    await booking.save();
    await recordSpend(user._id, bookingAmount, 1);

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
router.post('/:bookingId/review-guide', requireBookingOwner, async (req, res) => {
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
