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

  // ==========================================================================
  // Dữ liệu phục vụ ghép hướng dẫn viên với tour và với sở thích của khách.
  // Chatbot và SmartTour đọc đúng những trường này để trả lời "ai phù hợp nhất".
  //
  // Nguyên tắc: mỗi trường ở đây phải ĐỐI ỨNG được với một trường của Tour,
  // nếu không thì không ghép được:
  //   coverage.countries  <-> Tour.country
  //   coverage.cities     <-> Tour.name
  //   specialtyThemes     <-> Tour.themes   (dùng chung từ vựng)
  //   tourTypes           <-> Tour.type
  //   difficultyLevels    <-> Tour.difficulty
  //   groupSize           <-> Tour.maxGroupSize
  //   ageGroups           <-> Tour.minAge
  //   unavailableDates    <-> Tour.availability[].startDate
  // ==========================================================================

  // Ngôn ngữ kèm trình độ. Trường `languages` cũ chỉ là mảng tên ngôn ngữ nên
  // không phân biệt được "nói được" và "thành thạo" - vẫn giữ để tương thích.
  languageSkills: [{
    language: { type: String, required: true },
    level: {
      type: String,
      enum: ['native', 'fluent', 'intermediate', 'basic'],
      default: 'fluent'
    }
  }],

  // Địa bàn hoạt động
  coverage: {
    countries: [String],
    cities: [String],
    regions: [String] // 'Europe', 'Asia', 'North America'
  },

  // Sở trường theo chủ đề, dùng chung từ vựng với Tour.themes
  specialtyThemes: [{
    type: String,
    enum: [
      'culture', 'history', 'architecture', 'museum',
      'nature', 'mountain', 'beach', 'island', 'wildlife',
      'adventure', 'trekking', 'water-sports',
      'food', 'nightlife', 'shopping',
      'photography', 'family', 'romantic', 'wellness', 'luxury', 'budget'
    ]
  }],

  tourTypes: [{ type: String, enum: ['domestic', 'international'] }],
  difficultyLevels: [{ type: String, enum: ['easy', 'moderate', 'challenging'] }],

  // Quy mô đoàn nhận dẫn
  groupSize: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 30 }
  },

  // Nhóm tuổi có kinh nghiệm phục vụ
  ageGroups: [{
    type: String,
    enum: ['children', 'teenagers', 'adults', 'seniors']
  }],

  // Chi phí thuê, cần cho SmartTour tính ngân sách
  pricing: {
    perDay: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },

  // Khoảng thời gian đã bận, đối chiếu với ngày khởi hành của tour
  unavailableDates: [{
    from: Date,
    to: Date,
    reason: String
  }],

  // Điểm trung bình theo từng tiêu chí, tổng hợp từ GuideReview.detailedRatings.
  // Cho phép chatbot trả lời "HDV nào giao tiếp tốt nhất".
  ratingBreakdown: {
    knowledge: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    professionalism: { type: Number, default: 0 },
    friendliness: { type: Number, default: 0 },
    punctuality: { type: Number, default: 0 }
  },

  // Vài câu ngắn để chatbot trích dẫn khi giới thiệu
  highlights: [String],

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
