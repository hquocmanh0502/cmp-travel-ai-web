require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Import models
const Tour = require('./models/Tour');
const Blog = require('./models/Blog');
const User = require('./models/User');
const Feedback = require('./models/Feedback');
const ChatConversation = require('./models/ChatConversation');

// Import services
const recommendationService = require('./services/recommendationService');
const sentimentService = require('./services/sentimentService');
const chatbotService = require('./services/chatbotService');

// Import routes
const bookingsRoutes = require('./routes/bookings');
const authRoutes = require('./routes/auth');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================
// Mount API Routes
// =============================================
app.use('/api/bookings', bookingsRoutes);
app.use('/api/auth', authRoutes);

// API Routes

// Tours API
app.get('/api/tours', async (req, res) => {
  try {
    const tours = await Tour.find();
    res.json(tours);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tours' });
  }
});

app.get('/api/tours/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let tour = null;
    
    // Try string id first
    tour = await Tour.findOne({ id: id });
    
    // Try number id
    if (!tour && !isNaN(id)) {
      tour = await Tour.findOne({ id: parseInt(id) });
    }
    
    // Try ObjectId
    if (!tour && id.match(/^[0-9a-fA-F]{24}$/)) {
      tour = await Tour.findById(id);
    }
    
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    
    res.json(tour);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tour details' });
  }
});

// Blogs API
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching blogs' });
  }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let blog;
    
    blog = await Blog.findOne({ id: id });
    
    if (!blog && !isNaN(id)) {
      blog = await Blog.findOne({ id: parseInt(id) });
    }
    
    if (!blog && id.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(id);
    }
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching blog' });
  }
});

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;
    
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Username, email, password, and fullName are required' });
    }
    
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

// Feedback API
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ isApproved: true }).sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching feedback' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, rating, feedback, tourId, userId } = req.body;
    
    if (!name || !email || !rating || !feedback) {
      return res.status(400).json({ error: 'Name, email, rating, and feedback are required' });
    }
    
    let sentimentResult, keywords, categories;
    
    try {
      sentimentResult = await sentimentService.analyzeSentiment(feedback);
      keywords = await sentimentService.extractKeywords(feedback);
      categories = await sentimentService.categorizeContent(feedback);
    } catch (serviceError) {
      sentimentResult = { score: 0, label: 'neutral', confidence: 0.5 };
      keywords = [];
      categories = ['general'];
    }
    
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

// Chatbot API
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { sessionId, message, userId } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'SessionId and message are required' });
    }
    
    let botResponse;
    try {
      botResponse = await chatbotService.processMessage(message, sessionId, userId);
    } catch (serviceError) {
      botResponse = {
        message: 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        intent: 'error',
        suggestions: ['Liên hệ hỗ trợ', 'Thử lại']
      };
    }
    
    let conversation = await ChatConversation.findOne({ sessionId });
    if (!conversation) {
      conversation = new ChatConversation({
        sessionId,
        user: userId,
        messages: []
      });
    }
    
    conversation.messages.push(
      { sender: 'user', message, timestamp: new Date() },
      { sender: 'bot', message: botResponse.message, timestamp: new Date() }
    );
    conversation.lastActivity = new Date();
    
    await conversation.save();
    res.json(botResponse);
  } catch (err) {
    res.status(500).json({ 
      error: 'Error processing message',
      fallbackResponse: {
        message: 'Xin lỗi, hệ thống chatbot đang bận. Vui lòng thử lại sau.',
        intent: 'system_error',
        suggestions: ['Thử lại', 'Liên hệ trực tiếp']
      }
    });
  }
});

// Recommendations API
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let recommendations;
    try {
      recommendations = await recommendationService.generatePersonalizedRecommendations(userId);
    } catch (serviceError) {
      const popularTours = await Tour.find().sort({ viewCount: -1, rating: -1 }).limit(5);
      recommendations = popularTours.map(tour => ({
        tour: tour,
        score: 0.7,
        reason: 'Popular tour',
        algorithm: 'fallback'
      }));
    }
    
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: 'Error generating recommendations' });
  }
});

