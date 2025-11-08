const mongoose = require('mongoose');
let bcrypt;

try {
  bcrypt = require('bcryptjs');
} catch (err) {
  console.log('bcryptjs not installed, password hashing disabled');
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  address: { type: String },
  avatar: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  blockReason: { type: String },
  blockedAt: { type: Date },
  
  // VIP Membership System
  membershipLevel: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  totalSpent: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  vipSince: { type: Date, default: null },
  
  // CMP Wallet (for payments)
  wallet: {
    balance: { type: Number, default: 0 }, // USD balance
    currency: { type: String, default: 'USD' },
    transactions: [{
      type: { type: String, enum: ['topup', 'payment', 'refund', 'bonus'], required: true },
      amount: { type: Number, required: true },
      amountVND: Number, // Amount in VND for topup
      description: String,
      orderId: String,
      orderCode: Number, // PayOS order code
      paymentLinkId: String, // PayOS payment link ID
      momoTransId: String, // MoMo transaction ID
      reference: String, // Bank reference number
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
      date: { type: Date, default: Date.now },
      completedAt: Date, // When payment completed
      timestamp: { type: Date, default: Date.now }
    }]
  },
  
  // AI Preferences (mở rộng)
  preferences: {
    budgetRange: { min: Number, max: Number },
    favoriteCountries: [String],
    favoriteDestinations: [String],
    travelStyle: [String], // có thể chọn nhiều: ['adventure', 'luxury', 'budget', 'cultural']
    hotelPreferences: {
      rating: { type: Number, min: 1, max: 5 },
      amenities: [String], // wifi, pool, gym, spa, breakfast
      roomType: { type: String, enum: ['single', 'double', 'suite', 'family'] }
    },
    activities: [String], // sightseeing, shopping, food, adventure, culture
    dietaryRestrictions: [String],
    languagePreference: { type: String, default: 'vi' },
    climatePreference: { type: String, enum: ['tropical', 'temperate', 'cold', 'desert'] }
  },
  
  // Behavior Tracking (cho AI)
  behavior: {
    searchHistory: [{
      query: String,
      filters: Object,
      timestamp: { type: Date, default: Date.now }
    }],
    viewHistory: [{
      tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
      duration: Number, // seconds
      timestamp: { type: Date, default: Date.now }
    }],
    wishlist: [{ 
      tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
      addedAt: { type: Date, default: Date.now }
    }],
    bookingHistory: [{ 
      tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
      bookingId: String,
      bookedAt: Date,
      status: { type: String, enum: ['confirmed', 'cancelled', 'completed', 'pending'] }
    }]
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password trước khi lưu
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (bcrypt) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);