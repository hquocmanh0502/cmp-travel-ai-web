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
    
    // Main hotel image (đại diện)
    mainImage: { type: String, required: true },
    
    amenities: [String], // wifi, pool, gym, spa, breakfast, parking
    
    roomTypes: [{
      type: { 
        type: String, 
        required: true,
        enum: ['Superior', 'Junior Deluxe', 'Deluxe', 'Suite', 'Family', 'President']
      },
      name: { type: String, required: true }, // Tên hiển thị của loại phòng
      price: { type: Number, required: true }, // Giá per night
      originalPrice: Number, // Giá gốc (trước khi giảm giá)
      capacity: { 
        adults: { type: Number, required: true }, // Số người lớn
        children: { type: Number, default: 0 }, // Số trẻ em
        total: { type: Number, required: true } // Tổng sức chứa
      },
      size: Number, // m2
      bedInfo: String, // "1 King Bed", "2 Queen Beds", etc.
      amenities: [String], // Tiện ích riêng của phòng
      images: [String], // Ảnh của loại phòng này
      description: String,
      available: { type: Boolean, default: true },
      totalRooms: { type: Number, default: 10 }, // Tổng số phòng loại này
      availableRooms: { type: Number, default: 10 } // Số phòng còn trống
    }],
    
    images: [String], // Gallery images của hotel
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