// Tracking API
app.post('/api/track/view', async (req, res) => {
  try {
    const { userId, tourId, duration } = req.body;
    
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, {
          $push: {
            viewHistory: {
              tour: tourId,
              viewedAt: new Date(),
              duration: duration || 0
            }
          }
        });
      } catch (userError) {
        // Ignore user tracking errors
      }
    }
    
    try {
      await Tour.findOneAndUpdate(
        { $or: [{ id: tourId }, { _id: tourId }] },
        { $inc: { viewCount: 1 } }
      );
    } catch (tourError) {
      // Ignore tour tracking errors
    }
    
    res.json({ message: 'View tracked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error tracking view' });
  }
});

// Search API
app.get('/api/search/smart', async (req, res) => {
  try {
    const { q, userId } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ tours: [], searchIntent: {}, totalResults: 0 });
    }
    
    let searchIntent;
    try {
      searchIntent = await recommendationService.analyzeSearchIntent(q);
    } catch (serviceError) {
      searchIntent = { suggestedStyles: [], suggestedActivities: [], budgetHint: null };
    }
    
    let tours = await Tour.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { country: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { activity: { $in: [new RegExp(q, 'i')] } }
      ]
    });
    
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, {
          $push: {
            searchHistory: {
              query: q,
              searchedAt: new Date()
            }
          }
        });
      } catch (trackError) {
        // Ignore search tracking errors
      }
    }
    
    res.json({
      tours,
      searchIntent,
      totalResults: tours.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Error in smart search' });
  }
});

// Get available travel types - Giới hạn 5 types chính
app.get('/api/filters/travel-types', async (req, res) => {
  try {
    // Trả về chỉ 5 travel types tượng trưng
    const limitedTravelTypes = ['Adventure', 'Cultural', 'Relaxation', 'Luxury', 'Budget'];
    res.json(limitedTravelTypes);
  } catch (err) {
    console.error('Error fetching travel types:', err);
    // Fallback với cùng 5 options
    res.json(['Adventure', 'Cultural', 'Relaxation', 'Luxury', 'Budget']);
  }
});

// Get available durations
app.get('/api/filters/durations', async (req, res) => {
  try {
    // Get duration ranges based on tour data
    const tours = await Tour.find({}, 'estimatedCost').lean();
    
    // Simple duration categorization based on cost (you can customize this logic)
    const durations = ['3-5', '6-10', '11-15', '15+'];
    res.json(durations);
  } catch (err) {
    console.error('Error fetching durations:', err);
    res.json(['3-5', '6-10', '11-15', '15+']); // Fallback
  }
});

// Enhanced search suggestions with better formatting
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const tours = await Tour.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { country: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }).limit(8).select('name country id estimatedCost _id rating');
    
    const suggestions = tours.map(tour => ({
      id: tour.id || tour._id,
      name: tour.name,
      country: tour.country,
      estimatedCost: tour.estimatedCost,
      rating: tour.rating
    }));
    
    res.json(suggestions);
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ error: 'Error fetching suggestions' });
  }
});

// Search Suggestions API
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const tours = await Tour.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { country: { $regex: q, $options: 'i' } }
      ]
    }).limit(5).select('name country id estimatedCost');
    
    res.json(tours);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching suggestions' });
  }
});

// Contact API
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    
    res.status(201).json({ message: 'Contact message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error sending contact message' });
  }
});

// =============================================
// DEPRECATED: Old Booking API - Replaced by routes/bookings.js
// =============================================
/*
app.post('/api/bookings', async (req, res) => {
  try {
    const { tourId, numberOfPeople, customerInfo, bookingDate, totalAmount } = req.body;
    
    if (!tourId || !numberOfPeople || !customerInfo || !bookingDate) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }
    
    const bookingId = 'BOOK' + Date.now() + Math.random().toString(36).substr(2, 5);
    
    res.status(201).json({ 
      message: 'Booking submitted successfully',
      bookingId: bookingId,
      status: 'confirmed'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating booking' });
  }
});
*/

// Travel Types API
app.get('/api/tours/:id/travel-types', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tour = await Tour.findOne({ 
      $or: [{ id: id }, { _id: id }]
    });
    
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    
    const travelTypes = tour.activity || ['standard'];
    res.json({ travelTypes });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching travel types' });
  }
});

// Serve frontend files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Handle frontend routes (SPA routing)
app.get(/^(?!\/api).*/, (req, res) => {
  const filePath = path.join(__dirname, '../frontend', req.path);
  const fs = require('fs');
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});