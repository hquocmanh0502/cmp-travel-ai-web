// backend/routes/index.js
const express = require('express');
const router = express.Router();

const Tour = require('../models/Tour');
const Blog = require('../models/Blog');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const ChatConversation = require('../models/ChatConversation');
const Recommendation = require('../models/Recommendation');

const recommendationService = require('../services/recommendationService');
const sentimentService = require('../services/sentimentService');
const chatbotService = require('../services/chatbotService');
const matchingService = require('../services/matchingService');
const compareService = require('../services/compareService');
const { calculateBookingPrice } = require('../services/pricingService');
const { requireSelfOrAdmin, optionalAuth } = require('../middleware/auth');

// Public social proof: avatars of the most recent customers who booked (no PII besides avatar/initials)
router.get('/social-proof/recent-bookers', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 10);
    const bookings = await Booking.find({ status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(200)
      .select('userId')
      .populate('userId', 'fullName avatar blocked');

    const seen = new Set();
    const bookers = [];
    for (const b of bookings) {
      const u = b.userId;
      if (!u || u.blocked || seen.has(String(u._id))) continue;
      seen.add(String(u._id));
      const initials = (u.fullName || 'U').split(/\s+/).filter(Boolean)
        .slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';
      bookers.push({
        // Avatars may be stored as base64 data URIs, so serve them via a cacheable image endpoint
        avatar: u.avatar
          ? `/api/social-proof/avatar/${u._id}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=DF6951&color=fff&size=64`
      });
      if (bookers.length >= limit) break;
    }

    res.json({ success: true, bookers });
  } catch (err) {
    res.status(500).json({ success: false, bookers: [] });
  }
});

router.get('/social-proof/avatar/:userId', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.userId)) return res.status(404).end();
    const user = await User.findById(req.params.userId).select('avatar blocked');
    if (!user || user.blocked || !user.avatar) return res.status(404).end();

    const match = user.avatar.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
    if (match) {
      res.set({ 'Content-Type': match[1], 'Cache-Control': 'public, max-age=3600' });
      return res.send(Buffer.from(match[2], 'base64'));
    }
    if (/^(https?:\/\/|\/)/.test(user.avatar) && !user.avatar.startsWith('//')) {
      return res.redirect(user.avatar);
    }
    res.status(404).end();
  } catch (err) {
    res.status(500).end();
  }
});

// Tours Routes
router.get('/tours', async (req, res) => {
  try {
    const tours = await Tour.find().populate('selectedHotels').populate('assignedGuide');
    res.json(tours);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tours' });
  }
});

// So sanh 2-4 tour. PHAI khai bao TRUOC /tours/:id, neu khong Express se coi
// 'compare' la mot id tour.
//
// optionalAuth: khong bat buoc dang nhap, nhung neu co thi tinh them muc phu hop
// voi so thich cua chinh nguoi do.
router.get('/tours/compare', optionalAuth, async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);

    if (ids.length < 2) {
      return res.status(400).json({ success: false, error: 'Can it nhat 2 tour de so sanh' });
    }

    const valid = ids.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    if (valid.length < 2) {
      return res.status(400).json({ success: false, error: 'Danh sach id khong hop le' });
    }

    const result = await compareService.buildComparison(valid, req.user?.id || null);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error building comparison:', err);
    res.status(500).json({ success: false, error: 'Error building comparison' });
  }
});

// Tour noi bat cho cac the o trang chu va trang gioi thieu.
// Cung phai dung truoc /tours/:id. Chi tra ve dung truong the can cho nhe.
router.get('/tours/featured', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 3, 24);
    const sort = req.query.sort === 'rating'
      ? { rating: -1, 'analytics.bookingCount': -1 }
      : { 'analytics.bookingCount': -1, rating: -1 };

    const tours = await Tour.find({ status: 'active' })
      .select('id name country img rating estimatedCost pricing duration description themes analytics.bookingCount')
      .sort(sort)
      .limit(limit)
      .lean();

    res.json({ success: true, count: tours.length, tours });
  } catch (err) {
    console.error('Error fetching featured tours:', err);
    res.status(500).json({ success: false, error: 'Error fetching featured tours' });
  }
});

router.get('/tours/:id', async (req, res) => {
  try {
    const tourId = req.params.id;
    
    // Try to find by MongoDB _id first (if it's a valid ObjectId)
    let tour = null;
    if (tourId.match(/^[0-9a-fA-F]{24}$/)) {
      tour = await Tour.findById(tourId).populate('selectedHotels').populate('assignedGuide').populate('itinerary.accommodation', 'name location.city details.starRating details.priceRange');
    }
    
    // If not found, try to find by custom id field
    if (!tour) {
      tour = await Tour.findOne({ id: tourId }).populate('selectedHotels').populate('assignedGuide').populate('itinerary.accommodation', 'name location.city details.starRating details.priceRange');
    }
    
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    
    res.json(tour);
  } catch (err) {
    console.error('Error fetching tour:', err);
    res.status(500).json({ error: 'Error fetching tour' });
  }
});


