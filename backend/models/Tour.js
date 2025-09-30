// backend/models/Tour.js
const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  country: { type: String, required: true },
  description: { type: String, required: true },
  attractions: [String],
  estimatedCost: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  activity: [String],
  food: [String],
  img: { type: String, required: true },
  
  // AI Classification fields
  categories: {
    travelStyle: [{ 
      type: String, 
      enum: ['adventure', 'cultural', 'relaxation', 'luxury', 'budget'] 
    }],
    difficulty: { type: String, enum: ['easy', 'moderate', 'challenging'] },
    bestFor: [String], // ['couples', 'families', 'solo', 'groups']
    travelTypes: [String], // ['adventure', 'cultural', 'relaxation', 'family', 'luxury', 'budget']
    season: [String], // ['spring', 'summer', 'fall', 'winter']
    climate: { type: String, enum: ['tropical', 'temperate', 'cold', 'desert'] }
  },
  
  // Analytics
  viewCount: { type: Number, default: 0 },
  bookingCount: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 }, // Calculated field
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tour', tourSchema);