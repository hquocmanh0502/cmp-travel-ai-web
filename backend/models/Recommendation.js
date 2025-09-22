// backend/models/Recommendation.js
const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recommendedTours: [{
    tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    score: { type: Number, min: 0, max: 1 }, // Confidence score
    reason: String, // 'Similar to your viewed tours', 'Based on your preferences'
    algorithm: String // 'collaborative_filtering', 'content_based', 'hybrid'
  }],
  
  generatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Recommendation', recommendationSchema);