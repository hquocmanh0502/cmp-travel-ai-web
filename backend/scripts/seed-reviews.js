/**
 * Sinh dữ liệu đánh giá cho các tour.
 *
 * Bối cảnh: DB chỉ có 2 đánh giá cho 36 tour, nên sau khi bỏ số sao viết cứng thì
 * gần như mọi tour hiện "No reviews yet". Script này tạo dữ liệu thật để trang
 * destination có số sao, trang chi tiết có biểu đồ phân bố, và Giai đoạn 3
 * (AI kiểm duyệt) có dữ liệu để đo precision/recall.
 *
 * Dữ liệu được tạo theo chuỗi NHẤT QUÁN, không phải đánh giá lơ lửng:
 *   người dùng -> booking đã hoàn thành -> đánh giá đã xác minh
 * Nhờ vậy dashboard có doanh thu, và ràng buộc "phải đi tour mới được đánh giá"
 * vẫn đúng.
 *
 * Nội dung đánh giá bám theo từng tour (điểm tham quan, món ăn, quốc gia) nên
 * không bị lặp lại giống nhau.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/seed-reviews.js --dry-run
 *   node scripts/seed-reviews.js
 *   node scripts/seed-reviews.js --force    xoá dữ liệu seed cũ rồi tạo lại
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Comment = require('../models/Comment');
const { calculateVIPLevel } = require('../services/vipService');

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

// Dấu nhận biết dữ liệu do script tạo, để có thể dọn lại mà không đụng dữ liệu thật.
const SEED_TAG = 'SEED-REVIEW';

const MIN_REVIEWS = 4;
const MAX_REVIEWS = 8;

// Phân bố sao thực tế của một sản phẩm du lịch tốt: phần lớn 4-5 sao,
// vẫn có vài đánh giá thấp để biểu đồ trông thật và để AI kiểm duyệt có cái mà học.
const RATING_WEIGHTS = [
  { rating: 5, weight: 50 },
  { rating: 4, weight: 34 },
  { rating: 3, weight: 10 },
  { rating: 2, weight: 4 },
  { rating: 1, weight: 2 }
];

// Danh sach nguoi danh gia sinh tu kho ho + ten, de co du so luong khach hang.
// Truoc day chi co 24 nguoi nen ai cung tren 6 booking va deu len hang diamond,
// lam bang Top VIP mat y nghia.
const FIRST_NAMES = [
  'Emma', 'James', 'Sofia', 'Liam', 'Olivia', 'Noah', 'Mia', 'Lucas',
  'Chloe', 'Ethan', 'Hannah', 'Daniel', 'Grace', 'Anh', 'Mateo', 'Ava',
  'Leon', 'Isabella', 'Minh', 'Sarah', 'Victor', 'Yuki', 'Oscar', 'Priya'
];
const LAST_NAMES = [
  'Wilson', 'Carter', 'Rossi', 'Nguyen', 'Brown', 'Tanaka', 'Hernandez',
  'Meyer', 'Dubois', 'Clark', 'Kim', 'Silva'
];

const REVIEWERS = Array.from({ length: 60 }, (_, i) => [
  `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`,
  i % 2 === 0 ? 'female' : 'male'
]);

// Câu mở đầu theo mức sao
const OPENERS = {
  5: ['An outstanding trip from start to finish.', 'Easily one of the best trips we have taken.', 'Everything went perfectly.'],
  4: ['A really enjoyable trip overall.', 'Very good experience with a few small things to improve.', 'We had a great time.'],
  3: ['A decent trip, but not without problems.', 'It was fine, though I expected a bit more.', 'Mixed feelings about this one.'],
  2: ['Unfortunately this trip did not meet our expectations.', 'Several things went wrong during the tour.', 'Disappointing for the price we paid.'],
  1: ['Very disappointed with this tour.', 'I would not book this again.', 'The trip had serious problems.']
};

const CLOSERS = {
  5: ['Highly recommended.', 'Would book with CMP Travel again without hesitation.', 'Worth every dollar.'],
  4: ['Would recommend to friends.', 'Good value overall.', 'I would travel with them again.'],
  3: ['Might be worth it if the price is right.', 'Average value for money.', 'Consider it, but read the details carefully.'],
  2: ['Hard to recommend at this price.', 'Hope the company improves the organisation.', 'Not great value.'],
  1: ['I cannot recommend this tour.', 'Please improve the service.', 'Requesting better communication next time.']
};

const ASPECT_NOTES = {
  positive: {
    guide: ['Our guide was knowledgeable and patient', 'The guide spoke clearly and answered every question'],
    accommodation: ['The hotel was clean and well located', 'Rooms were comfortable and quiet'],
    food: ['The food was a highlight', 'Meals were tasty and generous'],
    transportation: ['Transfers were punctual', 'Transport was comfortable throughout'],
    activities: ['The daily activities were well paced', 'The itinerary was well organised']
  },
  negative: {
    guide: ['The guide seemed rushed and hard to follow', 'Communication from the guide could be much better'],
    accommodation: ['The hotel was further from the centre than expected', 'The room was noisy at night'],
    food: ['Meals were repetitive after a few days', 'Food options were limited for our group'],
    transportation: ['Transfers were late more than once', 'The bus was uncomfortable on long drives'],
    activities: ['The schedule felt rushed', 'Too little free time between activities']
  }
};

const COMPANIONS = ['solo', 'couple', 'family', 'friends', 'business'];

// ------------------------------------------------------------------ tiện ích

/** Bộ sinh số giả ngẫu nhiên có hạt giống: chạy lại cho ra đúng kết quả cũ. */
function makeRandom(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const intBetween = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));

