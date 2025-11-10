// backend/routes/index.js
const express = require('express');
const router = express.Router();

const Tour = require('../models/Tour');
const Blog = require('../models/Blog');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const ChatConversation = require('../models/ChatConversation');
const Recommendation = require('../models/Recommendation');

const recommendationService = require('../services/recommendationService');
const sentimentService = require('../services/sentimentService');
const chatbotService = require('../services/chatbotService');

// Tours Routes
router.get('/tours', async (req, res) => {
  try {
    const tours = await Tour.find().populate('selectedHotels').populate('assignedGuide');
    res.json(tours);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tours' });
  }
});

router.get('/tours/:id', async (req, res) => {
  try {
    const tourId = req.params.id;
    
    // Try to find by MongoDB _id first (if it's a valid ObjectId)
    let tour = null;
    if (tourId.match(/^[0-9a-fA-F]{24}$/)) {
      tour = await Tour.findById(tourId).populate('selectedHotels').populate('assignedGuide');
    }
    
    // If not found, try to find by custom id field
    if (!tour) {
      tour = await Tour.findOne({ id: tourId }).populate('selectedHotels').populate('assignedGuide');
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

// User Authentication Routes
router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;
    
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = new User({
      username,
      email, 
      password,
      fullName,
      phone
    });
    
    await user.save();
    res.status(201).json({ 
      message: 'User created successfully',
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Simple password comparison (in production, use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      message: 'Login successful',
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// AI Recommendations
router.get('/recommendations/:userId', async (req, res) => {
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