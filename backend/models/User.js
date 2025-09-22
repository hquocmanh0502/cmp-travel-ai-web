// backend/models/User.js
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
  
  // AI Recommendation fields
  preferences: {
    budgetRange: { min: Number, max: Number },
    favoriteCountries: [String],
    travelStyle: { 
      type: String, 
      enum: ['adventure', 'relaxation', 'cultural', 'luxury', 'budget', 'family', 'solo', 'romantic'] 
    },
    activities: [String],
    climatePreference: { type: String, enum: ['tropical', 'temperate', 'cold', 'desert'] }
  },
  
  // User behavior tracking
  viewHistory: [{
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    viewedAt: { type: Date, default: Date.now },
    duration: Number
  }],
  
  searchHistory: [{
    query: String,
    filters: Object,
    searchedAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now }
});

// Hash password trước khi lưu (chỉ khi có bcryptjs)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (bcrypt) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);