function pickRating(rnd) {
  const total = RATING_WEIGHTS.reduce((s, r) => s + r.weight, 0);
  let roll = rnd() * total;
  for (const row of RATING_WEIGHTS) {
    roll -= row.weight;
    if (roll <= 0) return row.rating;
  }
  return 5;
}

/** Điểm từng hạng mục dao động quanh điểm tổng, luôn nằm trong 1..5. */
function detailedFrom(rnd, rating) {
  const jitter = () => Math.max(1, Math.min(5, rating + intBetween(rnd, -1, 1)));
  return {
    guide: jitter(),
    accommodation: jitter(),
    transportation: jitter(),
    food: jitter(),
    activities: jitter(),
    valueForMoney: jitter()
  };
}

/** Viết nội dung đánh giá bám theo dữ liệu thật của tour. */
function writeReview(rnd, tour, rating) {
  const positive = rating >= 4;
  const notes = positive ? ASPECT_NOTES.positive : ASPECT_NOTES.negative;
  const aspects = Object.keys(notes);

  const attraction = (tour.attractions || [])[intBetween(rnd, 0, Math.max(0, (tour.attractions || []).length - 1))];
  const dish = (tour.food || [])[intBetween(rnd, 0, Math.max(0, (tour.food || []).length - 1))];

  const parts = [pick(rnd, OPENERS[rating])];

  if (attraction) {
    parts.push(positive
      ? `${attraction} was the highlight of the trip.`
      : `${attraction} was crowded and we had very little time there.`);
  }

  // Hai nhận xét về hai hạng mục khác nhau
  const first = pick(rnd, aspects);
  const second = pick(rnd, aspects.filter(a => a !== first));
  parts.push(`${pick(rnd, notes[first])}.`);
  parts.push(`${pick(rnd, notes[second])}.`);

  if (dish && rating >= 3) parts.push(`Trying ${dish} was a nice touch.`);

  parts.push(pick(rnd, CLOSERS[rating]));

  return parts.join(' ');
}

const ADMIN_REPLIES = [
  'Thank you for travelling with CMP Travel and for taking the time to share your experience!',
  'We really appreciate your feedback and will pass it on to the team.',
  'Thank you for your honest review. We are sorry about the issues you mentioned and are working to improve them.'
];

// ---------------------------------------------------------------------- main