// Tour tương tự ("You might also like") - xem services/matchingService.js
router.get('/tours/:id/related', async (req, res) => {
  try {
    const { limit, strategy } = req.query;
    const result = await matchingService.getRelatedTours(req.params.id, {
      limit: Math.min(parseInt(limit) || 3, 12),
      strategy: strategy || 'content'
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching related tours:', err);
    res.status(500).json({ error: 'Error fetching related tours' });
  }
});

// Hướng dẫn viên phù hợp với một tour, có kèm lý do để chatbot giải thích được
router.get('/tours/:id/suggested-guides', async (req, res) => {
  try {
    const { limit, language, departureDate } = req.query;
    const result = await matchingService.getSuggestedGuides(req.params.id, {
      limit: Math.min(parseInt(limit) || 5, 20),
      preferredLanguage: language,
      departureDate
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching suggested guides:', err);
    res.status(500).json({ error: 'Error fetching suggested guides' });
  }
});

// Bao gia mot tour theo so khach va hang khach san.
// Frontend goi endpoint nay thay vi tu tinh, de gia tren man hinh luon khop
// voi gia server tinh luc dat tour.
router.get('/tours/:id/quote', async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id).lean();
    if (!tour) return res.status(404).json({ error: 'Tour not found' });

    const quote = calculateBookingPrice(tour, {
      adults: req.query.adults,
      children: req.query.children,
      infants: req.query.infants,
      hotelId: req.query.hotelId
    });

    res.json({ tourId: tour._id, currency: 'USD', ...quote });
  } catch (err) {
    console.error('Error building quote:', err);
    res.status(500).json({ error: 'Error building quote' });
  }
});

// Blogs Routes - Public endpoint chỉ trả về published blogs
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' })
      .sort({ publishedDate: -1 })
      .select('-__v');
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching blogs' });
  }
});

router.get('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    // Tăng views khi xem blog
    blog.views = (blog.views || 0) + 1;
    await blog.save();
    
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching blog' });
  }
});

// User Authentication Routes: xem routes/auth.js.
// Hai handler trùng ở đây đã bị xoá - chúng so sánh mật khẩu plaintext.

// AI Recommendations
router.get('/recommendations/:userId', requireSelfOrAdmin(), async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🎯 Fetching recommendations for userId:', userId);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found:', user.username);
    console.log('📋 User preferences:', user.preferences);
    
    // Generate recommendations (pass userId, not user object)
    const recommendations = await recommendationService.generateRecommendations(userId);
    
    console.log(`✅ Returning ${recommendations.length} recommendations`);
    
    res.json({ 
      success: true,
      recommendations: recommendations 
    });
  } catch (err) {
    console.error('❌ Error in recommendations route:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error generating recommendations',
      details: err.message 
    });
  }
});

// Track page view for recommendations
router.post('/track/page-view', async (req, res) => {
  try {
    const { userId, tourId, page } = req.body;
    
    console.log('📊 Tracking page view:', { userId, tourId, page });
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Update user's view history
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize viewHistory if not exists
    if (!user.viewHistory) {
      user.viewHistory = [];
    }
    
    // Add page view to history
    if (tourId) {
      // Check if tour already in history
      const existingIndex = user.viewHistory.findIndex(
        item => item.tourId && item.tourId.toString() === tourId
      );
      
      if (existingIndex >= 0) {
        // Update existing entry
        user.viewHistory[existingIndex].viewCount += 1;
        user.viewHistory[existingIndex].lastViewedAt = new Date();
      } else {
        // Add new entry
        user.viewHistory.push({
          tourId: tourId,
          viewCount: 1,
          lastViewedAt: new Date()
        });
      }
    }
    
    // Update last activity
    user.lastActivity = new Date();
    
    await user.save();
    
    console.log('✅ Page view tracked successfully');
    
    res.json({ 
      success: true,
      message: 'Page view tracked'
    });
    
  } catch (err) {
    console.error('❌ Error tracking page view:', err);
    res.status(500).json({ 
      error: 'Error tracking page view',
      details: err.message 
    });
  }
});

// Feedback with AI Analysis
router.post('/feedback', async (req, res) => {
  try {
    const { name, email, rating, feedback, tourId, userId } = req.body;
    
    const sentimentResult = await sentimentService.analyzeSentiment(feedback);
    const keywords = await sentimentService.extractKeywords(feedback);
    const categories = await sentimentService.categorizeContent(feedback);
    
    const newFeedback = new Feedback({
      user: userId,
      tour: tourId,
      name,
      email,
      rating,
      feedback,
      sentiment: sentimentResult,
      keywords,
      categories,
      isApproved: true
    });
    
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error submitting feedback' });
  }
});

// Chatbot
router.post('/chatbot/message', async (req, res) => {
  try {
    const { sessionId, message, userId } = req.body;
    
    const botResponse = await chatbotService.processMessage(message, sessionId, userId);
    
    let conversation = await ChatConversation.findOne({ sessionId });
    if (!conversation) {
      conversation = new ChatConversation({
        sessionId,
        user: userId,
        messages: []
      });
    }
    
    conversation.messages.push(
      { sender: 'user', message },
      { sender: 'bot', message: botResponse.message, intent: botResponse.intent }
    );
    conversation.lastActivity = new Date();
    
    await conversation.save();
    res.json(botResponse);
  } catch (err) {
    res.status(500).json({ error: 'Error processing message' });
  }
});

// Contact form
router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    // Here you could save to database or send email
    console.log('Contact form submission:', { name, email, message });
    res.status(201).json({ message: 'Contact message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error sending contact message' });
  }
});

// Booking
router.post('/bookings', async (req, res) => {
  try {
    const { 
      tourId, 
      numberOfPeople, 
      customerInfo, 
      bookingDate,
      totalAmount 
    } = req.body;
    
    // Here you would create a booking record
    // For now, just return success
    res.status(201).json({ 
      message: 'Booking submitted successfully',
      bookingId: 'BOOK' + Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating booking' });
  }
});

module.exports = router;