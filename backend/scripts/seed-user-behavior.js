/**
 * Sinh sở thích và hành vi người dùng.
 *
 * Vì sao cần: recommendationService chấm điểm dựa trên user.preferences và
 * user.behavior, nhưng 81/84 người dùng đang trống hoàn toàn. Chạy engine lên sẽ
 * ra kết quả gần như ngẫu nhiên và không có số liệu nào để đưa vào báo cáo.
 *
 * Cách làm: KHÔNG bịa ngẫu nhiên. Mọi thứ suy ngược từ 225 booking đã hoàn thành:
 *   - đặt 3 tour Nhật  -> favoriteCountries có Japan
 *   - đã chi 5-8k/chuyến -> budgetRange quanh khoảng đó
 *   - tour thiên về museum/history -> activities, travelStyle tương ứng
 *   - viewHistory: tour đã đặt + tour tương tự (người ta xem nhiều hơn đặt)
 *   - searchHistory: truy vấn suy từ quốc gia và chủ đề quan tâm
 *   - wishlist: tour tương tự nhưng chưa đặt
 *
 * Nhờ vậy dữ liệu nhất quán với lịch sử giao dịch, và collaborative filtering
 * sau này có tín hiệu thật để học.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/seed-user-behavior.js --dry-run
 *   node scripts/seed-user-behavior.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');

const dryRun = process.argv.includes('--dry-run');

// Chủ đề tour -> phong cách du lịch (User.preferences.travelStyle)
const THEME_TO_STYLE = {
  luxury: 'luxury', budget: 'budget',
  adventure: 'adventure', trekking: 'adventure', mountain: 'adventure',
  culture: 'cultural', history: 'cultural', museum: 'cultural', architecture: 'cultural',
  beach: 'relaxation', wellness: 'relaxation', island: 'relaxation', romantic: 'relaxation'
};

// Chủ đề -> hoạt động ưa thích (User.preferences.activities)
const THEME_TO_ACTIVITY = {
  food: 'food', shopping: 'shopping', museum: 'sightseeing', history: 'sightseeing',
  architecture: 'sightseeing', culture: 'culture', nightlife: 'nightlife',
  beach: 'beach', 'water-sports': 'adventure', trekking: 'adventure',
  mountain: 'adventure', nature: 'nature', wildlife: 'nature', photography: 'photography'
};

const CLIMATE_BY_COUNTRY = {
  Maldives: 'tropical', Thailand: 'tropical', Malaysia: 'tropical',
  India: 'tropical', 'Hong Kong': 'tropical',
  Russia: 'cold', Canada: 'cold', Switzerland: 'cold'
};

/** Bộ sinh ngẫu nhiên có hạt giống để chạy lại cho kết quả giống nhau. */
function makeRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const topN = (counter, n) => Object.entries(counter)
  .sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

