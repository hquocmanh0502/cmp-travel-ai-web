// backend/services/compareService.js
//
// Chuẩn bị dữ liệu cho trang so sánh tour.
//
// Phần "tiêu chí nào tour nào tốt nhất" và "kết luận" được tính Ở SERVER thay vì
// để frontend tự làm, vì hai lý do: frontend không phải lặp lại công thức, và khi
// thay phần kết luận bằng LLM thì chỉ sửa một chỗ duy nhất.

const Tour = require('../models/Tour');
const Comment = require('../models/Comment');
const User = require('../models/User');
const recommendationService = require('./recommendationService');

const MAX_ITEMS = 4;

const parseDays = (d) => parseInt(String(d || '').match(/\d+/)?.[0] || '0', 10);

/** Chuyến khởi hành gần nhất còn chỗ. */
function nextDeparture(tour) {
  const now = new Date();
  const upcoming = (tour.availability || [])
    .filter(a => new Date(a.startDate) > now && (a.availableSlots || 0) > 0)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (upcoming.length === 0) return null;
  return {
    startDate: upcoming[0].startDate,
    availableSlots: upcoming[0].availableSlots,
    totalUpcoming: upcoming.length
  };
}

/**
 * Lấy dữ liệu so sánh cho danh sách tour.
 *
 * @param {string[]} ids     danh sách _id tour
 * @param {string?}  userId  nếu có, tính thêm mức phù hợp với sở thích người này
 */
async function buildComparison(ids, userId = null) {
  const unique = [...new Set(ids)].slice(0, MAX_ITEMS);
  const tours = await Tour.find({ _id: { $in: unique } }).lean();

  if (tours.length === 0) return { items: [], best: {}, verdict: null };

  // Giữ đúng thứ tự người dùng đã chọn
  const ordered = unique
    .map(id => tours.find(t => String(t._id) === String(id)))
    .filter(Boolean);

  // Số lượt đánh giá thật của từng tour
  const counts = await Comment.aggregate([
    { $match: { tourId: { $in: ordered.map(t => t._id) } } },
    { $group: { _id: '$tourId', n: { $sum: 1 } } }
  ]);
  const reviewCount = new Map(counts.map(c => [String(c._id), c.n]));

  const items = ordered.map(tour => {
    // durationDays la ban so cua duration; parseDays chi con la duong lui cho
    // du lieu cu chua chay scripts/fix-tour-taxonomy.js
    const days = tour.durationDays || parseDays(tour.duration);
    const price = tour.pricing?.adult || tour.estimatedCost || 0;

    return {
      _id: tour._id,
      id: tour.id,
      name: tour.name,
      country: tour.country,
      img: tour.img,
      duration: tour.duration,
      days,
      price,
      // Giá mỗi ngày mới là con số so sánh công bằng giữa tour 3 ngày và 10 ngày
      pricePerDay: days ? Math.round(price / days) : null,
      priceBreakdown: tour.priceBreakdown || null,
      rating: tour.rating || 0,
      reviewCount: reviewCount.get(String(tour._id)) || 0,
      difficulty: tour.difficulty,
      pace: tour.pace,
      physicalLevel: tour.physicalLevel,
      minAge: tour.minAge,
      maxGroupSize: tour.maxGroupSize,
      themes: tour.themes || [],
      suitableFor: tour.suitableFor || [],
      bestTimeToVisit: tour.bestTimeToVisit || [],
      inclusions: tour.inclusions || [],
      exclusions: tour.exclusions || [],
      hotelTiers: (tour.hotelTiers || []).map(h => ({ level: h.level, surcharge: h.surcharge })),
      highlights: (tour.highlights || []).slice(0, 3),
      nextDeparture: nextDeparture(tour),
      transport: tour.transport || null
    };
  });

  // --- Tiêu chí nào tour nào thắng ---
  // Tra ve DANH SACH id thang o moi tieu chi: neu hai tour bang diem thi ca hai
  // deu duoc danh dau, khong the chi chon mot cach tuy tien.
  const bestBy = (key, mode) => {
    const valid = items.filter(i => i[key] !== null && i[key] !== undefined);
    if (valid.length === 0) return [];

    const values = valid.map(i => i[key]);
    const target = mode === 'min' ? Math.min(...values) : Math.max(...values);

    // Moi tour deu nhu nhau thi khong danh dau gi, tranh gay hieu nham.
    if (values.every(v => v === target)) return [];

    return valid.filter(i => i[key] === target).map(i => String(i._id));
  };

  const best = {
    price: bestBy('price', 'min'),
    pricePerDay: bestBy('pricePerDay', 'min'),
    rating: bestBy('rating', 'max'),
    reviewCount: bestBy('reviewCount', 'max'),
    days: bestBy('days', 'max'),
    // Doan nho hon thuong duoc cham ky hon
    maxGroupSize: bestBy('maxGroupSize', 'min'),
    inclusionCount: (() => {
      items.forEach(i => { i.inclusionCount = i.inclusions.length; });
      return bestBy('inclusionCount', 'max');
    })()
  };

  // --- Điểm chỉ tour này có, các tour khác không ---
  items.forEach(item => {
    const others = items.filter(i => String(i._id) !== String(item._id));
    item.uniqueInclusions = item.inclusions.filter(
      inc => others.every(o => !o.inclusions.includes(inc))
    );
    item.uniqueThemes = item.themes.filter(
      th => others.every(o => !o.themes.includes(th))
    );
  });

  // --- Kết luận ---
  // Đáng tiền nhất: điểm đánh giá trên mỗi đồng chi phí mỗi ngày.
  const rated = items.filter(i => i.rating > 0 && i.pricePerDay);
  let bestValue = null;
  if (rated.length > 1) {
    const w = rated.reduce((a, b) =>
      (a.rating / a.pricePerDay >= b.rating / b.pricePerDay ? a : b));
    const cheapest = Math.min(...items.map(i => i.price));
    const diff = w.price > cheapest
      ? null
      : Math.round((Math.max(...items.map(i => i.price)) - w.price) / Math.max(...items.map(i => i.price)) * 100);

    bestValue = {
      tourId: String(w._id),
      name: w.name,
      // Giao diện đang dùng tiếng Anh nên chuỗi sinh ở server cũng phải tiếng Anh.
      reason: diff
        ? `up to ${diff}% cheaper while still rated ${w.rating}/5`
        : `best balance between price per day ($${w.pricePerDay}) and a ${w.rating}/5 rating`
    };
  }

  // Phù hợp nhất với người đang đăng nhập, dùng lại đúng thuật toán của phần gợi ý.
  let bestForYou = null;
  if (userId) {
    const user = await User.findById(userId).lean();
    const hasPrefs = user && (user.preferences?.favoriteCountries || []).length;

    if (hasPrefs) {
      const scored = ordered.map(tour => ({
        tour,
        ...recommendationService.calculateTourScore(tour, user)
      })).sort((a, b) => b.totalScore - a.totalScore);

      const top = scored[0];
      bestForYou = {
        tourId: String(top.tour._id),
        name: top.tour.name,
        matchPercentage: Math.round(top.totalScore * 100),
        reasons: recommendationService.generateReasons(top.breakdown, top.tour)
      };
    }
  }

  return { items, best, verdict: { bestValue, bestForYou } };
}

module.exports = { buildComparison, MAX_ITEMS };
