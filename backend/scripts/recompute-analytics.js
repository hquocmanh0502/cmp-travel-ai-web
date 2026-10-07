/**
 * Tinh lai Tour.analytics tu DU LIEU THAT trong DB.
 *
 * VAN DE TRUOC KHI CHAY (do do thuc, khong phai phong doan):
 *   - analytics.bookingCount sai o 36/36 tour. Vi du Lauterbrunnen ghi 66 trong
 *     khi so booking that la 5; London ghi 33 trong khi that la 8.
 *   - analytics.viewCount tong cong 17.129 trong khi so luot xem that trong
 *     User.behavior.viewHistory chi la 679 - lech 25 lan.
 *   - popularityScore co nhieu chu so thap phan nhung khong co cong thuc nao
 *     duoc ghi lai, nen khong giai trinh duoc truoc hoi dong.
 *
 * Neu SmartTour hoac phan goi y xep hang dua tren nhung so nay thi ket qua
 * khong co co so. Doi lai, review THAT thi da co day du: 257 review, 36/36 tour
 * deu co, 4-11 review moi tour - nen diem sao van dung duoc.
 *
 * CONG THUC popularityScore (chuan hoa min-max tren toan danh muc, ket qua 0..1):
 *
 *   popularityScore = 0.40 * norm(bookingCount)
 *                   + 0.25 * norm(viewCount)
 *                   + 0.15 * norm(wishlistCount)
 *                   + 0.20 * (averageRating / 5)
 *
 *   Dat booking trong so cao nhat vi do la hanh vi that su chuyen doi; luot xem
 *   va wishlist chi la quan tam. Chuan hoa min-max thay vi chia cho hang so cung
 *   (cach cu chia cho 100/1000/50) de diem khong bi dinh tran khi du lieu lon len.
 *
 * sentimentScore duoc suy ra tu diem sao that: (rating - 3) / 2, dua ve khoang
 * -1..1. KHONG dung sentimentService vi ham do hien tai chi dem tu khoa
 * (score = 0.1 * so tu khop) nen cho ra so gan nhu vo nghia. Phan phan tich cam
 * xuc bang AI tren NOI DUNG binh luan thuoc giai doan AI, se thay the cho cho nay.
 *
 * Script chay lai duoc nhieu lan (idempotent): luon tinh tu nguon, khong cong don.
 * Tour chua co du lieu thi de 0, khong bia.
 *
 * Chay (tu thu muc backend):
 *   node scripts/recompute-analytics.js --dry-run
 *   node scripts/recompute-analytics.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Comment = require('../models/Comment');

const dryRun = process.argv.includes('--dry-run');

const WEIGHTS = { booking: 0.40, view: 0.25, wishlist: 0.15, rating: 0.20 };

/** Chuan hoa min-max. Khi moi tour cung mot gia tri thi tra 0 cho toan bo. */
function makeNormalizer(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return (v) => (span === 0 ? 0 : (v - min) / span);
}

