/**
 * Kiem tra chat luong du lieu theo cac tieu chi nghiem thu.
 *
 * Script nay KHONG ghi gi vao DB. Muc dich la de chay lai bat ky luc nao va
 * chung minh duoc du lieu dang dung - ke ca khi dang bao ve truoc hoi dong.
 *
 * Chay (tu thu muc backend):
 *   node scripts/verify-data-quality.js
 *
 * Thoat voi ma 1 neu co bat ky tieu chi THAT BAI.
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Comment = require('../models/Comment');
const {
  TOUR_THEMES, AUDIENCES, CURRENCY,
  normalizeStyle, normalizeActivity, climateOf
} = require('../config/travel-vocabulary');
const { CITY_PROFILES, difficultyFromPhysical } = require('../config/city-profiles');

const results = [];
const check = (name, passed, detail = '') => results.push({ name, passed, detail });

(async () => {
  await connectDB();

  const tours = await Tour.find({}).lean();
  const n = tours.length;

  // ====================== 1. duration dang so ======================
  const noDurationDays = tours.filter(t => typeof t.durationDays !== 'number' || t.durationDays < 1);
  check('durationDays la so o moi tour', noDurationDays.length === 0,
    noDurationDays.length ? `thieu o: ${noDurationDays.map(t => t.name).join(', ')}` : `${n}/${n} tour`);

  const mismatchDuration = tours.filter(t => {
    const parsed = parseInt(String(t.duration).match(/\d+/)?.[0] || '0', 10);
    return parsed !== t.durationDays;
  });
  check('durationDays khop voi chuoi duration', mismatchDuration.length === 0,
    mismatchDuration.map(t => `${t.name}: "${t.duration}" vs ${t.durationDays}`).join(', '));

  // Truy van kieu SmartTour phai chay duoc
  const under6 = await Tour.countDocuments({ durationDays: { $lte: 6 } });
  check('loc duoc "toi co 6 ngay" bang truy van', under6 > 0, `${under6} tour <= 6 ngay`);

  // ====================== 2. don vi tien te ======================
  const noCurrency = tours.filter(t => t.currency !== CURRENCY);
  check(`moi tour ghi ro don vi tien te (${CURRENCY})`, noCurrency.length === 0,
    noCurrency.length ? `thieu o ${noCurrency.length} tour` : `${n}/${n} tour`);

  // ====================== 3. chu de co tinh phan biet ======================
  const themeCount = {};
  tours.forEach(t => (t.themes || []).forEach(x => (themeCount[x] = (themeCount[x] || 0) + 1)));
  const tooCommonThemes = Object.entries(themeCount).filter(([, c]) => c / n > 0.7);
  check('khong chu de nao xuat hien o >70% tour', tooCommonThemes.length === 0,
    tooCommonThemes.map(([k, c]) => `${k} ${Math.round(c / n * 100)}%`).join(', ') ||
    `cao nhat: ${Object.entries(themeCount).sort((a, b) => b[1] - a[1])[0].map(String).join(' ')}`);

  const badThemeCount = tours.filter(t => {
    const content = (t.themes || []).filter(x => x !== 'budget' && x !== 'luxury');
    return content.length < 2 || content.length > 5;
  });
  check('moi tour co 2-5 chu de noi dung', badThemeCount.length === 0,
    badThemeCount.map(t => `${t.name}(${(t.themes || []).length})`).join(', '));

  const invalidTheme = tours.filter(t => (t.themes || []).some(x => !TOUR_THEMES.includes(x)));
  check('moi chu de nam trong enum', invalidTheme.length === 0,
    invalidTheme.map(t => t.name).join(', '));

  // ====================== 4. nhan gia ======================
  const bothPriceTags = tours.filter(t => (t.themes || []).includes('budget') && (t.themes || []).includes('luxury'));
  check('khong tour nao vua budget vua luxury', bothPriceTags.length === 0,
    bothPriceTags.map(t => t.name).join(', '));

  const budgetTours = tours.filter(t => (t.themes || []).includes('budget'));
  const luxuryTours = tours.filter(t => (t.themes || []).includes('luxury'));
  const perDay = (t) => t.estimatedCost / t.durationDays;
  const maxBudgetPerDay = Math.max(...budgetTours.map(perDay));
  const minLuxuryPerDay = Math.min(...luxuryTours.map(perDay));
  check('nhan gia dung chieu (budget re hon luxury theo ngay)',
    maxBudgetPerDay < minLuxuryPerDay,
    `budget cao nhat $${maxBudgetPerDay.toFixed(0)}/ngay < luxury thap nhat $${minLuxuryPerDay.toFixed(0)}/ngay`);

  check('budget va luxury moi nhan khoang 1/3 danh muc',
    budgetTours.length >= n * 0.25 && budgetTours.length <= n * 0.42 &&
    luxuryTours.length >= n * 0.25 && luxuryTours.length <= n * 0.42,
    `budget ${budgetTours.length}, luxury ${luxuryTours.length} / ${n}`);

  // ====================== 5. nhom khach ======================
  const audCount = {};
  tours.forEach(t => (t.suitableFor || []).forEach(x => (audCount[x] = (audCount[x] || 0) + 1)));
  const tooCommonAud = Object.entries(audCount).filter(([, c]) => c / n > 0.7);
  check('khong nhom khach nao xuat hien o >70% tour', tooCommonAud.length === 0,
    tooCommonAud.map(([k, c]) => `${k} ${Math.round(c / n * 100)}%`).join(', ') ||
    `cao nhat: ${Object.entries(audCount).sort((a, b) => b[1] - a[1])[0].map(String).join(' ')}`);

  const invalidAud = tours.filter(t => (t.suitableFor || []).some(x => !AUDIENCES.includes(x)));
  check('moi nhom khach nam trong enum', invalidAud.length === 0,
    invalidAud.map(t => t.name).join(', '));

  const seniorsOnHard = tours.filter(t =>
    (t.suitableFor || []).includes('seniors') &&
    (t.physicalLevel >= 4 || t.difficulty === 'challenging'));
  check('khong gan "seniors" cho tour nang', seniorsOnHard.length === 0,
    seniorsOnHard.map(t => `${t.name}(phys${t.physicalLevel}/${t.difficulty})`).join(', '));

  // ====================== 6. nhat quan noi bo ======================
  const diffMismatch = tours.filter(t => t.difficulty !== difficultyFromPhysical(t.physicalLevel));
  check('difficulty khop voi physicalLevel', diffMismatch.length === 0,
    diffMismatch.map(t => `${t.name}(phys${t.physicalLevel}/${t.difficulty})`).join(', '));

  const itineraryMismatch = tours.filter(t => (t.itinerary || []).length !== t.durationDays);
  check('so ngay itinerary = durationDays', itineraryMismatch.length === 0,
    itineraryMismatch.map(t => `${t.name}(${(t.itinerary || []).length}/${t.durationDays})`).join(', '));

  const priceMismatch = tours.filter(t => {
    const pb = t.priceBreakdown || {};
    const sum = (pb.accommodation || 0) + (pb.meals || 0) + (pb.transport || 0) +
                (pb.guide || 0) + (pb.entranceFees || 0);
    return Math.abs(sum - t.estimatedCost) > 1 || Math.abs(t.pricing?.adult - t.estimatedCost) > 1;
  });
  check('tong priceBreakdown = estimatedCost = pricing.adult', priceMismatch.length === 0,
    priceMismatch.map(t => t.name).join(', '));

  const noProfile = tours.filter(t => !CITY_PROFILES[t.name]);
  check('moi tour co profile thanh pho', noProfile.length === 0, noProfile.map(t => t.name).join(', '));

  // ====================== 7. toa do & chang di chuyen ======================
  const noCoords = tours.filter(t => !t.location?.coordinates || t.location.coordinates.length !== 2);
  check('moi tour co toa do', noCoords.length === 0, noCoords.map(t => t.name).join(', '));

  const fewLegs = tours.filter(t => (t.transportLegs || []).length < 3);
  check('moi tour co >=3 chang di chuyen', fewLegs.length === 0,
    fewLegs.map(t => `${t.name}(${(t.transportLegs || []).length})`).join(', '));

  const SPEED_LIMIT = { bus: 90, train: 200, ferry: 60, flight: 900 };
  const badSpeed = [];
  tours.forEach(t => (t.transportLegs || []).forEach(l => {
    const speed = l.distanceKm / l.durationHours;
    if (speed > SPEED_LIMIT[l.mode]) badSpeed.push(`${t.name}->${l.toCity} ${l.mode} ${Math.round(speed)}km/h`);
  }));
  check('khong chang nao co toc do phi thuc te', badSpeed.length === 0, badSpeed.slice(0, 5).join(', '));

  // ====================== 8. analytics tu nguon that ======================
  const bookingRows = await Booking.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: '$tourId', n: { $sum: 1 } } }
  ]);
  const bookingMap = new Map(bookingRows.map(r => [String(r._id), r.n]));
  const bookingWrong = tours.filter(t => (t.analytics?.bookingCount || 0) !== (bookingMap.get(String(t._id)) || 0));
  check('analytics.bookingCount = so booking that', bookingWrong.length === 0,
    bookingWrong.slice(0, 5).map(t => `${t.name}(${t.analytics?.bookingCount} vs ${bookingMap.get(String(t._id)) || 0})`).join(', '));

  const viewRows = await User.aggregate([
    { $unwind: '$behavior.viewHistory' },
    { $group: { _id: '$behavior.viewHistory.tourId', n: { $sum: 1 } } }
  ]);
  const viewMap = new Map(viewRows.map(r => [String(r._id), r.n]));
  const viewWrong = tours.filter(t => (t.analytics?.viewCount || 0) !== (viewMap.get(String(t._id)) || 0));
  check('analytics.viewCount = so luot xem that', viewWrong.length === 0,
    viewWrong.slice(0, 5).map(t => `${t.name}(${t.analytics?.viewCount} vs ${viewMap.get(String(t._id)) || 0})`).join(', '));

  const ratingRows = await Comment.aggregate([
    { $match: { 'content.rating': { $gte: 1, $lte: 5 } } },
    { $group: { _id: '$tourId', avg: { $avg: '$content.rating' } } }
  ]);
  const ratingMap = new Map(ratingRows.map(r => [String(r._id), Number(r.avg.toFixed(1))]));
  const ratingWrong = tours.filter(t => (t.rating || 0) !== (ratingMap.get(String(t._id)) || 0));
  check('Tour.rating = diem sao trung binh that', ratingWrong.length === 0,
    ratingWrong.slice(0, 5).map(t => `${t.name}(${t.rating} vs ${ratingMap.get(String(t._id))})`).join(', '));

  const popOutOfRange = tours.filter(t => {
    const p = t.analytics?.popularityScore;
    return typeof p !== 'number' || p < 0 || p > 1;
  });
  check('popularityScore nam trong [0,1]', popOutOfRange.length === 0,
    popOutOfRange.map(t => t.name).join(', '));

  // ====================== 9. lich khoi hanh ======================
  const flatPrice = tours.filter(t => new Set((t.availability || []).map(a => a.price)).size <= 1);
  check('gia theo mua co thay doi o moi tour', flatPrice.length === 0,
    flatPrice.map(t => t.name).join(', '));

  const slotValues = new Set();
  tours.forEach(t => (t.availability || []).forEach(a => slotValues.add(a.availableSlots)));
  check('availableSlots khong con dong loat mot gia tri', slotValues.size > 1,
    `cac gia tri: ${[...slotValues].sort((a, b) => a - b).join(', ')}`);

  const departureCounts = new Set(tours.map(t => (t.availability || []).length));
  check('so chuyen khac nhau giua cac tour', departureCounts.size > 1,
    `tu ${Math.min(...departureCounts)} den ${Math.max(...departureCounts)} chuyen`);

  // ====================== 10. tu vung nguoi dung ======================
  const styles = (await User.distinct('preferences.travelStyle')).filter(Boolean);
  const activities = (await User.distinct('preferences.activities')).filter(Boolean);
  const badStyles = styles.filter(s => !normalizeStyle(s));
  const badActivities = activities.filter(a => !normalizeActivity(a));
  check('moi travelStyle trong DB deu nhan ra duoc', badStyles.length === 0, badStyles.join(', '));
  check('moi activity trong DB deu nhan ra duoc', badActivities.length === 0, badActivities.join(', '));

  const dupActivities = activities.filter(a => normalizeActivity(a) !== a);
  check('khong con bien the trung nghia trong activities', dupActivities.length === 0,
    dupActivities.map(a => `${a} -> ${normalizeActivity(a)}`).join(', '));

  const countries = [...new Set(tours.map(t => t.country))];
  const noClimate = countries.filter(c => !climateOf(c));
  check('moi quoc gia co tour deu biet khi hau', noClimate.length === 0, noClimate.join(', '));

  // ====================== 11. bo cham diem co phan biet ======================
  const rec = require('../services/recommendationService');
  const sampleUser = await User.findOne({ 'preferences.travelStyle.0': { $exists: true } });
  if (sampleUser) {
    const docs = await Tour.find({ status: 'active' });
    const scores = docs.map(t => rec.calculateTourScore(t, sampleUser));
    const styleValues = new Set(scores.map(s => s.breakdown.travelStyle.toFixed(2)));
    const totals = scores.map(s => s.totalScore);
    check('tieu chi travelStyle phan biet duoc cac tour', styleValues.size > 1,
      `${styleValues.size} muc diem khac nhau (truoc day chi co 1: luon 0.50)`);
    check('tong diem co dai phan bo', Math.max(...totals) - Math.min(...totals) > 0.15,
      `${(Math.min(...totals) * 100).toFixed(0)}% - ${(Math.max(...totals) * 100).toFixed(0)}%`);
  }

  // ============================== bao cao ==============================
  const pad = Math.max(...results.map(r => r.name.length));
  console.log('\n=============== KIEM TRA CHAT LUONG DU LIEU ===============\n');
  results.forEach(r => {
    console.log(`${r.passed ? 'OK  ' : 'FAIL'}  ${r.name.padEnd(pad)}  ${r.detail}`);
  });

  const failed = results.filter(r => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} tieu chi dat.`);
  if (failed.length) {
    console.log('\nCHUA DAT:');
    failed.forEach(r => console.log(`  - ${r.name}: ${r.detail}`));
  }

  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
