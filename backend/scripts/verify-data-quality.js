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
const Poi = require('../models/Poi');
const { categoryByKey } = require('../config/poi-categories');
const Hotel = require('../models/Hotel');
const { SMARTTOUR_INTERESTS } = require('../config/travel-vocabulary');
const { seatsFor } = require('../services/departureService');
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

  const noAudience = tours.filter(t => !(t.suitableFor || []).length);
  check('moi tour co >=1 nhom khach phu hop', noAudience.length === 0,
    noAudience.map(t => t.name).join(', '));

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

  // ====================== 6b. hang khach san ======================
  const tierProblems = [];
  tours.forEach(t => {
    const tiers = [...(t.hotelTiers || [])].sort((a, b) => a.level - b.level);
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].surcharge < tiers[i - 1].surcharge) tierProblems.push(`${t.name}: phu phi nguoc chieu`);
      if (tiers[i].level === tiers[i - 1].level) tierProblems.push(`${t.name}: trung level ${tiers[i].level}`);
    }
    if (tiers.length && tiers[0].surcharge !== 0) tierProblems.push(`${t.name}: muc chuan khac $0`);
  });
  check('phu phi khach san tang theo hang, muc chuan $0', tierProblems.length === 0,
    tierProblems.slice(0, 5).join(', '));

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

  // ====================== 7b. diem tham quan (POI) ======================
  // Moi ngay tham quan tron can khoang 2-3 diem, nen toi thieu 2 diem/ngay
  // thi SmartTour moi xep duoc lich ma khong phai lap lai cung mot diem.
  const poiRows = await Poi.aggregate([
    { $group: { _id: '$tourId', n: { $sum: 1 }, cats: { $push: '$category' } } }
  ]);
  const poiByTour = Object.fromEntries(poiRows.map(r => [String(r._id), r]));
  const fewPois = tours.filter(t => (poiByTour[t._id]?.n || 0) < 2 * t.durationDays);
  check('moi tour co >= 2 POI moi ngay', fewPois.length === 0,
    fewPois.map(t => `${t.name}(${poiByTour[t._id]?.n || 0}/${2 * t.durationDays})`).join(', ') ||
    `${poiRows.length}/${n} tour, ${poiRows.reduce((s, r) => s + r.n, 0)} POI`);

  const orphanPois = poiRows.filter(r => !tours.some(t => String(t._id) === String(r._id)));
  check('moi POI tro vao tour ton tai', orphanPois.length === 0, `${orphanPois.length} nhom POI mo coi`);

  const overCap = [];
  poiRows.forEach(r => {
    const counts = {};
    r.cats.forEach(c => (counts[c] = (counts[c] || 0) + 1));
    Object.entries(counts).forEach(([k, c]) => {
      if (c > categoryByKey[k].cap) overCap.push(`${tours.find(t => String(t._id) === String(r._id))?.name} ${k}:${c}`);
    });
  });
  check('khong loai POI nao vuot tran moi thanh pho', overCap.length === 0, overCap.slice(0, 5).join(', '));

  const badPoiFields = await Poi.countDocuments({
    $or: [{ visitMinutes: { $not: { $gt: 0 } } }, { 'location.coordinates.1': { $exists: false } }]
  });
  check('moi POI co toa do va thoi gian tham quan', badPoiFields === 0, `${badPoiFields} POI thieu`);

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

  // Gia khach bi tru khi dat (pricingService) phai bang gia hien trong lich -
  // truoc day tinh tien bang gia co ban nen lech toi 20%
  const { calculateBookingPrice } = require('../services/pricingService');
  const priceMismatchDeps = [];
  let depCount = 0;
  tours.forEach(t => (t.availability || []).forEach(a => {
    depCount++;
    const q = calculateBookingPrice(t, { adults: 1, departureDate: a.startDate });
    if (q.adultPrice !== a.price) priceMismatchDeps.push(`${t.name} ${a.price} vs ${q.adultPrice}`);
  }));
  check('gia tinh tien = gia trong lich o moi chuyen', priceMismatchDeps.length === 0,
    priceMismatchDeps.slice(0, 5).join(', ') || `${depCount} chuyen`);

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

  // Ngan sach la USD MOI NGUOI (cung don vi gia tour), nam trong thanh truot
  // cua trang Preferences ($500 - $15,000)
  const budgetUsers = await User.find({ 'preferences.budgetRange.max': { $gt: 0 } },
    { username: 1, 'preferences.budgetRange': 1 }).lean();
  const badBudget = budgetUsers.filter(u => {
    const { min, max } = u.preferences.budgetRange;
    return !(min >= 0 && max > min && max <= 15000);
  });
  check('ngan sach user la USD/nguoi (<= $15,000, min < max)', badBudget.length === 0,
    badBudget.slice(0, 5).map(u => `${u.username} $${u.preferences.budgetRange.min}-$${u.preferences.budgetRange.max}`).join(', ') ||
    `${budgetUsers.length} user`);

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

  // ====================== 12. du lieu cho SmartTour ======================
  const DAY_MS = 24 * 3600 * 1000;
  const fresh = await Tour.find({}).lean(); // doc lai: cac muc tren co the da sua availability

  // --- (1) quy uoc ngay + mui gio ---
  const badTz = fresh.filter(t => {
    try { new Intl.DateTimeFormat('en', { timeZone: t.location?.timezone }); return !t.location?.timezone; }
    catch { return true; }
  });
  check('moi tour co mui gio IANA hop le', badTz.length === 0,
    badTz.map(t => t.name).join(', ') || `${fresh.length}/${fresh.length} tour`);

  const badDates = [];
  fresh.forEach(t => (t.availability || []).forEach(a => {
    const s = new Date(a.startDate), e = new Date(a.endDate);
    if (s.toISOString().slice(11) !== '00:00:00.000Z' ||
        Math.round((e - s) / DAY_MS) !== (t.durationDays || 1) - 1) badDates.push(`${t.name} ${s.toISOString()}`);
  }));
  check('ngay khoi hanh theo quy uoc (00:00 UTC, endDate = start + so ngay - 1)', badDates.length === 0,
    badDates.slice(0, 3).join(', '));

  // --- (2) booking gan voi chuyen, so cho dung ---
  const activeFuture = await Booking.find({
    status: { $nin: ['cancelled', 'completed'] }, departureDate: { $gt: new Date() }
  }).lean();
  const unlinked = activeFuture.filter(b => !b.departureId);
  check('booking sap toi deu gan voi mot chuyen khoi hanh', unlinked.length === 0,
    `${unlinked.length}/${activeFuture.length} booking chua gan chuyen`);

  const linked = await Booking.find({ departureId: { $ne: null }, status: { $ne: 'cancelled' } }).lean();
  const takenByDep = {};
  linked.forEach(b => { takenByDep[String(b.departureId)] = (takenByDep[String(b.departureId)] || 0) + seatsFor(b); });
  const slotMismatch = [];
  fresh.forEach(t => (t.availability || []).forEach(a => {
    const expected = (t.maxGroupSize || 20) - (takenByDep[String(a._id)] || 0);
    if (a.availableSlots !== expected) slotMismatch.push(`${t.name} ${new Date(a.startDate).toISOString().slice(0, 10)}: ${a.availableSlots} vs ${expected}`);
  }));
  check('so cho = suc chua - ghe da dat (theo chuyen)', slotMismatch.length === 0,
    slotMismatch.slice(0, 3).join(', ') || `${linked.length} booking da gan chuyen`);

  // --- (3) moi so thich SmartTour co du diem / mon an the hien ---
  const poiThemes = {};
  (await Poi.find({}, { tourId: 1, themes: 1 }).lean()).forEach(p => {
    const k = String(p.tourId);
    poiThemes[k] = poiThemes[k] || {};
    (p.themes || []).forEach(th => { poiThemes[k][th] = (poiThemes[k][th] || 0) + 1; });
  });
  const interestGaps = [];
  fresh.forEach(t => (t.themes || []).filter(th => SMARTTOUR_INTERESTS.includes(th)).forEach(th => {
    let support = poiThemes[String(t._id)]?.[th] || 0;
    if (th === 'food') support += (t.food || []).length; // mon dac san cho bua trua / toi
    if (support < 2) interestGaps.push(`${t.name}:${th}(${support})`);
  }));
  check('moi so thich cua tour co >= 2 diem/mon an the hien', interestGaps.length === 0,
    interestGaps.slice(0, 8).join(', ') + (interestGaps.length > 8 ? ` ... (${interestGaps.length})` : ''));

  // --- (4) mang chang lien thong ---
  const notConnected = fresh.filter(t => new Set((t.transportLegs || []).map(l => String(l.toTourId))).size < fresh.length - 1);
  check('moi tour co chang toi moi tour khac (mang lien thong)', notConnected.length === 0,
    notConnected.map(t => `${t.name}(${(t.transportLegs || []).length})`).join(', '));

  // --- (5) tuoi toi thieu ---
  const badMinAge = fresh.filter(t => typeof t.minAge !== 'number' || t.minAge < 0 || t.minAge > 12);
  check('moi tour co tuoi toi thieu (0-12)', badMinAge.length === 0, badMinAge.map(t => t.name).join(', '));

  // --- (6) hau can: san bay, quy dinh don/tien, gio nhan/tra phong ---
  const noLogistics = fresh.filter(t => !t.logistics?.airport?.iata || !t.operations?.latestArrival);
  check('moi tour co san bay + khung gio don/tien', noLogistics.length === 0, noLogistics.map(t => t.name).join(', '));
  const tierHotelIds = fresh.flatMap(t => (t.hotelTiers || []).map(x => x.hotelId));
  const noTimes = await Hotel.countDocuments({
    _id: { $in: tierHotelIds },
    $or: [{ 'details.checkInTime': { $in: [null, ''] } }, { 'details.checkOutTime': { $in: [null, ''] } }]
  });
  check('khach san cua tour co gio nhan/tra phong', noTimes === 0, `${noTimes} khach san thieu`);

  // --- (7) mua tu du lieu that ---
  const noSeason = fresh.filter(t => (t.seasonality?.monthly || []).length !== 12 ||
    !t.seasonality.monthly.every(m => typeof m.tmaxC === 'number' && typeof m.comfort === 'number'));
  check('moi tour co thoi tiet that 12 thang (Open-Meteo)', noSeason.length === 0,
    noSeason.map(t => t.name).join(', ') || `${fresh.length}/${fresh.length} tour`);
  const badBest = fresh.filter(t => (t.bestTimeToVisit || []).length < 3 || (t.bestTimeToVisit || []).length > 6);
  check('thang dep: 3-6 thang moi tour', badBest.length === 0, badBest.map(t => t.name).join(', '));

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
