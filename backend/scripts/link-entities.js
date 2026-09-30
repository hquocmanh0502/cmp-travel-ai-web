/**
 * Nối các thực thể còn rời rạc với nhau.
 *
 * 1. Blog -> Tour: mỗi bài viết về một thành phố, nối tới tour ở thành phố đó và
 *    các tour cùng quốc gia. Chatbot nhờ vậy trả lời được "có bài viết nào về
 *    Nhật không" và trang tour gợi ý được bài đọc thêm.
 *
 * 2. GuideReview -> Booking: 23 đánh giá hướng dẫn viên đang không gắn với
 *    booking nào (bookingId rỗng 23/23), tức "đánh giá mà chưa từng đi tour".
 *    Script gắn mỗi đánh giá vào một booking đã hoàn thành có thật, đồng thời
 *    chỉnh userId và guideId cho khớp với booking đó.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/link-entities.js --dry-run
 *   node scripts/link-entities.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Blog = require('../models/Blog');
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');
const GuideReview = require('../models/GuideReview');
// GuideReview co hook post-save cap nhat diem cua huong dan vien nen phai nap model nay.
require('../models/TourGuide');

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await connectDB();

  const tours = await Tour.find({}, 'name country assignedGuide').lean();

  // ---------------------------------------------------------------- Blog
  console.log('=== Blog -> Tour ===');
  const blogs = await Blog.find({});
  let blogLinked = 0;

  for (const blog of blogs) {
    const haystack = `${blog.title} ${(blog.tags || []).join(' ')}`.toLowerCase();

    // Tour trùng tên thành phố xuất hiện trong tiêu đề hoặc tag
    const exact = tours.filter(t => haystack.includes(t.name.toLowerCase()));
    // Bổ sung tour cùng quốc gia để bài viết có nhiều gợi ý hơn
    const countries = [...new Set(exact.map(t => t.country))];
    const sameCountry = tours.filter(t =>
      countries.includes(t.country) && !exact.some(e => String(e._id) === String(t._id)));

    const related = [...exact, ...sameCountry].slice(0, 4);
    if (related.length === 0) {
      console.log(`  ! ${blog.title.slice(0, 40)} -> không tìm được tour khớp`);
      continue;
    }

    blog.relatedTours = related.map(t => t._id);
    if (!dryRun) await blog.save();
    blogLinked++;
    console.log(`  ${blog.title.slice(0, 38).padEnd(40)} -> ${related.map(t => t.name).join(', ')}`);
  }

  // --------------------------------------------------------- GuideReview
  console.log('\n=== GuideReview -> Booking ===');
  const reviews = await GuideReview.find({});
  const completed = await Booking.find({ status: 'completed' }, 'userId tourId departureDate').lean();

  // Gom booking theo tour để tìm nhanh
  const byTour = new Map();
  for (const b of completed) {
    const k = String(b.tourId);
    if (!byTour.has(k)) byTour.set(k, []);
    byTour.get(k).push(b);
  }

  const tourById = new Map(tours.map(t => [String(t._id), t]));
  // GuideReview co unique index (userId, guideId, tourId): moi khach chi danh gia
  // mot huong dan vien mot lan cho mot tour. Phai chon to hop chua dung den.
  const usedBooking = new Set();
  const usedKey = new Set();
  (await GuideReview.find({}, 'userId guideId tourId').lean())
    .forEach(r => usedKey.add([r.userId, r.guideId, r.tourId].join('|')));

  let linked = 0, orphan = 0;

  for (const review of reviews) {
    usedKey.delete([review.userId, review.guideId, review.tourId].join('|'));

    // Uu tien booking cua dung tour ma danh gia dang tro toi
    const preferred = byTour.get(String(review.tourId)) || [];
    const candidates = [...preferred, ...completed];

    let done = false;
    for (const b of candidates) {
      if (usedBooking.has(String(b._id))) continue;

      const tour = tourById.get(String(b.tourId));
      const guides = (tour?.assignedGuide || []).map(String);
      if (guides.length === 0) continue;

      const guide = guides.find(g => !usedKey.has([b.userId, g, b.tourId].join('|')));
      if (!guide) continue;

      review.bookingId = b._id;
      review.userId = b.userId;
      review.tourId = b.tourId;
      review.guideId = guide;

      usedBooking.add(String(b._id));
      usedKey.add([b.userId, guide, b.tourId].join('|'));

      if (!dryRun) await review.save();
      linked++;
      done = true;
      break;
    }
    if (!done) orphan++;
  }

  console.log(`  đã gắn booking cho ${linked}/${reviews.length} đánh giá` + (orphan ? ` (${orphan} không gắn được)` : ''));

  // ------------------------------------------------------------ tổng kết
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Blog được nối tour : ${blogLinked}/${blogs.length}`);
  console.log(`GuideReview có booking: ${linked}/${reviews.length}`);
  console.log('='.repeat(50));
  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');

  await mongoose.disconnect();
})().catch(err => { console.error('Thất bại:', err); process.exit(1); });
