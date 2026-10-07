// backend/services/matchingService.js
//
// Khung chấm điểm dùng chung cho hai bài toán gợi ý:
//   1. "You might also like"  -> tour tương tự tour đang xem
//   2. "Hướng dẫn viên phù hợp" -> ghép guide với tour
//
// Thiết kế theo kiểu CẮM THÊM ĐƯỢC (pluggable): mỗi chiến lược là một hàm nhận
// (item, context) và trả về { score, reasons }. Giai đoạn này dùng content-based
// thuần tính bằng công thức. Khi làm AI, chỉ cần thêm một strategy mới
// (embedding / collaborative / hybrid) mà KHÔNG phải sửa route hay frontend.

const Tour = require('../models/Tour');
const TourGuide = require('../models/TourGuide');

/** Jaccard: đo độ trùng giữa hai tập hợp, kết quả 0..1. */
function jaccard(a = [], b = []) {
  const setA = new Set(a.map(x => String(x).toLowerCase()));
  const setB = new Set(b.map(x => String(x).toLowerCase()));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection++;

  return intersection / (setA.size + setB.size - intersection);
}

/** Độ gần nhau của hai mức giá, 1 là bằng nhau, 0 là chênh từ 100% trở lên. */
function priceCloseness(a = 0, b = 0) {
  if (!a || !b) return 0.5;
  return Math.max(0, 1 - Math.abs(a - b) / Math.max(a, b));
}

// ============================================================ TOUR TƯƠNG TỰ

/**
 * Content-based: so sánh nội dung của hai tour với nhau.
 *
 * Trọng số chọn theo mức độ người dùng thực sự quan tâm khi xem một tour:
 * cùng chủ đề và cùng tầm giá quan trọng hơn là cùng quốc gia.
 */
const TOUR_WEIGHTS = {
  themes: 0.35,
  country: 0.20,
  price: 0.20,
  type: 0.10,
  duration: 0.08,
  rating: 0.07
};

function scoreTourSimilarity(candidate, source) {
  const breakdown = {};
  const reasons = [];

  breakdown.themes = jaccard(candidate.themes, source.themes);
  if (breakdown.themes >= 0.4) {
    const shared = (candidate.themes || []).filter(t => (source.themes || []).includes(t));
    if (shared.length) reasons.push(`Similar themes: ${shared.slice(0, 3).join(', ')}`);
  }

  breakdown.country = candidate.country === source.country ? 1 : 0;
  if (breakdown.country) reasons.push(`Same destination: ${candidate.country}`);

  breakdown.price = priceCloseness(candidate.estimatedCost, source.estimatedCost);
  if (breakdown.price >= 0.85) reasons.push('Similar price range');

  breakdown.type = candidate.type === source.type ? 1 : 0;
  // So sanh do dai theo DO GAN chu khong phai bang nhau y nguyen: tour 5 ngay va
  // 7 ngay van la lua chon thay the hop ly cho nhau, truoc day bi cham 0 diem.
  const candidateDays = candidate.durationDays || 0;
  const sourceDays = source.durationDays || 0;
  breakdown.duration = (candidateDays && sourceDays)
    ? Math.max(0, 1 - Math.abs(candidateDays - sourceDays) / Math.max(candidateDays, sourceDays))
    : (candidate.duration === source.duration ? 1 : 0);
  breakdown.rating = (candidate.rating || 0) / 5;
  if ((candidate.rating || 0) >= 4.5) reasons.push(`Highly rated (${candidate.rating}/5)`);

  let score = 0;
  for (const [key, weight] of Object.entries(TOUR_WEIGHTS)) {
    score += (breakdown[key] || 0) * weight;
  }

  return { score: Number(score.toFixed(4)), breakdown, reasons: reasons.slice(0, 3) };
}

/**
 * Tour tương tự tour đang xem.
 *
 * @param {string} tourId
 * @param {object} options { limit, strategy }
 */
