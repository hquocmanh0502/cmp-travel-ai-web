const mongoose = require('mongoose');
const { TOUR_THEMES, CURRENCY } = require('../config/travel-vocabulary');

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
    description: String, // mô tả ngắn của ngày, hiển thị trên tab lịch trình
    activities: [String],
    meals: [String],
    accommodation: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }
  }],
  
  duration: { type: String, required: true }, // "3 days", "1 week" - de HIEN THI
  // Ban so cua duration, de LOC va TINH TOAN.
  //
  // Vi sao phai co: duration la String ("5 days") nen khong the tra loi
  // "toi co 6 ngay" bang mot truy van - khong co $lte nao chay duoc tren chuoi.
  // SmartTour bat buoc can ban so nay. duration van giu lai de hien thi.
  durationDays: { type: Number, min: 1, index: true },

  // Don vi tien te cho estimatedCost / pricing / priceBreakdown / availability.price.
  // Ghi ro vi ngan sach nguoi dung nhap phai cung don vi moi so sanh duoc.
  currency: { type: String, default: CURRENCY },
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
    region: String,
    // Mui gio IANA ("Europe/Paris") de doi gio dia phuong - xem config/city-logistics.js
    timezone: String
  },
  
  // Availability
  //
  // QUY UOC NGAY: startDate / endDate la NGAY THEO LICH DIA PHUONG cua thanh pho,
  // luu dang 00:00 UTC (vd chuyen Paris 04/12 = 2026-12-04T00:00:00Z). Doc ngay
  // bang toISOString().slice(0, 10) hoac services/seasonalPricing.calendarDay.
  // Gio cu the (don khach, nhan phong) tinh bang location.timezone + operations.
  // endDate = startDate + (durationDays - 1) ngay = ngay tra phong, ve.
  availability: [{
    startDate: Date,
    endDate: Date,
    availableSlots: Number,
    // Huong dan vien duoc phan cong cho DUNG chuyen nay. Tour.assignedGuide chi la
    // danh sach nguoi DU DIEU KIEN; mot nguoi khong the dan 2 chuyen cung ngay.
    guideId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourGuide' },
    price: Number
  }],
  
  // SEO and categorization
  tags: [String],

  // Chu de cua tour, dung chung tu vung voi TourGuide.specialtyThemes.
  // Nho truong nay moi ghep duoc "tour thien ve van hoa" voi "HDV manh ve van hoa".
  //
  // Chu de NOI DUNG lay tu config/city-profiles.js (tham dinh tay 36 thanh pho),
  // con nhan GIA ('budget'/'luxury') duoc tinh theo phan vi gia moi ngay.
  // Ca hai do scripts/fix-tour-taxonomy.js ghi.
  //
  // Khong con suy tu khoa trong attractions/food nhu truoc: cach do tung gan
  // 'mountain' cho Malacca (vi "St. Paul's Hill") va 'island' cho Berlin
  // (vi "Museum Island").
  themes: [{ type: String, enum: TOUR_THEMES }],
  difficulty: { type: String, enum: ['easy', 'moderate', 'challenging'] },
  // Thang dep (ten thang tieng Anh). Tu 2026-10-19 suy tu THOI TIET THAT
  // (Open-Meteo 2016-2025), xem scripts/fetch-seasonality.js.
  bestTimeToVisit: [String],

  // Thoi tiet theo thang tu nguon that - can cu cua bestTimeToVisit va gia theo mua.
  seasonality: {
    monthly: [{
      month: String,        // "January"...
      tmaxC: Number,        // nhiet do cao nhat trung binh (°C)
      rainyDays: Number,    // so ngay mua >= 1mm trung binh
      comfort: Number       // diem de chiu 0-1 (tu tmaxC + rainyDays)
    }],
    sources: { climate: String },
    fetchedAt: Date
  },
  

  // ==========================================================================
  // Dữ liệu chi tiết phục vụ SmartTour và Chatbot RAG.
  //
  // Được điền bởi scripts/enrich-tour-core.js và scripts/enrich-tour-content.js
  // ==========================================================================

  // Nhịp độ hành trình, khớp với nhu cầu "đi thong thả" hay "đi được nhiều nơi"
  pace: { type: String, enum: ['relaxed', 'balanced', 'packed'], default: 'balanced' },

  // Mức vận động 1 (đi bộ nhẹ) -> 5 (leo núi nhiều ngày). Chi tiết hơn difficulty.
  physicalLevel: { type: Number, min: 1, max: 5, default: 2 },

  // Nhóm khách phù hợp, dùng để cá nhân hoá và cho chatbot tư vấn
  suitableFor: [{
    type: String,
    enum: ['solo', 'couple', 'family', 'friends', 'seniors', 'honeymoon', 'business']
  }],

  // Tách giá thành phần: nhờ đó SmartTour trả lời được "thêm tiền thì nâng được gì"
  priceBreakdown: {
    accommodation: Number,
    meals: Number,
    transport: Number,
    guide: Number,
    entranceFees: Number
  },

  // Các mức khách sạn có thể chọn, surcharge là phụ phí so với mức tiêu chuẩn
  hotelTiers: [{
    level: { type: Number, min: 3, max: 5 },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
    hotelName: String,
    surcharge: { type: Number, default: 0 }
  }],

  // Cách di chuyển sang chặng kế tiếp khi SmartTour ghép nhiều thành phố
  transport: {
    toNextCity: String,
    distanceKm: Number,
    mode: { type: String, enum: ['train', 'flight', 'bus', 'ferry'] },
    durationHours: Number
  },

  // Cac chang di chuyen tu tour nay sang NHIEU tour khac.
  //
  // transport o tren chi co DUNG MOT "thanh pho ke tiep", nen SmartTour khong
  // ghep linh hoat duoc. transportLegs duoc tinh tu location.coordinates (da co
  // san du 36/36 tour, kem index 2dsphere) bang cong thuc haversine, nen khong
  // phai nhap tay va khong sai lech nhu truong hop Lauterbrunnen -> Milan
  // "160km di tau 1 gio".
  //
  // Sinh boi scripts/build-transport-legs.js
  transportLegs: [{
    toTourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    toCity: String,
    toCountry: String,
    distanceKm: Number,
    mode: { type: String, enum: ['train', 'flight', 'bus', 'ferry'] },
    stops: { type: Number, default: 0 },   // so diem dung (bay > 7000km: 1)
    // Tinh tu cua ra/ga (gom lam thu tuc), CHUA gom duong tu trung tam ra san
    // bay/ga - phan do lay tu logistics.*.transferMinutes cua hai thanh pho.
    durationHours: Number,
    estimatedCost: Number
  }],

  // Hau can de SmartTour tinh gio den noi khi noi hai tour (config/city-logistics.js)
  logistics: {
    airport: { iata: String, name: String, transferMinutes: Number },
    // Ga tau / ben xe / ben pha chinh; null neu khong co (vd Phuket)
    ground: { name: String, type: { type: String, enum: ['rail', 'bus', 'ferry'] }, transferMinutes: Number }
  },

  // Quy dinh van hanh (gio dia phuong "HH:mm"). Hien moi tour dung chung mot quy dinh.
  operations: {
    arrivalPickup: { from: String, to: String },      // ngay 1: khung gio xe don
    welcomeMeeting: String,                            // ngay 1: gap doan
    departureTransfer: { from: String, to: String },   // ngay cuoi: khung gio xe tien
    latestArrival: String                              // noi tour: den KS sau gio nay -> them dem noi chuyen
  },

  // --- Nội dung dài cho Chatbot RAG ---
  longDescription: String,
  highlights: [String],
  faq: [{ question: String, answer: String }],
  whatToBring: [String],
  policies: {
    cancellation: String,
    payment: String,
    refund: String
  },

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
// SmartTour loc theo "toi co N ngay / ngan sach X / thich chu de Y"
tourSchema.index({ durationDays: 1, estimatedCost: 1 });
tourSchema.index({ themes: 1 });
tourSchema.index({ suitableFor: 1 });

tourSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Tour', tourSchema);