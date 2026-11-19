// backend/routes/admin.js
const express = require('express');
const router = express.Router();

const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');

const { recordSpend } = require('../services/vipService');
const { buildSeasonFactors, calendarMonth, calendarDay, round10 } = require('../services/seasonalPricing');
const { cancelAndRefund } = require('../services/refundService');
const Hotel = require('../models/Hotel');
const Feedback = require('../models/Feedback');
const Blog = require('../models/Blog');
const CMPWallet = require('../models/CMPWallet');

// Xác thực quản trị thật (JWT + kiểm tra role trong DB).
const { isAdmin } = require('../middleware/adminAuth');

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

    // Get top 5 VIP users by spending
    const topVIPUsers = await User.find()
      .select('username fullName avatar membershipLevel totalSpent totalBookings email')
      .sort({ totalSpent: -1 })
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

    // Get revenue by month (last 12 months) - use bookingDate instead of createdAt
    const twelveMonthsAgo = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
    const revenueByMonth = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          bookingDate: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$bookingDate' },
            month: { $month: '$bookingDate' }
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
        topVIPUsers: topVIPUsers.map(u => ({
          _id: u._id,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          avatar: u.avatar,
          membershipLevel: u.membershipLevel,
          totalSpent: u.totalSpent,
          totalBookings: u.totalBookings
        })),
        topTours: topTours.map(t => ({
          _id: t._id,
          name: t.tourDetails[0]?.name || 'Unknown',
          bookings: t.bookingCount,
          revenue: t.totalRevenue
        })),
        revenueByMonth: revenueByMonth.map(r => {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return {
            month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
            name: `${monthNames[r._id.month - 1]} ${r._id.year}`,
            revenue: r.revenue,
            bookings: r.bookings
          };
        })
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

// Get tours statistics
router.get('/tours/stats', isAdmin, async (req, res) => {
  try {
    const totalTours = await Tour.countDocuments();
    const activeTours = await Tour.countDocuments({ status: 'active' });
    const draftTours = await Tour.countDocuments({ status: 'draft' });
    const inactiveTours = await Tour.countDocuments({ status: 'inactive' });
    const featuredTours = await Tour.countDocuments({ featured: true });

    res.json({
      success: true,
      data: {
        totalTours,
        activeTours,
        draftTours,
        inactiveTours,
        featuredTours
      }
    });
  } catch (error) {
    console.error('Error fetching tours stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching tours statistics',
      message: error.message 
    });
  }
});

