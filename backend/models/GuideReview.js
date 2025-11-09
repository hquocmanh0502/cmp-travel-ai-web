const mongoose = require('mongoose');

const guideReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourGuide',
    required: true
  },
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // Detailed ratings
  detailedRatings: {
    knowledge: { type: Number, min: 1, max: 5 }, // Kiến thức
    communication: { type: Number, min: 1, max: 5 }, // Giao tiếp
    professionalism: { type: Number, min: 1, max: 5 }, // Chuyên nghiệp
    friendliness: { type: Number, min: 1, max: 5 }, // Thân thiện
    punctuality: { type: Number, min: 1, max: 5 } // Đúng giờ
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isVerified: {
    type: Boolean,
    default: false // True if user actually completed the tour
  },
  adminResponse: {
    type: String,
    maxlength: 500
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  reportCount: {
    type: Number,
    default: 0
  },
  images: [{
    type: String // URLs to review images
  }]
}, {
  timestamps: true
});

// Index for queries
guideReviewSchema.index({ guideId: 1, status: 1, createdAt: -1 });
guideReviewSchema.index({ userId: 1, guideId: 1, tourId: 1 }, { unique: true }); // One review per user per guide per tour

// Update guide rating after save
guideReviewSchema.post('save', async function() {
  const TourGuide = mongoose.model('TourGuide');
  const guide = await TourGuide.findById(this.guideId);
  if (guide) {
    await guide.updateRating();
  }
});

// Update guide rating after delete
guideReviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const TourGuide = mongoose.model('TourGuide');
    const guide = await TourGuide.findById(doc.guideId);
    if (guide) {
      await guide.updateRating();
    }
  }
});

const GuideReview = mongoose.model('GuideReview', guideReviewSchema);

module.exports = GuideReview;
