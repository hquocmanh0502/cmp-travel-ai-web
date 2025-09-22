// backend/server.js
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

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes

// 1. Tours API
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
    const tour = await Tour.findOne({ id: req.params.id });
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json(tour);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tour' });
  }
});

// 2. Blogs API
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
    const blog = await Blog.findOne({ id: parseInt(req.params.id) });
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching blog' });
  }
});

// 3. Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
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

// 4. Feedback API
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

// 5. Chatbot API
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { sessionId, message, userId } = req.body;
    
    const botResponse = await chatbotService.processMessage(message, sessionId, userId);
    
    // Save conversation
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

// 6. AI Recommendations
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('viewHistory.tourId');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const recommendations = await recommendationService.generateRecommendations(user);
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: 'Error generating recommendations' });
  }
});

// 7. Track user views
app.post('/api/track/view', async (req, res) => {
  try {
    const { userId, tourId, duration } = req.body;
    
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          viewHistory: {
            tourId,
            duration,
            viewedAt: new Date()
          }
        }
      });
    }
    
    await Tour.findByIdAndUpdate(tourId, {
      $inc: { viewCount: 1 }
    });
    
    res.json({ message: 'View tracked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error tracking view' });
  }
});

// 8. Smart Search
app.get('/api/search/smart', async (req, res) => {
  try {
    const { q, userId } = req.query;
    
    const searchIntent = await recommendationService.analyzeSearchIntent(q);
    
    let tours = await Tour.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { country: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    });
    
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          searchHistory: {
            query: q,
            searchedAt: new Date()
          }
        }
      });
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

// 9. Contact API
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    console.log('Contact form submission:', { name, email, message });
    res.status(201).json({ message: 'Contact message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error sending contact message' });
  }
});

// 10. Booking API
app.post('/api/bookings', async (req, res) => {
  try {
    const { tourId, numberOfPeople, customerInfo, bookingDate } = req.body;
    
    res.status(201).json({ 
      message: 'Booking submitted successfully',
      bookingId: 'BOOK' + Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating booking' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});