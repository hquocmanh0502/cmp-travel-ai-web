const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Content
  content: {
    text: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    images: [String],
    videos: [String],
    
    // Chi tiết rating
    detailedRating: {
      guide: { type: Number, min: 1, max: 5 },
      accommodation: { type: Number, min: 1, max: 5 },
      transportation: { type: Number, min: 1, max: 5 },
      food: { type: Number, min: 1, max: 5 },
      activities: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 }
    }
  },
  
  // Verification - chỉ người đã book tour mới comment được
  verified: {
    isVerified: { type: Boolean, default: false },
    bookingId: String, // proof of purchase
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Interaction
  reactions: {
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    loves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  
  // Nested replies system
  replies: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    timestamp: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false },
    adminRole: String, // customer_service, tour_guide, manager
    adminName: String, // Display name for admin (e.g., 'CMP Travel')
    
    // Reply moderation status
    moderation: {
      processed: { type: Boolean, default: false },
      classificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReplyClassification' },
      status: { type: String, enum: ['pending', 'approved', 'rejected', 'auto-approved', 'auto-rejected'], default: 'pending' },
      isSpam: { type: Boolean, default: false },
      confidence: { type: Number, min: 0, max: 1, default: 0 },
      requiresReview: { type: Boolean, default: false }
    },
    
    reactions: {
      likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }
  }],
  
  // AI Analysis
  aiAnalysis: {
    sentiment: {
      score: Number, // -1 to 1
      label: { type: String, enum: ['positive', 'negative', 'neutral'] },
      confidence: Number
    },
    keywords: [String],
    categories: [String], // service, location, food, guide, accommodation
    emotions: [String], // happy, disappointed, excited, angry
    language: String,
    toxicity: Number, // 0-1 scale
    
    // Aspect-based sentiment
    aspectSentiments: {
      guide: Number,
      accommodation: Number,
      food: Number,
      activities: Number,
      transportation: Number
    }
  },
  
  // Trip details
  tripDetails: {
    travelDate: Date,
    groupSize: Number,
    travelCompanions: { type: String, enum: ['solo', 'couple', 'family', 'friends', 'business'] }
  },
  
  timestamps: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    moderatedAt: Date
  },
  
  // Content moderation
  moderation: {
    status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'pending' },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    autoModerated: { type: Boolean, default: false }
  },
  
  // Visibility
  isPublic: { type: Boolean, default: true },
  featured: { type: Boolean, default: false }, // highlight exceptional reviews
  
  // Reports
  reports: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: ['spam', 'inappropriate', 'offensive', 'fake', 'other'], required: true },
    description: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date
  }],
  
  // Analytics
  analytics: {
    helpfulCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 }
  }
});

// Indexes
commentSchema.index({ tourId: 1, 'timestamps.createdAt': -1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ 'content.rating': -1 });
commentSchema.index({ 'aiAnalysis.sentiment.label': 1 });
commentSchema.index({ 'moderation.status': 1 });

// Middleware
commentSchema.pre('save', function(next) {
  this.timestamps.updatedAt = Date.now();
  next();
});

// Calculate helpful count and report count
commentSchema.pre('save', function(next) {
  this.analytics.helpfulCount = this.reactions.helpful.length;
  this.analytics.reportCount = this.reports.length;
  next();
});

module.exports = mongoose.model('Comment', commentSchema);