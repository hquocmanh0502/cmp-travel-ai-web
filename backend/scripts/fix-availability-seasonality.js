/**
 * Lam cho Tour.availability phan anh mua vu va so cho con that.
 *
 * VAN DE TRUOC KHI CHAY:
 *   - Moi tour deu dung 10 chuyen, va availability.price bang dung gia co ban o
 *     TAT CA cac chuyen. Nen SmartTour khong tra loi duoc "di thang nao re hon".
 *   - availableSlots giong het nhau trong cung mot tour (vi du 12 cho o ca 10
 *     chuyen) va khong lien quan gi den so booking that - trong khi DB co 227
 *     booking that co departureDate.
 *
 * CACH SUA:
 *   1. Gia theo mua, dua tren bestTimeToVisit - tu 2026-10-19 suy tu thoi tiet
 *      that (scripts/fetch-seasonality.js). Xem services/seasonalPricing.js:
 *        - thang chinh mua  : +20%
 *        - thang giap mua   : +8%   (lien ke thang chinh mua)
 *        - thang thap diem  : -15%
 *        - con lai          : gia co ban
 *      Lam tron den $10 cho giong bang gia that.
 *
 *   2. So cho = maxGroupSize cua tour, TRU so khach da dat that o chuyen do
 *      (dem theo Booking.departureId - booking gan voi dung chuyen).
 *      Nho vay con so hien ra man hinh la so cho con that.
 *
 *   3. TAN SUAT chuyen theo do pho bien: tour pho bien mo chuyen day hon
 *      (moi ~20 ngay) thay vi thua (moi ~45 ngay). Dung analytics.popularityScore
 *      (vua duoc tinh lai tu du lieu that). Moi tour deu phu tron 12 thang, nen
 *      so chuyen khac nhau la do tan suat khac nhau chu khong phai do cat ngan lich.
 *
 * Chay lai duoc nhieu lan: luon tinh tu gia co ban va booking that, khong cong don.
 *
 * Chay (tu thu muc backend):
 *   node scripts/fix-availability-seasonality.js --dry-run
 *   node scripts/fix-availability-seasonality.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');

const dryRun = process.argv.includes('--dry-run');

// Cong thuc gia theo mua dung chung voi luc tinh tien (services/pricingService.js)
const { MONTHS, buildSeasonFactors, calendarMonth, round10 } = require('../services/seasonalPricing');

// Tan suat mo chuyen theo do pho bien (so ngay giua hai chuyen)
const INTERVAL_POPULAR = 20;
const INTERVAL_QUIET = 45;
// Lich phai phu tron mot nam de moi tour deu co chuyen trong va ngoai mua
const SCHEDULE_SPAN_DAYS = 330;
const MAX_DEPARTURES = 30; // chan an toan

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  console.log(`Tim thay ${tours.length} tour.\n`);

  // Dem khach da dat that theo (tourId, ngay khoi hanh)
  // Dem theo CHUYEN (Booking.departureId). Truoc day dem theo ngay departureDate,
  // nhung booking luu ngay tu do nen khong khop chuyen nao (0/227).
  // Em be khong tinh ghe - cung cach voi services/departureService.seatsFor.
  const bookingRows = await Booking.aggregate([
    { $match: { status: { $ne: 'cancelled' }, departureId: { $ne: null } } },
    {
      $group: {
        _id: '$departureId',
        guests: { $sum: { $add: ['$adults', { $ifNull: ['$children', 0] }] } }
      }
    }
  ]);

  const bookedMap = new Map();
  bookingRows.forEach(r => bookedMap.set(String(r._id), r.guests));
  console.log(`Co ${bookingRows.length} chuyen da co khach dat that.\n`);

  const priceSpread = [];
  const slotValues = new Set();
  const departureCounts = {};
  let matchedDepartures = 0;

  for (const tour of tours) {
    const basePrice = tour.estimatedCost;
    const factors = buildSeasonFactors(tour);
    const capacity = tour.maxGroupSize || 20;

    // Tour cang pho bien thi chuyen cang day
    const pop = tour.analytics?.popularityScore || 0;
    const intervalDays = Math.round(INTERVAL_QUIET - pop * (INTERVAL_QUIET - INTERVAL_POPULAR));

    const existing = tour.availability || [];

    // Giu nguyen cac chuyen dang co (khong xoa de khong lam mat booking da gan),
    // chi dieu chinh gia va so cho. Chuyen mo them cach nhau 1 THANG chu khong
    // phai 2 tuan: lich hien tai chi trai dai 5 thang nen co tour (Moscow,
    // Kazan, Delhi) khong co chuyen nao roi vao mua dep, va the la ca 10 chuyen
    // cung mot muc gia - SmartTour khong tra loi duoc "di thang nao re hon".
    const departures = [...existing];

    if (departures.length) {
      const last = departures[departures.length - 1];
      const durationDays = tour.durationDays || 5;
      let cursor = new Date(last.startDate);

      // Lich phai trai dai it nhat 12 thang. Neu khong, se co tour khong co
      // chuyen nao roi vao mua dep va ca lich cung mot muc gia - Moscow, Kazan,
      // Delhi truoc day co 10 chuyen gon trong 5 thang, deu nam ngoai mua.
      const firstStart = new Date(departures[0].startDate).getTime();
      const spansFullYear = () =>
        cursor.getTime() - firstStart >= SCHEDULE_SPAN_DAYS * 24 * 3600 * 1000;

      while (!spansFullYear() && departures.length < MAX_DEPARTURES) {
        cursor = new Date(cursor.getTime() + intervalDays * 24 * 3600 * 1000);
        // endDate = ngay cuoi tour (tra phong) = start + (so ngay - 1)
        const endDate = new Date(cursor.getTime() + (durationDays - 1) * 24 * 3600 * 1000);
        departures.push({
          startDate: new Date(cursor),
          endDate,
          availableSlots: capacity,
          // De TRONG co y: dung lai guideId cua chuyen cuoi se tao lai dung loi
          // "mot huong dan vien dan nhieu tour cung ngay" da sua truoc day.
          // Chay scripts/build-guide-schedule.js sau script nay de phan cong.
          guideId: undefined,
          price: basePrice
        });
      }
    }

    for (const dep of departures) {
      const start = new Date(dep.startDate);
      const factor = factors[calendarMonth(start)];

      dep.price = round10(basePrice * factor);

      const booked = dep._id ? (bookedMap.get(String(dep._id)) || 0) : 0;
      if (booked > 0) matchedDepartures++;

      dep.availableSlots = Math.max(0, capacity - booked);
      slotValues.add(dep.availableSlots);
    }

    tour.availability = departures;
    departureCounts[departures.length] = (departureCounts[departures.length] || 0) + 1;

    const prices = departures.map(d => d.price);
    priceSpread.push({
      name: tour.name,
      base: basePrice,
      min: Math.min(...prices),
      max: Math.max(...prices),
      distinct: new Set(prices).size,
      departures: departures.length
    });

    if (!dryRun) await tour.save();
  }

  // ------------------------------- bao cao -------------------------------
  console.log('--- Gia theo mua (5 tour dau) ---');
  console.log('tour            co ban    thap -> cao     so muc gia  so chuyen');
  priceSpread.slice(0, 5).forEach(p => {
    console.log(`${p.name.padEnd(15)} $${String(p.base).padStart(5)}   $${String(p.min).padStart(5)} -> $${String(p.max).padStart(5)}` +
                `      ${String(p.distinct).padStart(2)}         ${p.departures}`);
  });

  const flat = priceSpread.filter(p => p.distinct === 1);
  console.log(`\nTour chi co MOT muc gia: ${flat.length}/${tours.length}` +
              (flat.length ? ` (${flat.map(p => p.name).join(', ')})` : ''));

  console.log(`\nSo chuyen: ` + Object.entries(departureCounts).sort((a, b) => a[0] - b[0])
    .map(([k, v]) => `${k} chuyen x${v} tour`).join(' | '));

  const slots = [...slotValues].sort((a, b) => a - b);
  console.log(`\nSo cho con - cac gia tri khac nhau: ${slots.join(', ')}`);
  console.log(`Chuyen bi tru cho vi co khach dat that: ${matchedDepartures}`);
  if (matchedDepartures === 0) {
    console.log('  (Dung nhu vay: ca 227 booking trong DB deu la chuyen DA QUA');
    console.log('   (2025-12 -> 2026-08), con lich mo ban la tuong lai (tu 2026-10).');
    console.log('   So cho se tu giam khi co don dat moi.)');
  }

  const example = priceSpread.find(p => p.name === 'Lauterbrunnen') || priceSpread[0];
  const tour = tours.find(t => t.name === example.name);
  console.log(`\nVi du ${tour.name} (mua dep: ${(tour.bestTimeToVisit || []).join(', ')}):`);
  tour.availability.slice(0, 6).forEach(d => {
    const dt = new Date(d.startDate);
    console.log(`  ${dt.toISOString().slice(0, 10)}  ${MONTHS[calendarMonth(dt)].padEnd(10)} $${String(d.price).padStart(5)}   con ${d.availableSlots} cho`);
  });

  if (dryRun) console.log('\nDRY-RUN: chua ghi gi vao DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
