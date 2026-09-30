/**
 * Sửa hai vấn đề của dữ liệu hướng dẫn viên.
 *
 * 1. NGÔN NGỮ: bio và highlights đang tiếng Việt trong khi toàn bộ website là
 *    tiếng Anh. Chuyển hết sang tiếng Anh cho đồng bộ.
 *
 * 2. KHÔNG CÓ LỰA CHỌN: 28/36 tour chỉ được gán 1 hướng dẫn viên, nên màn hình
 *    "chọn hướng dẫn viên" không có gì để chọn. Nguyên nhân: lần gán trước chạy
 *    khi hệ thống mới có 5 người. Giờ đã có 15 người nên gán lại 3 người mỗi tour,
 *    xếp hạng bằng chính thuật toán ghép ở services/matchingService.js.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/fix-guide-data.js --dry-run
 *   node scripts/fix-guide-data.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const TourGuide = require('../models/TourGuide');
const { scoreGuideForTour } = require('../services/matchingService');

const dryRun = process.argv.includes('--dry-run');
const GUIDES_PER_TOUR = 3;

// Bản tiếng Anh cho bio và highlights, giữ nguyên nội dung nghiệp vụ.
const ENGLISH_PROFILES = {
  'Trần Thị Mai': {
    bio: 'Culinary guide with 7 years of experience leading food and market tours across Asia. Known for finding the stalls tourists never notice.',
    highlights: ['Specialises in food tours and local markets', 'Over 200 group tours led across Asia']
  },
  'Lê Hoàng Phúc': {
    bio: 'Certified mountain guide focused on trekking, nature and wildlife photography. Comfortable leading multi-day routes at altitude.',
    highlights: ['Certified mountain trekking guide', 'Specialises in nature routes and landscape photography']
  },
  'Võ Thị Lan': {
    bio: 'Cultural heritage specialist with deep knowledge of history, temples and traditional crafts. Nine years guiding heritage tours.',
    highlights: ['Specialises in cultural heritage and museums', 'Explains history in a clear way for first-time visitors']
  },
  'Phạm Minh Tuấn': {
    bio: 'PADI-certified guide for beach and island tours. Experienced with families and first-time snorkellers.',
    highlights: ['PADI diving licence, leads beach and island tours', 'Well suited to families with young children']
  },
  'Nguyễn Văn An': {
    bio: 'Fluent French speaker specialising in Western Europe. Years of experience with premium and private groups.',
    highlights: ['Fluent in French, specialises in Western Europe', 'Extensive experience with premium travellers']
  },
  'Đặng Thu Hà': {
    bio: 'Southern Europe specialist with nearly 8 years guiding heritage cities in Italy and Greece.',
    highlights: ['Fluent in Italian', 'Specialises in UNESCO heritage sites around the Mediterranean']
  },
  'Bùi Quang Huy': {
    bio: 'Central Europe guide, fluent in German and very familiar with the European rail network.',
    highlights: ['Fluent in German', 'Expert at cross-border travel by train']
  },
  'Ngô Thanh Vân': {
    bio: 'Lived in Kyoto for six years. Specialises in Japanese culture, cuisine and photography tours.',
    highlights: ['Native Japanese speaker', 'Lived in Kyoto for six years']
  },
  'Hoàng Đức Thắng': {
    bio: 'Graduated in Moscow, specialising in Russian routes with more than 12 years of experience.',
    highlights: ['Fluent in Russian', 'Specialises in Russian museums and architecture']
  },
  'Lý Mỹ Linh': {
    bio: 'Shopping and street-food specialist across Chinese-speaking destinations.',
    highlights: ['Native Chinese speaker', 'Knows every night market worth visiting']
  },
  'Trịnh Bảo Nam': {
    bio: 'Iberian peninsula specialist combining beaches, cuisine and nightlife.',
    highlights: ['Fluent in Spanish', 'Specialises in Spain and Portugal routes']
  },
  'Phan Kiều Anh': {
    bio: 'Serves premium travellers on France and UK routes, with a focus on private experiences.',
    highlights: ['Fluent in French', 'Specialises in luxury and honeymoon travel']
  },
  'Vũ Đình Khoa': {
    bio: 'Mountain guide with wilderness rescue certification, specialising in the Rockies and the Alps.',
    highlights: ['Wilderness rescue certified', 'Specialises in the Rockies and the Alps']
  },
  'Đỗ Hải Yến': {
    bio: 'Beach and island guide for families with children, holds a first-aid certificate.',
    highlights: ['First-aid certified', 'Excellent with families travelling with small children']
  },
  'Nguyễn Trọng Tín': {
    bio: 'India specialist with strong knowledge of local culture and regional cuisine.',
    highlights: ['Speaks Hindi', 'Specialises in Northern India routes']
  }
};

(async () => {
  await connectDB();

  // ---------------------------------------------------- 1. Chuyển sang tiếng Anh
  const guides = await TourGuide.find({});
  let translated = 0;

  for (const guide of guides) {
    const profile = ENGLISH_PROFILES[guide.name];
    if (!profile) {
      console.log(`  ! ${guide.name}: chưa có bản tiếng Anh`);
      continue;
    }
    guide.bio = profile.bio;
    guide.highlights = profile.highlights;
    if (!dryRun) await guide.save();
    translated++;
  }
  console.log(`Đã chuyển sang tiếng Anh: ${translated}/${guides.length} hướng dẫn viên`);

  // ------------------------------------------------- 2. Gán lại hướng dẫn viên
  const tours = await Tour.find({});
  const activeGuides = await TourGuide.find({ status: 'active' }).lean();
  const dist = {};
  let reassigned = 0;

  for (const tour of tours) {
    // Xếp hạng bằng đúng thuật toán mà API gợi ý đang dùng, để danh sách gán sẵn
    // và danh sách gợi ý không mâu thuẫn nhau.
    const ranked = activeGuides
      .map(g => ({ g, ...scoreGuideForTour(g, tour) }))
      .sort((a, b) => b.score - a.score);

    // Chỉ lấy người thực sự phù hợp (có điểm), tối đa 3 người.
    const chosen = ranked.filter(r => r.score > 0.2).slice(0, GUIDES_PER_TOUR);
    const list = chosen.length ? chosen : ranked.slice(0, 1);

    tour.assignedGuide = list.map(r => r.g._id);
    if (!dryRun) await tour.save();

    dist[list.length] = (dist[list.length] || 0) + 1;
    reassigned++;

    if (reassigned <= 3) {
      console.log(`  ${tour.name.padEnd(14)} ${tour.country.padEnd(14)} -> ` +
        list.map(r => `${r.g.name} (${Math.round(r.score * 100)}%)`).join(', '));
    }
  }

  console.log(`\nĐã gán lại ${reassigned} tour`);
  console.log('Số HDV mỗi tour:', Object.entries(dist).sort()
    .map(([k, v]) => `${k} người: ${v} tour`).join(' | '));

  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');
  await mongoose.disconnect();
})().catch(err => { console.error('Thất bại:', err); process.exit(1); });
