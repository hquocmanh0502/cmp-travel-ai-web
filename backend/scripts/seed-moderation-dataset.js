/**
 * Tạo tập dữ liệu có nhãn cho AI kiểm duyệt (Giai đoạn 3B).
 *
 * Vì sao cần: 227 đánh giá hiện có đều là nội dung sạch và chỉ 2 bản ghi có nhãn
 * phân tích. Không có mẫu spam hay nội dung độc hại thì không thể đo được
 * Precision / Recall / F1 - mà đó chính là con số hội đồng sẽ hỏi.
 *
 * Script làm 2 việc:
 *   1. Gán nhãn 'normal' cho các đánh giá thật đã có, kèm sentiment suy từ số sao.
 *   2. Tạo thêm đánh giá SPAM, ĐỘC HẠI và LẠC ĐỀ có nhãn sẵn.
 *
 * Nội dung song ngữ Việt - Anh, vì website đang tiếng Anh nhưng khách Việt Nam
 * hoàn toàn có thể gõ tiếng Việt. Mô hình kiểm duyệt cần xử lý được cả hai.
 *
 * Trường datasetLabel là NHÃN CHUẨN (ground truth) để chấm điểm mô hình, tách
 * bạch với aiAnalysis (kết quả mô hình dự đoán) và moderation.status (quyết định
 * kiểm duyệt cuối cùng).
 *
 * Chạy (từ thư mục backend):
 *   node scripts/seed-moderation-dataset.js --dry-run
 *   node scripts/seed-moderation-dataset.js
 *   node scripts/seed-moderation-dataset.js --force   xoá mẫu cũ rồi tạo lại
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Comment = require('../models/Comment');
const Tour = require('../models/Tour');
const User = require('../models/User');

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const SEED_TAG = 'SEED-MODERATION';

// --- Mẫu nội dung vi phạm, song ngữ ---
const SPAM = [
  'Mua vé máy bay giá rẻ tại shopvexyz.com giảm 50% cho khách đặt hôm nay!!! Liên hệ 0909xxxxxx',
  'CHECK OUT MY CHANNEL youtube.com/travelcheap FOR FREE TRAVEL TIPS AND GIVEAWAYS!!!',
  'Cần tuyển cộng tác viên bán hàng online, thu nhập 15-20 triệu/tháng, inbox ngay nhé',
  'Best deals on hotels here >>> cheaphotels-deal.net <<< up to 70% OFF limited time',
  'Bán sim số đẹp giá rẻ, liên hệ zalo 0988xxxxxx để được tư vấn miễn phí',
  'Win a FREE iPhone!!! Just click this link and register: bit.ly/freephone2026',
  'Dịch vụ làm visa nhanh, giá tốt, cam kết đậu 99%. Gọi ngay 1900xxxx',
  'FOLLOW ME ON INSTAGRAM @travel_deals_vn FOR DISCOUNT CODES!!!!!',
  'Đầu tư crypto lợi nhuận 30%/tháng, nhắn tin để biết thêm chi tiết',
  'Cho thuê xe du lịch giá rẻ toàn quốc, liên hệ website xedulich24h.vn'
];

const TOXIC = [
  'Hướng dẫn viên ngu như bò, không biết gì mà cũng đi làm nghề này',
  'This company is run by thieves and liars. Absolute scam, never book with them.',
  'Thằng tài xế mất dạy, chửi khách hàng. Công ty rác rưởi.',
  'Worst guide ever, the guy is an idiot and should be fired immediately',
  'Lũ lừa đảo, ăn cắp tiền của khách. Tôi sẽ kiện các người ra toà',
  'Shut up and refund my money you scammers, I will destroy your reputation',
  'Nhân viên hỗn láo, thái độ như chó. Không bao giờ quay lại',
  'These people are garbage, the so-called guide was a complete moron'
];

const OFFTOPIC = [
  'Ai biết chỗ nào sửa điện thoại uy tín ở Hà Nội không ạ?',
  'Does anyone know the football score last night? Missed the match while travelling.',
  'Mình đang tìm phòng trọ khu vực quận 7, ai biết chỉ giúp với',
  'Can someone recommend a good laptop for video editing? Budget around 1500 USD.',
  'Hôm nay trời đẹp quá mọi người ơi',
  'Chúc mừng sinh nhật bạn tôi nhé hehe'
];

// Đánh giá bình thường bằng tiếng Việt, để tập dữ liệu không chỉ toàn tiếng Anh
const NORMAL_VI = [
  'Chuyến đi rất đáng tiền. Hướng dẫn viên nhiệt tình, lịch trình hợp lý, khách sạn sạch sẽ.',
  'Tour ổn, cảnh đẹp, đồ ăn ngon. Chỉ tiếc là thời gian tự do hơi ít.',
  'Mình đi cùng gia đình, các bé rất thích. Xe đưa đón đúng giờ, hướng dẫn viên vui tính.',
  'Khách sạn hơi xa trung tâm nhưng phòng rộng và sạch. Nhìn chung hài lòng.',
  'Lịch trình khá dày, đi về khá mệt. Nhưng bù lại được tham quan nhiều nơi.',
  'Giá hơi cao so với chất lượng dịch vụ. Hướng dẫn viên thì tốt, không có gì để chê.'
];

function makeRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Sentiment suy từ số sao - dùng làm nhãn tham chiếu cho bài toán phân tích cảm xúc. */
function sentimentFromRating(rating) {
  if (rating >= 4) return { score: 0.6 + (rating - 4) * 0.35, label: 'positive', confidence: 0.85 };
  if (rating === 3) return { score: 0, label: 'neutral', confidence: 0.7 };
  return { score: -0.5 - (3 - rating) * 0.2, label: 'negative', confidence: 0.85 };
}