(async () => {
  await connectDB();

  const tours = await Tour.find({}, 'name country themes estimatedCost pricing').lean();
  const tourById = new Map(tours.map(t => [String(t._id), t]));

  const bookings = await Booking.find({}, 'userId tourId totalAmount departureDate status').lean();
  const byUser = new Map();
  for (const b of bookings) {
    const k = String(b.userId);
    if (!byUser.has(k)) byUser.set(k, []);
    byUser.get(k).push(b);
  }

  const users = await User.find({});
  let updated = 0, skipped = 0;
  const stats = { prefs: 0, view: 0, search: 0, wish: 0 };

  for (const [index, user] of users.entries()) {
    const userBookings = byUser.get(String(user._id)) || [];

    // Người chưa từng đặt tour thì không có cơ sở để suy sở thích -> bỏ qua,
    // đây cũng chính là bài toán "cold start" mà phần gợi ý phải xử lý.
    if (userBookings.length === 0) { skipped++; continue; }

    const rnd = makeRandom(index * 7919 + 13);

    const countryCount = {};
    const themeCount = {};
    const amounts = [];
    const bookedTourIds = new Set();

    for (const b of userBookings) {
      const t = tourById.get(String(b.tourId));
      if (!t) continue;
      bookedTourIds.add(String(t._id));
      countryCount[t.country] = (countryCount[t.country] || 0) + 1;
      (t.themes || []).forEach(th => { themeCount[th] = (themeCount[th] || 0) + 1; });
      if (b.totalAmount) amounts.push(b.totalAmount);
    }

    const favCountries = topN(countryCount, 4);
    const favThemes = topN(themeCount, 6);

    const styles = [...new Set(favThemes.map(t => THEME_TO_STYLE[t]).filter(Boolean))];
    const activities = [...new Set(favThemes.map(t => THEME_TO_ACTIVITY[t]).filter(Boolean))];

    // Khoảng ngân sách lấy quanh mức đã từng chi, nới 20% mỗi đầu
    const min = amounts.length ? Math.round(Math.min(...amounts) * 0.8) : 3000;
    const max = amounts.length ? Math.round(Math.max(...amounts) * 1.2) : 8000;

    const climates = favCountries.map(c => CLIMATE_BY_COUNTRY[c]).filter(Boolean);
    const climate = climates.length ? climates[0] : 'temperate';

    // Gan tung truong thay vi thay ca object: spread tren subdocument cua Mongoose
    // lam cac truong long nhau (hotelPreferences) bi undefined va fail validation.
    user.preferences.budgetRange = { min, max };
    user.preferences.favoriteCountries = favCountries;
    user.preferences.favoriteDestinations = [...bookedTourIds]
      .map(id => tourById.get(id)?.name).filter(Boolean).slice(0, 5);
    user.preferences.travelStyle = styles.length ? styles : ['cultural'];
    user.preferences.activities = activities.length ? activities : ['sightseeing'];
    user.preferences.climatePreference = climate;
    user.preferences.languagePreference = 'vi';
    stats.prefs++;

    // --- Lịch sử xem: tour đã đặt + tour cùng quốc gia/chủ đề nhưng chưa đặt ---
    const related = tours
      .filter(t => !bookedTourIds.has(String(t._id)))
      .map(t => ({
        t,
        score: (favCountries.includes(t.country) ? 2 : 0) +
          (t.themes || []).filter(th => favThemes.includes(th)).length
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const viewed = [
      ...[...bookedTourIds].map(id => tourById.get(id)).filter(Boolean),
      ...related.slice(0, 8).map(x => x.t)
    ];

    user.behavior = user.behavior || {};
    user.behavior.viewHistory = viewed.map((t, i) => {
      const daysAgo = Math.floor(rnd() * 180) + 1;
      const ts = new Date(); ts.setDate(ts.getDate() - daysAgo);
      return {
        tourId: t._id,
        // Tour đã đặt thì xem lâu hơn hẳn tour chỉ lướt qua
        duration: bookedTourIds.has(String(t._id))
          ? 180 + Math.floor(rnd() * 300)
          : 20 + Math.floor(rnd() * 120),
        timestamp: ts
      };
    });
    if (user.behavior.viewHistory.length) stats.view++;

    // --- Lịch sử tìm kiếm suy từ quốc gia và chủ đề quan tâm ---
    const queries = [];
    favCountries.slice(0, 3).forEach(c => queries.push(c));
    favThemes.slice(0, 3).forEach(th => queries.push(`${th} tour`));
    if (favCountries[0]) queries.push(`${favCountries[0]} ${favThemes[0] || 'tour'}`);
    queries.push(`tour under ${Math.round(max / 1000)}000`);

    user.behavior.searchHistory = queries.map((q, i) => {
      const ts = new Date(); ts.setDate(ts.getDate() - Math.floor(rnd() * 120) - 1);
      return { query: q, filters: {}, timestamp: ts };
    });
    if (user.behavior.searchHistory.length) stats.search++;

    // --- Wishlist: tour liên quan nhưng chưa đặt ---
    const wishCount = 2 + Math.floor(rnd() * 4);
    user.behavior.wishlist = related.slice(0, wishCount).map(x => {
      const ts = new Date(); ts.setDate(ts.getDate() - Math.floor(rnd() * 90) - 1);
      return { tourId: x.t._id, addedAt: ts };
    });
    if (user.behavior.wishlist.length) stats.wish++;

    // --- Lịch sử đặt tour ---
    user.behavior.bookingHistory = userBookings.map(b => ({
      tourId: b.tourId,
      bookingId: String(b._id),
      bookedAt: b.departureDate,
      status: b.status === 'completed' ? 'completed' : 'confirmed'
    }));

    if (!dryRun) await user.save();
    updated++;

    if (updated <= 3) {
      console.log(`  ${user.fullName.padEnd(18)} ${userBookings.length} booking | thích: ${favCountries.join(', ')}`);
      console.log(`     phong cách: ${user.preferences.travelStyle.join(', ')} | ngân sách $${min}-${max}`);
      console.log(`     đã xem ${user.behavior.viewHistory.length} tour | wishlist ${user.behavior.wishlist.length} | tìm kiếm ${user.behavior.searchHistory.length}`);
    }
  }

  console.log(`\n${'='.repeat(52)}`);
  console.log(`User được cập nhật      : ${updated}`);
  console.log(`User bỏ qua (chưa đặt)  : ${skipped}  <- trường hợp cold-start`);
  console.log(`  có preferences        : ${stats.prefs}`);
  console.log(`  có viewHistory        : ${stats.view}`);
  console.log(`  có searchHistory      : ${stats.search}`);
  console.log(`  có wishlist           : ${stats.wish}`);
  console.log('='.repeat(52));
  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');

  await mongoose.disconnect();
})().catch(err => { console.error('Thất bại:', err); process.exit(1); });