const round = (v, d = 2) => Number(v.toFixed(d));

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  console.log(`Tim thay ${tours.length} tour.\n`);

  // --- 1. Booking that (bo cac don da huy) ---
  const bookingRows = await Booking.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: '$tourId', n: { $sum: 1 } } }
  ]);
  const bookingMap = new Map(bookingRows.map(r => [String(r._id), r.n]));

  // --- 2. Luot xem that tu User.behavior.viewHistory ---
  const viewRows = await User.aggregate([
    { $unwind: '$behavior.viewHistory' },
    { $group: { _id: '$behavior.viewHistory.tourId', n: { $sum: 1 } } }
  ]);
  const viewMap = new Map(viewRows.map(r => [String(r._id), r.n]));

  // --- 3. Wishlist that: dem SO NGUOI DUNG, khong dem so luot them ---
  const wishRows = await User.aggregate([
    { $unwind: '$behavior.wishlist' },
    { $group: { _id: { tour: '$behavior.wishlist.tourId', user: '$_id' } } },
    { $group: { _id: '$_id.tour', n: { $sum: 1 } } }
  ]);
  const wishMap = new Map(wishRows.map(r => [String(r._id), r.n]));

  // --- 4. Diem sao that tu binh luan (rating nam o content.rating) ---
  const ratingRows = await Comment.aggregate([
    { $match: { 'content.rating': { $gte: 1, $lte: 5 } } },
    { $group: { _id: '$tourId', avg: { $avg: '$content.rating' }, n: { $sum: 1 } } }
  ]);
  const ratingMap = new Map(ratingRows.map(r => [String(r._id), { avg: r.avg, n: r.n }]));

  // --- 5. Thu thap gia tri tho de chuan hoa ---
  const raw = tours.map(tour => {
    const key = String(tour._id);
    const review = ratingMap.get(key);
    return {
      tour,
      bookingCount: bookingMap.get(key) || 0,
      viewCount: viewMap.get(key) || 0,
      wishlistCount: wishMap.get(key) || 0,
      reviewCount: review ? review.n : 0,
      averageRating: review ? round(review.avg, 1) : 0
    };
  });

  const normBooking = makeNormalizer(raw.map(r => r.bookingCount));
  const normView = makeNormalizer(raw.map(r => r.viewCount));
  const normWish = makeNormalizer(raw.map(r => r.wishlistCount));

  // --- 6. Ghi ---
  const before = [];
  for (const row of raw) {
    const { tour } = row;

    before.push({
      name: tour.name,
      booking: tour.analytics?.bookingCount ?? 0,
      view: tour.analytics?.viewCount ?? 0,
      pop: tour.analytics?.popularityScore ?? 0
    });

    const popularityScore =
      WEIGHTS.booking * normBooking(row.bookingCount) +
      WEIGHTS.view * normView(row.viewCount) +
      WEIGHTS.wishlist * normWish(row.wishlistCount) +
      WEIGHTS.rating * (row.averageRating / 5);

    tour.analytics = {
      ...(tour.analytics?.toObject?.() || tour.analytics || {}),
      bookingCount: row.bookingCount,
      viewCount: row.viewCount,
      wishlistCount: row.wishlistCount,
      averageRating: row.averageRating,
      // Diem sao -> khoang [-1, 1]. 3 sao la trung tinh.
      sentimentScore: row.averageRating ? round((row.averageRating - 3) / 2, 2) : 0,
      popularityScore: round(popularityScore, 3)
    };

    // Tour.rating hien thi ngoai danh sach phai bang dung diem sao that
    tour.rating = row.averageRating;

    if (!dryRun) await tour.save();
  }

  // ------------------------------- bao cao -------------------------------
  const sum = (f) => raw.reduce((a, r) => a + f(r), 0);
  console.log('--- Tong hop tu nguon that ---');
  console.log(`  booking (chua huy) : ${sum(r => r.bookingCount)}`);
  console.log(`  luot xem           : ${sum(r => r.viewCount)}`);
  console.log(`  wishlist (nguoi)   : ${sum(r => r.wishlistCount)}`);
  console.log(`  review co diem sao : ${sum(r => r.reviewCount)}`);
  console.log(`  tour co >=1 review : ${raw.filter(r => r.reviewCount > 0).length}/${raw.length}`);
  console.log(`  tour co 0 booking  : ${raw.filter(r => r.bookingCount === 0).length}`);

  console.log('\n--- So sanh truoc / sau (10 tour dau) ---');
  console.log('tour            booking(cu->moi)  view(cu->moi)   pop(cu->moi)');
  raw.slice(0, 10).forEach((r, i) => {
    const b = before[i];
    console.log(
      `${r.tour.name.padEnd(15)} ${String(b.booking).padStart(3)} -> ${String(r.bookingCount).padStart(3)}` +
      `        ${String(b.view).padStart(5)} -> ${String(r.viewCount).padStart(3)}` +
      `      ${b.pop.toFixed(2)} -> ${r.tour.analytics.popularityScore.toFixed(2)}`
    );
  });

  const top = [...raw].sort((a, b) => b.tour.analytics.popularityScore - a.tour.analytics.popularityScore);
  console.log('\n--- 5 tour pho bien nhat theo cong thuc moi ---');
  top.slice(0, 5).forEach(r => {
    console.log(`  ${r.tour.name.padEnd(15)} pop=${r.tour.analytics.popularityScore.toFixed(3)}` +
                ` (booking ${r.bookingCount}, view ${r.viewCount}, wishlist ${r.wishlistCount}, ${r.averageRating}/5)`);
  });

  console.log('\nCong thuc: pop = 0.40*norm(booking) + 0.25*norm(view) + 0.15*norm(wishlist) + 0.20*(rating/5)');

  if (dryRun) console.log('\nDRY-RUN: chua ghi gi vao DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
