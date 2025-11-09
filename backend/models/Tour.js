const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true }, // ID từ data.json (30, 35, 36, 27...)
  name: { type: String, required: true },
  country: { type: String, required: true },
  description: { type: String, required: true },
  img: { type: String, required: true },
  rating: { type: Number, default: 0 },
  estimatedCost: { type: Number, required: true },
  attractions: [String],
  food: [String],
  
  // Gallery images
  gallery: [{
    url: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['all', 'attractions', 'accommodation', 'activities', 'food', 'landscape'],
      default: 'all'
    },
    caption: String
  }],
  
  // Detail information (mở rộng)
  itinerary: [{
    day: Number,
    title: String,
    activities: [String],
    meals: [String],
    accommodation: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }
  }],
  
  duration: { type: String, required: true }, // "3 days", "1 week"
  type: { type: String, required: true }, // domestic, international
  maxGroupSize: { type: Number, default: 20 },
  minAge: { type: Number, default: 0 },
  
  inclusions: [String],
  exclusions: [String],
  
  // ✅ HOTELS INTEGRATION - Selected hotels for this tour
  selectedHotels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel' 
  }],
  
  // ✅ TOUR GUIDE INTEGRATION - Assigned tour guides (multiple guides supported)
  assignedGuide: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourGuide'
  }],  // Pricing (mở rộng)
  pricing: {
    adult: { type: Number, required: true },
    child: { type: Number },
    infant: { type: Number },
    groupDiscount: { type: Number, default: 0 }
  },
  
  // Location details
  location: {
    coordinates: [Number], // [lng, lat]
    address: String,
    region: String
  },
  
  // Availability
  availability: [{
    startDate: Date,
    endDate: Date,
    availableSlots: Number,
    price: Number
  }],
  
  // SEO and categorization
  tags: [String],
  difficulty: { type: String, enum: ['easy', 'moderate', 'challenging'] },
  bestTimeToVisit: [String], // months
  
  // AI Analytics (mở rộng)
  analytics: {
    viewCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 0 }, // -1 to 1
    popularityScore: { type: Number, default: 0 },
    seasonalTrends: Object
  },
  
  // Content moderation
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
  featured: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
tourSchema.index({ country: 1, type: 1 });
tourSchema.index({ 'pricing.adult': 1 });
tourSchema.index({ 'analytics.popularityScore': -1 });
tourSchema.index({ 'location.coordinates': '2dsphere' });

tourSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Tour', tourSchema);