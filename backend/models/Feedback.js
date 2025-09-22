// backend/models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  feedback: { type: String, required: true },
  
  // AI Analysis fields
  sentiment: {
    score: { type: Number, min: -1, max: 1 }, // -1 negative, 0 neutral, 1 positive
    label: { type: String, enum: ['positive', 'negative', 'neutral'] },
    confidence: { type: Number, min: 0, max: 1 }
  },
  
  keywords: [String], // Extracted keywords from feedback
  categories: [String], // ['service', 'location', 'price', 'guide', 'accommodation']
  
  // Moderation
  isApproved: { type: Boolean, default: false },
  moderatedAt: Date,
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);