// Get all tours with filters and pagination
router.get('/tours', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type;
    const status = req.query.status;
    const featured = req.query.featured;
    const sortBy = req.query.sortBy;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    let tours;
    const total = await Tour.countDocuments(query);

    if (sortBy === 'revenue') {
      // Get all tours matching query first
      const allTours = await Tour.find(query).populate('assignedGuide', 'name email avatar rating experience');
      
      // Calculate revenue for all tours
      const toursWithRevenue = await Promise.all(
        allTours.map(async (tour) => {
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

      // Sort by revenue (highest first) and paginate
      const sortedTours = toursWithRevenue.sort((a, b) => b.revenue - a.revenue);
      tours = sortedTours.slice(skip, skip + limit);
    } else {
      // Regular pagination and sort
      const tourList = await Tour.find(query)
        .populate('assignedGuide', 'name email avatar rating experience')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get booking count for each tour
      tours = await Promise.all(
        tourList.map(async (tour) => {
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
    }

    res.json({
      success: true,
      data: tours,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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

// ---------------------------------------------------------------- so ngay + chuyen khoi hanh
//
// Web tinh tien theo Tour.availability[].price va ghep tour theo
// availability[].endDate (services/seasonalPricing, smartTourService). Hai so nay
// phai luon suy ra tu durationDays + pricing.adult + bestTimeToVisit bang CUNG
// cong thuc voi scripts/apply-duration-rule.js - neu khong, dashboard hien gia /
// so ngay moi ma web van thu gia / xep lich cu.

const DEPARTURE_DAY_MS = 864e5;

/** Ngay ket thuc + gia theo mua cua mot chuyen. */
function departureFields(tour, startDate) {
  const adult = tour.pricing?.adult || tour.estimatedCost || 0;
  const factor = buildSeasonFactors(tour)[calendarMonth(startDate)];
  return {
    endDate: new Date(new Date(startDate).getTime() + (tour.durationDays - 1) * DEPARTURE_DAY_MS),
    price: round10(adult * factor)
  };
}

/**
 * Danh lai kien thuc chatbot cho 1 tour sau khi admin luu (mo ta, lich trinh,
 * FAQ doi -> chatbot doc ban moi). Chay nen: khong lam cham / khong lam hong
 * viec luu tour neu OpenAI loi.
 */
function reindexTourForChat(tourId) {
  const { graph } = require('../chat/ingestion_graph/graph');
  const { hasApiKey } = require('../chat/shared/configuration');
  graph.invoke({ tourId: String(tourId), embed: hasApiKey(), stats: {} })
    .catch(err => console.error(`Chat reindex failed for tour ${tourId}:`, err.message));
}

/** Chuyen khoi hanh kem so ghe da dat (booking chua huy) - cho tab Departures. */
async function departuresView(tour) {
  const booked = await Booking.aggregate([
    { $match: { tourId: tour._id, status: { $ne: 'cancelled' }, departureId: { $ne: null } } },
    { $group: { _id: '$departureId', seats: { $sum: { $add: ['$adults', { $ifNull: ['$children', 0] }] } }, bookings: { $sum: 1 } } }
  ]);
  const byDep = new Map(booked.map(b => [String(b._id), b]));
  return (tour.availability || [])
    .map(a => ({
      _id: a._id,
      startDate: calendarDay(a.startDate),
      endDate: calendarDay(a.endDate),
      price: a.price,
      availableSlots: a.availableSlots || 0,
      bookedSeats: byDep.get(String(a._id))?.seats || 0,
      bookings: byDep.get(String(a._id))?.bookings || 0,
      hasGuide: !!a.guideId
    }))
    .sort((x, y) => x.startDate.localeCompare(y.startDate));
}

// Create new tour
router.post('/tours', isAdmin, async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.availability; // chuyen khoi hanh them o tab Departures sau khi tao
    const days = parseInt(body.durationDays, 10);
    if (!(days >= 1 && days <= 30)) {
      return res.status(400).json({ success: false, error: 'Duration must be 1-30 days' });
    }
    body.durationDays = days;
    body.duration = `${days} days`;
    const tour = new Tour(body);
    await tour.save();
    reindexTourForChat(tour._id);

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
    const current = await Tour.findById(req.params.id).lean();
    if (!current) {
      return res.status(404).json({
        success: false,
        error: 'Tour not found'
      });
    }

    const body = { ...req.body };
    delete body._id;
    delete body.availability; // sua chuyen khoi hanh qua /tours/:id/departures
    const days = body.durationDays != null ? parseInt(body.durationDays, 10) : current.durationDays;
    if (!(days >= 1 && days <= 30)) {
      return res.status(400).json({ success: false, error: 'Duration must be 1-30 days' });
    }
    if (days !== current.durationDays) {
      // Booking da giu ghe theo ngay ket thuc cu - doi so ngay se lech lich cua khach
      const active = await Booking.countDocuments({
        tourId: current._id, status: { $in: ['pending', 'confirmed'] }, departureDate: { $gte: new Date() }
      });
      if (active) {
        return res.status(409).json({
          success: false,
          error: `Cannot change duration: ${active} active booking(s) on upcoming departures. Cancel or complete them first.`
        });
      }
    }
    body.durationDays = days;
    body.duration = `${days} days`;

    // Gia / so ngay / thang dep doi -> tinh lai ngay ket thuc + gia tung chuyen
    const next = { ...current, ...body, pricing: { ...current.pricing, ...(body.pricing || {}) } };
    const pricingChanged = (next.pricing?.adult || next.estimatedCost) !== (current.pricing?.adult || current.estimatedCost)
      || JSON.stringify(next.bestTimeToVisit || []) !== JSON.stringify(current.bestTimeToVisit || []);
    if (days !== current.durationDays || pricingChanged) {
      body.availability = (current.availability || []).map(a => ({ ...a, ...departureFields(next, a.startDate) }));
    }

    const tour = await Tour.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true }
    );
    reindexTourForChat(tour._id);

    res.json({
      success: true,
      data: tour,
      message: body.availability
        ? `Tour updated. ${body.availability.length} departure(s) recalculated (end date / price).`
        : 'Tour updated successfully'
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

// Chuyen khoi hanh cua tour (kem so ghe da dat)
router.get('/tours/:id/departures', isAdmin, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id, { availability: 1, durationDays: 1 }).lean();
    if (!tour) return res.status(404).json({ success: false, error: 'Tour not found' });
    res.json({ success: true, durationDays: tour.durationDays, data: await departuresView(tour) });
  } catch (error) {
    console.error('Error listing departures:', error);
    res.status(500).json({ success: false, error: 'Error listing departures' });
  }
});

// Them chuyen: ngay ket thuc + gia theo mua do server tinh (cung cong thuc web)
router.post('/tours/:id/departures', isAdmin, async (req, res) => {
  try {
    const { startDate, slots } = req.body || {};
    const day = String(startDate || '');
    const seats = parseInt(slots, 10);
    const tomorrow = calendarDay(new Date(Date.now() + DEPARTURE_DAY_MS));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < tomorrow) {
      return res.status(400).json({ success: false, error: 'Start date must be a future date (YYYY-MM-DD)' });
    }
    if (!(seats >= 1 && seats <= 200)) {
      return res.status(400).json({ success: false, error: 'Seats must be 1-200' });
    }
    const tour = await Tour.findById(req.params.id).lean();
    if (!tour) return res.status(404).json({ success: false, error: 'Tour not found' });
    if (!tour.durationDays) return res.status(400).json({ success: false, error: 'Set the tour duration first' });
    if ((tour.availability || []).some(a => calendarDay(a.startDate) === day)) {
      return res.status(409).json({ success: false, error: `There is already a departure on ${day}` });
    }
    // Ngay luu 00:00 UTC (quy uoc ngay theo lich - models/Tour.js)
    const start = new Date(`${day}T00:00:00Z`);
    await Tour.updateOne({ _id: tour._id }, {
      $push: { availability: { startDate: start, availableSlots: seats, ...departureFields(tour, start) } }
    });
    const fresh = await Tour.findById(tour._id, { availability: 1 }).lean();
    res.status(201).json({ success: true, data: await departuresView(fresh) });
  } catch (error) {
    console.error('Error adding departure:', error);
    res.status(500).json({ success: false, error: 'Error adding departure' });
  }
});

// Sua so ghe CON TRONG cua mot chuyen
router.patch('/tours/:id/departures/:depId', isAdmin, async (req, res) => {
  try {
    const seats = parseInt(req.body?.availableSlots, 10);
    if (!(seats >= 0 && seats <= 200)) {
      return res.status(400).json({ success: false, error: 'Seats left must be 0-200' });
    }
    const result = await Tour.updateOne(
      { _id: req.params.id, 'availability._id': req.params.depId },
      { $set: { 'availability.$.availableSlots': seats } }
    );
    if (!result.matchedCount) return res.status(404).json({ success: false, error: 'Departure not found' });
    const fresh = await Tour.findById(req.params.id, { availability: 1 }).lean();
    res.json({ success: true, data: await departuresView(fresh) });
  } catch (error) {
    console.error('Error updating departure:', error);
    res.status(500).json({ success: false, error: 'Error updating departure' });
  }
});

// Xoa chuyen: chi khi khong con booking nao chua huy tren chuyen do
router.delete('/tours/:id/departures/:depId', isAdmin, async (req, res) => {
  try {
    const active = await Booking.countDocuments({ departureId: req.params.depId, status: { $ne: 'cancelled' } });
    if (active) {
      return res.status(409).json({
        success: false,
        error: `This departure has ${active} booking(s). Cancel them first (customers are refunded).`
      });
    }
    const result = await Tour.updateOne({ _id: req.params.id }, { $pull: { availability: { _id: req.params.depId } } });
    if (!result.modifiedCount) return res.status(404).json({ success: false, error: 'Departure not found' });
    const fresh = await Tour.findById(req.params.id, { availability: 1 }).lean();
    res.json({ success: true, data: await departuresView(fresh) });
  } catch (error) {
    console.error('Error deleting departure:', error);
    res.status(500).json({ success: false, error: 'Error deleting departure' });
  }
});

// Delete tour
router.delete('/tours/:id', isAdmin, async (req, res) => {
  try {
    // Con booking dang hoat dong -> khong xoa (booking se tro toi tour khong ton tai).
    // Muon an tour khoi web: dat status 'inactive'.
    const active = await Booking.countDocuments({ tourId: req.params.id, status: { $in: ['pending', 'confirmed'] } });
    if (active) {
      return res.status(409).json({
        success: false,
        error: `This tour has ${active} active booking(s). Set it to inactive instead, or cancel the bookings first.`
      });
    }
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
      // Chuyen ghep SmartTour: cac booking cung tripId
      tripId: booking.tripId || null,
      tripOrder: booking.tripOrder || null,
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
      .populate('selectedGuide', 'name email avatar rating experience')
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
      
      // Tour Guide Info
      guide: booking.selectedGuide ? {
        id: booking.selectedGuide._id,
        name: booking.guideName || booking.selectedGuide.name,
        email: booking.selectedGuide.email,
        avatar: booking.selectedGuide.avatar,
        rating: booking.selectedGuide.rating,
        experience: booking.selectedGuide.experience
      } : {
        name: booking.guideName || 'N/A'
      },
      
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
        // Chuyen ghep SmartTour: chang noi TOI tour nay da cong vao totalAmount
        connectionCost: booking.tripConnection?.mode
          ? (booking.tripConnection.transportCost || 0) + (booking.tripConnection.nightsCost || 0) : 0,
        vipDiscount: booking.vipDiscount?.discountAmount || 0,
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
      
      // Chuyen ghep SmartTour
      trip: booking.tripId ? {
        tripId: booking.tripId,
        order: booking.tripOrder,
        connection: booking.tripConnection?.mode ? booking.tripConnection : null
      } : null,

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
    // Chi cho sua thong tin lien he + ghi chu. Ngay, so khach, gia, trang thai
    // co luong rieng (giu/tra ghe, tinh gia o server, /status, /payment); sua
    // thang o day lam lech so ghe va booking tro sai chuyen khoi hanh.
    const updates = {};
    if (req.body.customerInfo) updates.customerInfo = req.body.customerInfo;
    if (req.body.adminNotes !== undefined) updates.adminNotes = req.body.adminNotes;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, error: 'Only customer info and admin notes can be edited' });
    }

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
    
    // Booking da huy da tra ghe (va co the da hoan tien): mo lai se ban qua cho
    const current = await Booking.findById(id).select('status').lean();
    if (current?.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'A cancelled booking cannot be reopened (its seats were released). Please create a new booking.'
      });
    }

    // Huy: tra ghe + hoan 100% vao vi neu da tra bang vi (services/refundService)
    let refund = null;
    if (status === 'cancelled') {
      refund = await cancelAndRefund(id, { byAdmin: true, reason });
    }
    // Da huy tu truoc (refund null) hoac trang thai khac: chi cap nhat status
    const booking = refund?.booking || await Booking.findByIdAndUpdate(
      id,
      { $set: { status } },
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
      refundAmount: refund?.refundAmount || 0,
      message: refund?.refundAmount
        ? `Booking cancelled, $${refund.refundAmount} refunded to the customer's wallet`
        : `Booking status updated to ${status}`
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
    
    const previousPaymentStatus = booking.paymentStatus;
    
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
    
    // Update user's totalSpent and VIP level if payment is now paid
    if (paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
      await recordSpend(booking.userId, booking.totalAmount, 1);
    }
    
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
    const { reason } = req.body || {};

    // Soft delete = huy: tra ghe + hoan 100% neu da tra bang vi
    const refund = await cancelAndRefund(id, { byAdmin: true, reason });
    const booking = refund?.booking || await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: refund?.refundAmount
        ? `Booking cancelled, $${refund.refundAmount} refunded to the customer's wallet`
        : 'Booking cancelled successfully',
      refundAmount: refund?.refundAmount || 0,
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
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

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

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Get users
    const users = await User.find(query)
      .select('-password') // Exclude password
      .sort(sortObj)
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
