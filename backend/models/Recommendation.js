const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  recommendations: [{
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
    score: { type: Number, required: true, min: 0, max: 1 },
    
    reasoning: {
      algorithm: { 
        type: String, 
        enum: ['collaborative_filtering', 'content_based', 'hybrid', 'deep_learning', 'popularity_based'],
        required: true 
      },
      factors: [String], // similar_users_liked, matches_preferences, trending, budget_friendly
      explanation: String, // human readable explanation
      
      // Detailed scoring
      scoringDetails: {
        preferenceMatch: Number, // 0-1
        behaviorMatch: Number, // 0-1
        popularityBoost: Number, // 0-1
        diversityScore: Number, // 0-1
        noveltyScore: Number // 0-1
      }
    },
    
    metadata: {
      category: { 
        type: String, 
        enum: ['trending', 'similar_to_viewed', 'budget_friendly', 'luxury', 'adventure', 'cultural', 'family_friendly'] 
      },
      confidence: { type: Number, min: 0, max: 1 },
      generatedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) } // 7 days
    }
  }],
  
  // Performance tracking
  performance: {
    clickedRecommendations: [{
      recommendationId: mongoose.Schema.Types.ObjectId,
      tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
      clickedAt: { type: Date, default: Date.now },
      position: Number // position in recommendation list
    }],
    
    bookedFromRecommendations: [{
      recommendationId: mongoose.Schema.Types.ObjectId,
      tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
      bookedAt: { type: Date, default: Date.now },
      bookingValue: Number
    }],
    
    userFeedback: [{ // explicit feedback (thumb up/down)
      recommendationId: mongoose.Schema.Types.ObjectId,
      tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
      feedback: { type: String, enum: ['positive', 'negative'] },
      reason: String, // not_interested, already_visited, too_expensive
      feedbackAt: { type: Date, default: Date.now }
    }]
  },
  
  // Metrics
  metrics: {
    totalRecommendations: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  },
  
  lastUpdated: { type: Date, default: Date.now },
  version: { type: String, default: '1.0' }, // for A/B testing different algorithms
  
  // Configuration
  settings: {
    maxRecommendations: { type: Number, default: 10 },
    diversityFactor: { type: Number, default: 0.3 },
    noveltyFactor: { type: Number, default: 0.2 },
    excludeViewed: { type: Boolean, default: false },
    excludeBooked: { type: Boolean, default: true }
  }
});

// Indexes
recommendationSchema.index({ userId: 1 });
recommendationSchema.index({ 'recommendations.tourId': 1 });
recommendationSchema.index({ lastUpdated: 1 });
recommendationSchema.index({ 'recommendations.metadata.expiresAt': 1 });

// Middleware để remove expired recommendations
recommendationSchema.pre('save', function(next) {
  const now = new Date();
  this.recommendations = this.recommendations.filter(rec => rec.metadata.expiresAt > now);
  this.lastUpdated = now;
  next();
});

module.exports = mongoose.model('Recommendation', recommendationSchema);