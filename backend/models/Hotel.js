const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  
  location: {
    address: { type: String, required: true },
    coordinates: [Number], // [lng, lat]
    city: { type: String, required: true },
    country: { type: String, required: true },
    distanceToCenter: Number // km
  },
  
  details: {
    rating: { type: Number, min: 1, max: 5 },
    starRating: { type: Number, min: 1, max: 5 },
    priceRange: { 
      min: { type: Number, required: true },
      max: { type: Number, required: true }
    },
    currency: { type: String, default: 'USD' },
    
    amenities: [String], // wifi, pool, gym, spa, breakfast, parking
    
    roomTypes: [{
      type: { type: String, required: true }, // single, double, suite
      price: { type: Number, required: true },
      capacity: { type: Number, required: true },
      size: Number, // m2
      amenities: [String],
      available: { type: Boolean, default: true }
    }],
    
    images: [String],
    virtualTourUrl: String,
    description: String,
    
    checkInTime: String,
    checkOutTime: String,
    
    policies: {
      cancellation: String,
      petPolicy: String,
      childPolicy: String
    }
  },
  
  // Integration với booking platforms
  externalIds: {
    bookingComId: String,
    agodaId: String,
    expediaId: String,
    googlePlaceId: String
  },
  
  // Reviews summary
  reviewsSummary: {
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratings: {
      cleanliness: Number,
      comfort: Number,
      location: Number,
      service: Number,
      value: Number
    }
  },
  
  // AI Scoring
  aiScore: {
    valueForMoney: { type: Number, min: 0, max: 10 },
    locationScore: { type: Number, min: 0, max: 10 },
    serviceScore: { type: Number, min: 0, max: 10 },
    overallScore: { type: Number, min: 0, max: 10 }
  },
  
  // Availability calendar
  availability: [{
    date: Date,
    roomType: String,
    available: Number,
    price: Number
  }],
  
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  verifiedPartner: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
hotelSchema.index({ 'location.coordinates': '2dsphere' });
hotelSchema.index({ 'location.city': 1 });
hotelSchema.index({ 'details.rating': -1 });
hotelSchema.index({ 'details.priceRange.min': 1 });

module.exports = mongoose.model('Hotel', hotelSchema);