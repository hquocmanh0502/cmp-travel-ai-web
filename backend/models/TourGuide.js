const mongoose = require('mongoose');

const tourGuideSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  bio: {
    type: String,
    required: true,
    maxlength: 500
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  languages: [{
    type: String,
    trim: true
  }],
  specialties: [{
    type: String,
    trim: true
  }], // e.g., "Adventure Tours", "Cultural Tours", "Food Tours"
  experience: {
    type: Number,
    default: 0,
    min: 0
  }, // Years of experience
  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalTours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave'],
    default: 'active'
  },
  availability: {
    type: String,
    enum: ['available', 'busy', 'unavailable'],
    default: 'available'
  },
  salary: {
    baseRate: { type: Number, default: 0 }, // Per package tour
    currency: { type: String, default: 'VND' }
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  address: {
    street: String,
    city: String,
    country: String,
    zipCode: String
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search
tourGuideSchema.index({ name: 'text', bio: 'text', specialties: 'text' });

// Update rating when reviews change
tourGuideSchema.methods.updateRating = async function() {
  const GuideReview = mongoose.model('GuideReview');
  const reviews = await GuideReview.find({ guideId: this._id, status: 'approved' });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = totalRating / reviews.length;
    this.totalReviews = reviews.length;
  } else {
    this.rating = 0;
    this.totalReviews = 0;
  }
  
  await this.save();
};

const TourGuide = mongoose.model('TourGuide', tourGuideSchema);

module.exports = TourGuide;