(async () => {
  await connectDB();

  // --- 1. Người đánh giá ---
  const reviewers = [];
  let createdUsers = 0;

  for (const [fullName, gender] of REVIEWERS) {
    const email = fullName.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com';
    let user = await User.findOne({ email });

    if (!user) {
      if (dryRun) {
        reviewers.push({ _id: new mongoose.Types.ObjectId(), fullName, email, phone: '0900000000' });
        createdUsers++;
        continue;
      }
      user = await User.create({
        username: email.split('@')[0],
        email,
        // Mật khẩu ngẫu nhiên: đây là tài khoản dữ liệu mẫu, không dùng để đăng nhập.
        password: 'Seed' + Math.random().toString(36).slice(2, 12) + '!',
        fullName,
        gender,
        phone: '09' + String(intBetween(makeRandom(fullName.length * 7), 10000000, 99999999)),
        role: 'user'
      });
      createdUsers++;
    }
    reviewers.push(user);
  }

  // --- 2. Dọn dữ liệu seed cũ nếu chạy lại ---
  if (force && !dryRun) {
    const delC = await Comment.deleteMany({ 'verified.bookingId': { $regex: `^${SEED_TAG}` } });
    const delB = await Booking.deleteMany({ 'customerInfo.specialRequests': SEED_TAG });
    console.log(`Đã xoá dữ liệu seed cũ: ${delC.deletedCount} đánh giá, ${delB.deletedCount} booking`);
  }

  // --- 3. Booking + đánh giá cho từng tour ---
  const tours = await Tour.find({});
  let totalReviews = 0;
  let totalBookings = 0;
  let skipped = 0;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const [index, tour] of tours.entries()) {
    const existing = await Comment.countDocuments({ tourId: tour._id });
    if (existing >= MIN_REVIEWS && !force) {
      skipped++;
      continue;
    }

    // Hạt giống theo tour: chạy lại cho ra cùng dữ liệu.
    const rnd = makeRandom(index * 9301 + 49297);
    const count = intBetween(rnd, MIN_REVIEWS, MAX_REVIEWS);
    const ratings = [];

    for (let i = 0; i < count; i++) {
      // Chon lech theo luy thua: r^2 keo phan lon luot chon ve dau danh sach,
      // tao ra vai khach di thuong xuyen va mot duoi dai khach di 1-2 chuyen.
      const r = rnd();
      const reviewer = reviewers[Math.floor(r * r * reviewers.length)];
      const rating = pickRating(rnd);
      ratings.push(rating);
      distribution[rating]++;

      // Chuyến đi đã diễn ra trong 12 tháng qua
      const daysAgo = intBetween(rnd, 20, 360);
      const departure = new Date();
      departure.setDate(departure.getDate() - daysAgo);

      const days = parseInt(String(tour.duration).match(/\d+/)?.[0] || '5', 10);
      const checkout = new Date(departure);
      checkout.setDate(checkout.getDate() + days - 1);

      const adults = intBetween(rnd, 1, 3);
      const children = intBetween(rnd, 0, 2);
      // Booking bat buoc phai co phong, va suc chua phai du cho so khach.
      // deluxe chua 3 nguoi, family chua 4 (xem Booking.validateRoomCapacity).
      const guests = adults + children;
      const rooms = guests <= 3
        ? { deluxe: 1 }
        : guests <= 4
          ? { family: 1 }
          : { family: 1, deluxe: Math.ceil((guests - 4) / 3) };

      const unitPrice = tour.pricing?.adult || tour.estimatedCost || 1000;
      const total = unitPrice * adults + Math.round(unitPrice * 0.7) * children;

      // Đánh giá được viết vài ngày sau khi kết thúc chuyến đi
      const reviewedAt = new Date(checkout);
      reviewedAt.setDate(reviewedAt.getDate() + intBetween(rnd, 1, 10));

      let bookingId = `${SEED_TAG}-${tour._id}-${i}`;

      if (!dryRun) {
        const booking = await Booking.create({
          userId: reviewer._id,
          tourId: tour._id,
          tourName: tour.name,
          checkinDate: departure,
          checkoutDate: checkout,
          departureDate: departure,
          bookingDate: new Date(departure.getTime() - 14 * 86400000),
          adults,
          children,
          rooms,
          customerInfo: {
            fullName: reviewer.fullName,
            email: reviewer.email,
            phone: reviewer.phone || '0900000000',
            // Dau nhan biet du lieu seed (Booking khong co truong notes)
            specialRequests: SEED_TAG
          },
          tourBaseCost: unitPrice,
          totalAmount: total,
          status: 'completed',
          // Dashboard tinh doanh thu tu paymentStatus = paid, khong phai tu status.
          paymentStatus: 'paid',
          paymentMethod: 'cmp_wallet',
          hasReviewed: true
        });
        bookingId = String(booking._id);
        totalBookings++;
      } else {
        totalBookings++;
      }

      const text = writeReview(rnd, tour, rating);

      if (!dryRun) {
        const helpfulCount = intBetween(rnd, 0, 9);
        await Comment.create({
          tourId: tour._id,
          userId: reviewer._id,
          content: {
            text,
            rating,
            detailedRating: detailedFrom(rnd, rating)
          },
          verified: {
            isVerified: true,
            // Giữ tiền tố SEED_TAG để script có thể dọn lại chính xác.
            bookingId: `${SEED_TAG}:${bookingId}`,
            verifiedAt: reviewedAt
          },
          tripDetails: {
            travelDate: departure,
            groupSize: adults + children,
            travelCompanions: pick(rnd, COMPANIONS)
          },
          // Có sẵn trạng thái đã duyệt để hiển thị ngay; Giai đoạn 3 sẽ dùng
          // chính những bản ghi này làm dữ liệu cho AI kiểm duyệt.
          moderation: { status: 'approved', autoModerated: false },
          isPublic: true,
          analytics: { helpfulCount },
          timestamps: { createdAt: reviewedAt, updatedAt: reviewedAt },
          // Khoảng 1/3 đánh giá có phản hồi của quản trị viên
          replies: rnd() < 0.33 ? [{
            text: rating >= 4 ? ADMIN_REPLIES[intBetween(rnd, 0, 1)] : ADMIN_REPLIES[2],
            isAdmin: true,
            adminName: 'CMP Travel',
            adminRole: 'customer_service',
            timestamp: new Date(reviewedAt.getTime() + 86400000),
            moderation: { processed: true, status: 'approved' }
          }] : []
        });
      }

      totalReviews++;
    }

    // --- 4. Cập nhật điểm của tour từ chính các đánh giá vừa tạo ---
    if (!dryRun) {
      const all = await Comment.find({ tourId: tour._id }, 'content.rating').lean();
      const avg = all.length
        ? Number((all.reduce((s, c) => s + (c.content?.rating || 0), 0) / all.length).toFixed(1))
        : 0;

      tour.rating = avg;
      tour.analytics = {
        ...(tour.analytics || {}),
        averageRating: avg,
        bookingCount: (tour.analytics?.bookingCount || 0) + count
      };
      await tour.save();
    }

    if (index < 3) {
      const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
      console.log(`   ${tour.name.padEnd(16)} ${count} đánh giá, trung bình ${avg}`);
    }
  }

  // --- 5. Cap nhat tong chi tieu / hang VIP cho nguoi dung ---
  //
  // Widget "Top VIP Users" sap xep theo User.totalSpent chu khong tinh tu booking.
  // Neu chi tao booking ma khong cap nhat o day thi ca bang hien totalSpent = 0
  // va ai cung la bronze.
  let vipUpdated = 0;
  if (!dryRun) {
    // Dat lai truoc khi tinh: nguoi dung o lan chay truoc co the khong con booking
    // nao (da bi --force xoa) nhung van giu totalSpent cu -> so lieu VIP bi sai.
    // Chi dung vao tai khoan mau (@example.com), khong dung toi khach that.
    await User.updateMany(
      { email: /@example.com$/ },
      { $set: { totalSpent: 0, totalBookings: 0, membershipLevel: 'bronze', vipSince: null } }
    );

    const rows = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: '$userId', spent: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    for (const row of rows) {
      const level = calculateVIPLevel(row.spent);
      await User.updateOne({ _id: row._id }, {
        $set: {
          totalSpent: row.spent,
          totalBookings: row.count,
          membershipLevel: level,
          ...(level !== 'bronze' ? { vipSince: new Date() } : {})
        }
      });
      vipUpdated++;
    }
  }

  console.log(`\n${'='.repeat(52)}`);
  console.log(`Người đánh giá tạo mới : ${createdUsers}`);
  console.log(`Booking (đã hoàn thành): ${totalBookings}`);
  console.log(`Đánh giá tạo mới       : ${totalReviews}`);
  console.log(`User cập nhật hạng VIP : ${vipUpdated}`);
  console.log(`Tour bỏ qua (đã có)    : ${skipped}${skipped ? '  -> dùng --force để làm lại' : ''}`);
  console.log(`Phân bố sao            : ${[5,4,3,2,1].map(s => `${s}★ ${distribution[s]}`).join('  ')}`);
  console.log('='.repeat(52));
  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');

  await mongoose.disconnect();
})().catch(err => {
  console.error('Thất bại:', err);
  process.exit(1);
});
