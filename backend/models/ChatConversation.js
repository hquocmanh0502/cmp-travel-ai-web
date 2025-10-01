const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for anonymous
  
  messages: [{
    messageId: { type: String, required: true },
    sender: { type: String, enum: ['user', 'bot', 'admin'], required: true },
    
    content: {
      text: String,
      attachments: [String], // images, files
      quickReplies: [String], // suggested quick responses
      cards: [Object], // rich cards for tours, hotels
      buttons: [Object] // action buttons
    },
    
    // AI Processing
    nlp: {
      intent: String, // book_tour, ask_price, get_info, complaint
      entities: Object, // extracted entities (dates, places, numbers)
      confidence: Number,
      language: { type: String, default: 'vi' }
    },
    
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Conversation Context
  context: {
    currentTopic: String, // tour_inquiry, booking_process, complaint
    userIntent: String,
    conversationStage: String, // greeting, information_gathering, recommendation, closing
    extractedPreferences: {
      budget: Number,
      destination: String,
      duration: String,
      travelDates: Date,
      groupSize: Number,
      travelStyle: String
    },
    
    // Current conversation state
    currentTourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    currentStep: String, // booking_step_1, booking_step_2, etc
    formData: Object // temporary form data
  },
  
  // Human Handoff
  humanHandoff: {
    requested: { type: Boolean, default: false },
    requestedAt: Date,
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    reason: String, // complex_query, complaint, technical_issue
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' }
  },
  
  // Session Info
  sessionInfo: {
    startedAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    duration: Number, // seconds
    messageCount: { type: Number, default: 0 },
    
    // Technical details
    userAgent: String,
    ipAddress: String,
    device: String,
    referrer: String
  },
  
  // Satisfaction & Quality
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    resolvedIssue: { type: Boolean },
    feedbackAt: Date,
    
    // Detailed ratings
    botHelpfulness: { type: Number, min: 1, max: 5 },
    responseSpeed: { type: Number, min: 1, max: 5 },
    humanAgentRating: { type: Number, min: 1, max: 5 }
  },
  
  // Analytics
  analytics: {
    totalMessages: { type: Number, default: 0 },
    userMessages: { type: Number, default: 0 },
    botMessages: { type: Number, default: 0 },
    adminMessages: { type: Number, default: 0 },
    
    averageResponseTime: Number, // ms
    conversationFlow: [String], // track conversation path
    exitPoint: String, // where user left conversation
    
    successful: { type: Boolean }, // achieved user's goal
    escalated: { type: Boolean, default: false }
  },
  
  // Tags and Classification
  tags: [String], // booking, complaint, information, technical_support
  category: { type: String, enum: ['sales', 'support', 'information', 'complaint', 'technical'] },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'waiting', 'resolved', 'abandoned', 'escalated'], 
    default: 'active' 
  },
  
  // AI Insights
  aiInsights: {
    sentiment: String, // positive, negative, neutral
    urgency: Number, // 0-1 scale
    customerSatisfaction: Number, // predicted satisfaction
    upsellOpportunity: Boolean,
    riskOfChurn: Number // 0-1 scale
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
chatConversationSchema.index({ sessionId: 1 });
chatConversationSchema.index({ userId: 1 });
chatConversationSchema.index({ 'sessionInfo.lastActivity': 1 });
chatConversationSchema.index({ status: 1 });
chatConversationSchema.index({ 'humanHandoff.assignedAgent': 1 });

// Middleware
chatConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.sessionInfo.lastActivity = Date.now();
  this.analytics.totalMessages = this.messages.length;
  this.analytics.userMessages = this.messages.filter(m => m.sender === 'user').length;
  this.analytics.botMessages = this.messages.filter(m => m.sender === 'bot').length;
  this.analytics.adminMessages = this.messages.filter(m => m.sender === 'admin').length;
  next();
});

module.exports = mongoose.model('ChatConversation', chatConversationSchema);