const hasVietnamese = (text) =>
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(text);

(async () => {
  await connectDB();

  if (force && !dryRun) {
    const del = await Comment.deleteMany({ 'verified.bookingId': { $regex: `^${SEED_TAG}` } });
    console.log(`Đã xoá ${del.deletedCount} mẫu kiểm duyệt cũ`);
  }

  // ---- 1. Gán nhãn cho đánh giá thật đã có ----
  const real = await Comment.find({ datasetLabel: null, 'verified.bookingId': { $not: /^SEED-MODERATION/ } });
  let labelled = 0;

  for (const c of real) {
    const rating = c.content?.rating || 3;
    c.datasetLabel = 'normal';
    c.aiAnalysis = {
      ...(c.aiAnalysis ? JSON.parse(JSON.stringify(c.aiAnalysis)) : {}),
      sentiment: sentimentFromRating(rating),
      language: hasVietnamese(c.content?.text || '') ? 'vi' : 'en',
      toxicity: 0.02
    };
    if (!dryRun) await c.save();
    labelled++;
  }
  console.log(`Đã gán nhãn 'normal' cho ${labelled} đánh giá thật`);

  // ---- 2. Tạo mẫu vi phạm ----
  const tours = await Tour.find({}, '_id name').lean();
  const users = await User.find({ email: /@example\.com$/ }, '_id').lean();

  if (users.length === 0) {
    console.error('Không có tài khoản mẫu nào để gán đánh giá.');
    await mongoose.disconnect();
    return;
  }

  const groups = [
    { label: 'spam', items: SPAM, toxicity: 0.15, status: 'rejected' },
    { label: 'toxic', items: TOXIC, toxicity: 0.88, status: 'rejected' },
    { label: 'offtopic', items: OFFTOPIC, toxicity: 0.05, status: 'pending' },
    { label: 'normal', items: NORMAL_VI, toxicity: 0.02, status: 'approved' }
  ];

  const rnd = makeRandom(20260930);
  const counts = {};
  let created = 0;

  for (const group of groups) {
    for (const [i, text] of group.items.entries()) {
      const tour = tours[Math.floor(rnd() * tours.length)];
      const user = users[Math.floor(rnd() * users.length)];
      const rating = group.label === 'normal' ? 3 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 2);

      const daysAgo = Math.floor(rnd() * 90) + 1;
      const when = new Date();
      when.setDate(when.getDate() - daysAgo);

      if (!dryRun) {
        await Comment.create({
          tourId: tour._id,
          userId: user._id,
          content: { text, rating },
          datasetLabel: group.label,
          // Nội dung vi phạm thì không phải khách đã đi tour - đúng thực tế,
          // spam thường đến từ tài khoản chưa từng mua hàng.
          verified: { isVerified: group.label === 'normal', bookingId: `${SEED_TAG}:${group.label}:${i}` },
          aiAnalysis: {
            sentiment: sentimentFromRating(rating),
            language: hasVietnamese(text) ? 'vi' : 'en',
            toxicity: group.toxicity
          },
          moderation: { status: group.status, autoModerated: false },
          isPublic: group.status === 'approved',
          timestamps: { createdAt: when, updatedAt: when }
        });
      }
      counts[group.label] = (counts[group.label] || 0) + 1;
      created++;
    }
  }

  // ---- Thống kê ----
  const all = dryRun ? [] : await Comment.find({}, 'datasetLabel aiAnalysis.language').lean();
  console.log(`\n${'='.repeat(52)}`);
  console.log(`Mẫu vi phạm tạo mới: ${created}`);
  Object.entries(counts).forEach(([k, v]) => console.log(`   ${k.padEnd(10)} ${v}`));

  if (!dryRun) {
    const byLabel = {};
    const byLang = {};
    all.forEach(c => {
      byLabel[c.datasetLabel || 'chưa gán'] = (byLabel[c.datasetLabel || 'chưa gán'] || 0) + 1;
      const l = c.aiAnalysis?.language || '?';
      byLang[l] = (byLang[l] || 0) + 1;
    });
    console.log(`\nToàn bộ tập dữ liệu (${all.length} bản ghi):`);
    Object.entries(byLabel).forEach(([k, v]) => console.log(`   ${k.padEnd(10)} ${v}`));
    console.log(`Ngôn ngữ: ${Object.entries(byLang).map(([k, v]) => `${k} ${v}`).join(' | ')}`);
  }
  console.log('='.repeat(52));
  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');

  await mongoose.disconnect();
})().catch(err => { console.error('Thất bại:', err); process.exit(1); });