async function getRelatedTours(tourId, { limit = 3, strategy = 'content' } = {}) {
  const source = await Tour.findById(tourId).lean();
  if (!source) return { strategy, items: [] };

  const candidates = await Tour.find({
    _id: { $ne: source._id },
    status: 'active'
  }).lean();

  // Chỗ để cắm thêm chiến lược khác về sau:
  //   'embedding'     -> so khớp vector mô tả tour
  //   'collaborative' -> "người đặt tour A cũng đặt tour B"
  //   'hybrid'        -> trộn có trọng số
  // Hiện chỉ có content-based nên mọi giá trị khác đều rơi về nó.
  const scored = candidates
    .map(tour => ({ tour, ...scoreTourSimilarity(tour, source) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    strategy: 'content',
    requested: strategy,
    items: scored.map(({ tour, score, reasons }) => ({
      _id: tour._id,
      id: tour.id,
      name: tour.name,
      country: tour.country,
      img: tour.img,
      rating: tour.rating,
      estimatedCost: tour.estimatedCost,
      duration: tour.duration,
      themes: tour.themes,
      matchScore: Math.round(score * 100),
      reasons
    }))
  };
}

// ==================================================== HƯỚNG DẪN VIÊN PHÙ HỢP

/**
 * Trọng số ghép guide với tour.
 *
 * Địa bàn quan trọng nhất: một hướng dẫn viên giỏi văn hoá nhưng chưa từng dẫn ở
 * nước đó thì vẫn kém phù hợp hơn người thông thạo địa bàn.
 */
const GUIDE_WEIGHTS = {
  coverage: 0.30,
  themes: 0.25,
  language: 0.15,
  rating: 0.12,
  difficulty: 0.08,
  groupSize: 0.05,
  tourType: 0.05
};

// Ngôn ngữ bản địa của điểm đến, dùng để cộng điểm cho guide nói được tiếng đó.
const LOCAL_LANGUAGE = {
  France: 'French', Japan: 'Japanese', Thailand: 'Thai', Germany: 'German',
  Italy: 'Italian', Spain: 'Spanish', Portugal: 'Portuguese', Russia: 'Russian',
  'Hong Kong': 'Chinese', Malaysia: 'Malay', Greece: 'Greek',
  Netherlands: 'Dutch', India: 'Hindi'
};

function scoreGuideForTour(guide, tour, { preferredLanguage } = {}) {
  const breakdown = {};
  const reasons = [];

  // 1. Địa bàn
  const countries = guide.coverage?.countries || [];
  breakdown.coverage = countries.includes(tour.country) ? 1 : 0;
  if (breakdown.coverage) reasons.push(`Knows ${tour.country} well`);

  // 2. Sở trường theo chủ đề
  breakdown.themes = jaccard(guide.specialtyThemes, tour.themes);
  const sharedThemes = (guide.specialtyThemes || []).filter(t => (tour.themes || []).includes(t));
  if (sharedThemes.length) reasons.push(`Specialties: ${sharedThemes.slice(0, 3).join(', ')}`);

  // 3. Ngôn ngữ: ưu tiên ngôn ngữ khách chọn, sau đó tới tiếng bản địa điểm đến
  const skills = guide.languageSkills || [];
  const spoken = skills.map(s => s.language);
  const levelScore = { native: 1, fluent: 0.9, intermediate: 0.6, basic: 0.3 };

  let languageScore = 0;
  if (preferredLanguage && spoken.includes(preferredLanguage)) {
    const lv = skills.find(s => s.language === preferredLanguage)?.level;
    languageScore = levelScore[lv] || 0.5;
    reasons.push(`Speaks ${preferredLanguage} (${lv})`);
  } else {
    const local = LOCAL_LANGUAGE[tour.country];
    if (local && spoken.includes(local)) {
      const lv = skills.find(s => s.language === local)?.level;
      languageScore = (levelScore[lv] || 0.5) * 0.8;
      reasons.push(`Speaks the local language (${local})`);
    } else if (spoken.includes('English')) {
      languageScore = 0.6;
    }
  }
  breakdown.language = languageScore;

  // 4. Đánh giá
  breakdown.rating = (guide.rating || 0) / 5;
  if ((guide.rating || 0) >= 4.5) {
    reasons.push(`Rated ${Number(guide.rating).toFixed(1)}/5`);
  }

  // 5. Độ khó tour có nằm trong khả năng nhận dẫn không
  const levels = guide.difficultyLevels || [];
  breakdown.difficulty = !tour.difficulty || levels.includes(tour.difficulty) ? 1 : 0;

  // 6. Quy mô đoàn
  const gs = guide.groupSize || {};
  breakdown.groupSize = !tour.maxGroupSize || (tour.maxGroupSize <= (gs.max ?? 99)) ? 1 : 0;

  // 7. Loại tour
  breakdown.tourType = (guide.tourTypes || []).includes(tour.type) ? 1 : 0;

  let score = 0;
  for (const [key, weight] of Object.entries(GUIDE_WEIGHTS)) {
    score += (breakdown[key] || 0) * weight;
  }

  return { score: Number(score.toFixed(4)), breakdown, reasons: reasons.slice(0, 3) };
}

/**
 * Xếp hạng hướng dẫn viên phù hợp cho một tour.
 *
 * @param {string} tourId
 * @param {object} options { limit, preferredLanguage, departureDate }
 */
async function getSuggestedGuides(tourId, { limit = 5, preferredLanguage, departureDate } = {}) {
  const tour = await Tour.findById(tourId).lean();
  if (!tour) return { items: [] };

  const guides = await TourGuide.find({ status: 'active' }).lean();

  // Loại người đã bận đúng ngày khởi hành khách chọn.
  const wanted = departureDate ? new Date(departureDate) : null;
  const available = guides.filter(g => {
    if (!wanted) return true;
    return !(g.unavailableDates || []).some(p =>
      p.from && p.to && wanted >= new Date(p.from) && wanted <= new Date(p.to));
  });

  const scored = available
    .map(guide => ({ guide, ...scoreGuideForTour(guide, tour, { preferredLanguage }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    tour: { _id: tour._id, name: tour.name, country: tour.country, themes: tour.themes },
    items: scored.map(({ guide, score, reasons, breakdown }) => ({
      _id: guide._id,
      name: guide.name,
      avatar: guide.avatar,
      bio: guide.bio,
      rating: guide.rating,
      totalReviews: guide.totalReviews,
      experience: guide.experience,
      languages: guide.languages,
      languageSkills: guide.languageSkills,
      specialtyThemes: guide.specialtyThemes,
      coverage: guide.coverage,
      pricing: guide.pricing,
      ratingBreakdown: guide.ratingBreakdown,
      highlights: guide.highlights,
      matchScore: Math.round(score * 100),
      reasons,
      breakdown
    }))
  };
}

module.exports = {
  getRelatedTours,
  getSuggestedGuides,
  scoreTourSimilarity,
  scoreGuideForTour,
  jaccard
};
