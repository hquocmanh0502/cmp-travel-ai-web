/**
 * Chuẩn bị dữ liệu để ghép TOUR <-> HƯỚNG DẪN VIÊN <-> SỞ THÍCH KHÁCH.
 *
 * Việc 1: suy ra Tour.themes từ attractions / food / description / country.
 *   Lý do: tags hiện có chỉ là popular/budget/luxury và tên nước, không nói lên
 *   tour thiên về chủ đề gì, nên không ghép được với sở trường hướng dẫn viên.
 *
 * Việc 2: điền các trường mới của TourGuide (coverage, languageSkills,
 *   specialtyThemes, groupSize, pricing, ageGroups...) và tổng hợp
 *   ratingBreakdown từ GuideReview đã có.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/seed-matching-data.js --dry-run
 *   node scripts/seed-matching-data.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const TourGuide = require('../models/TourGuide');
const GuideReview = require('../models/GuideReview');

const dryRun = process.argv.includes('--dry-run');

// ---------------------------------------------------------------- chủ đề tour

// Từ khoá -> chủ đề. Cố ý để nhiều từ khoá cho mỗi chủ đề vì tên điểm tham quan
// rất đa dạng ("Louvre Museum", "Staubbach Falls", "Grand Palace"...).
const THEME_KEYWORDS = {
  museum: ['museum', 'gallery', 'uffizi', 'louvre', 'hermitage'],
  history: ['castle', 'palace', 'ruin', 'ancient', 'fort', 'colosseum', 'acropolis', 'kremlin', 'historic', 'old town', 'tower'],
  architecture: ['cathedral', 'basilica', 'church', 'temple', 'mosque', 'shrine', 'bridge', 'square', 'tower', 'sagrada'],
  culture: ['heritage', 'traditional', 'festival', 'quarter', 'district', 'village', 'geisha', 'monastery'],
  nature: ['falls', 'waterfall', 'valley', 'park', 'garden', 'lake', 'forest', 'canyon', 'glacier', 'fjord'],
  mountain: ['mountain', 'alps', 'peak', 'summit', 'volcano', 'hill'],
  beach: ['beach', 'bay', 'coast', 'shore', 'resort'],
  island: ['island', 'atoll', 'archipelago', 'lagoon'],
  wildlife: ['zoo', 'safari', 'aquarium', 'wildlife', 'sanctuary'],
  trekking: ['trail', 'hike', 'trek', 'climb'],
  'water-sports': ['diving', 'snorkel', 'surf', 'kayak', 'cruise', 'boat'],
  shopping: ['market', 'bazaar', 'mall', 'shopping', 'street'],
  nightlife: ['nightlife', 'bar', 'club', 'casino'],
  photography: ['viewpoint', 'panorama', 'skyline', 'observation'],
  wellness: ['spa', 'onsen', 'hot spring', 'thermal']
};

/** Suy ra chủ đề của một tour từ chính dữ liệu của nó. */
function deriveThemes(tour) {
  const haystack = [
    tour.name,
    tour.description,
    ...(tour.attractions || []),
    ...(tour.food || [])
  ].join(' ').toLowerCase();

  const themes = new Set();

  for (const [theme, words] of Object.entries(THEME_KEYWORDS)) {
    if (words.some(w => haystack.includes(w))) themes.add(theme);
  }

  // Có món ăn đặc trưng thì coi như tour có yếu tố ẩm thực.
  if ((tour.food || []).length > 0) themes.add('food');

  // Chuyển tags giá sẵn có thành chủ đề, để một chỗ duy nhất mô tả tour.
  const tags = (tour.tags || []).map(t => t.toLowerCase());
  if (tags.includes('luxury')) themes.add('luxury');
  if (tags.includes('budget')) themes.add('budget');

  // Tour không có tiêu chí nào khớp vẫn nên có ít nhất một chủ đề chung.
  if (themes.size === 0) themes.add('culture');

  return [...themes];
}

// --------------------------------------------------------- hồ sơ hướng dẫn viên

/**
 * Hồ sơ nghiệp vụ cho 5 hướng dẫn viên hiện có.
 *
 * Địa bàn được chia sao cho MỌI quốc gia đang có tour đều có ít nhất một hướng
 * dẫn viên phụ trách, ưu tiên theo ngôn ngữ họ nói được.
 */
const GUIDE_PROFILES = {
  'Trần Thị Mai': {
    themes: ['food', 'shopping', 'culture', 'nightlife'],
    countries: ['Japan', 'Malaysia', 'Hong Kong', 'India'],
    regions: ['Asia'],
    levels: { Vietnamese: 'native', English: 'fluent', Korean: 'intermediate' },
    ageGroups: ['adults', 'seniors'],
    groupSize: { min: 2, max: 16 },
    perDay: 95,
    difficulty: ['easy', 'moderate'],
    highlights: [
      'Chuyên tour ẩm thực và chợ địa phương',
      'Hơn 200 lượt dẫn đoàn tại châu Á'
    ]
  },
  'Lê Hoàng Phúc': {
    themes: ['trekking', 'mountain', 'nature', 'wildlife', 'adventure', 'photography'],
    countries: ['Switzerland', 'Canada', 'Germany', 'Russia'],
    regions: ['Europe', 'North America'],
    levels: { Vietnamese: 'native', English: 'fluent', Chinese: 'intermediate' },
    ageGroups: ['teenagers', 'adults'],
    groupSize: { min: 2, max: 12 },
    perDay: 110,
    difficulty: ['moderate', 'challenging'],
    highlights: [
      'Chứng chỉ dẫn đoàn leo núi',
      'Chuyên các cung đường thiên nhiên và chụp ảnh phong cảnh'
    ]
  },
  'Võ Thị Lan': {
    themes: ['culture', 'history', 'architecture', 'museum'],
    countries: ['Italy', 'Greece', 'Thailand', 'Portugal'],
    regions: ['Europe', 'Asia'],
    levels: { Vietnamese: 'native', English: 'fluent', Thai: 'intermediate' },
    ageGroups: ['adults', 'seniors'],
    groupSize: { min: 2, max: 20 },
    perDay: 90,
    difficulty: ['easy', 'moderate'],
    highlights: [
      'Chuyên di sản văn hoá và bảo tàng',
      'Kể chuyện lịch sử theo mạch dễ hiểu cho người mới'
    ]
  },
  'Phạm Minh Tuấn': {
    themes: ['beach', 'island', 'water-sports', 'wellness', 'romantic'],
    countries: ['Maldives', 'Thailand', 'Spain', 'Malaysia'],
    regions: ['Asia', 'Europe'],
    levels: { Vietnamese: 'native', English: 'fluent', Japanese: 'intermediate' },
    ageGroups: ['children', 'teenagers', 'adults'],
    groupSize: { min: 2, max: 18 },
    perDay: 100,
    difficulty: ['easy', 'moderate'],
    highlights: [
      'Bằng lặn PADI, dẫn tour biển đảo',
      'Phù hợp gia đình có trẻ nhỏ'
    ]
  },
  'Nguyễn Văn An': {
    themes: ['culture', 'history', 'photography', 'architecture', 'luxury'],
    countries: ['France', 'United Kingdom', 'Netherlands', 'Japan'],
    regions: ['Europe', 'Asia'],
    levels: { Vietnamese: 'native', English: 'fluent', French: 'fluent' },
    ageGroups: ['adults', 'seniors'],
    groupSize: { min: 2, max: 20 },
    perDay: 120,
    difficulty: ['easy', 'moderate'],
    highlights: [
      'Nói tiếng Pháp thành thạo, chuyên tuyến Tây Âu',
      'Nhiều năm dẫn đoàn khách cao cấp'
    ]
  }
};

/** Tổng hợp điểm theo từng tiêu chí từ các đánh giá đã duyệt. */
async function buildRatingBreakdown(guideId) {
  const reviews = await GuideReview.find({ guideId, status: 'approved' }).lean();
  const keys = ['knowledge', 'communication', 'professionalism', 'friendliness', 'punctuality'];
  const out = {};

  for (const key of keys) {
    const values = reviews
      .map(r => r.detailedRatings?.[key])
      .filter(v => typeof v === 'number');
    out[key] = values.length
      ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
      : 0;
  }

  return { breakdown: out, reviewCount: reviews.length };
}

// ---------------------------------------------------------------------- main

(async () => {
  await connectDB();

  // --- Phần 1: chủ đề cho tour ---
  const tours = await Tour.find({});
  const themeCount = {};
  let tourUpdated = 0;

  for (const tour of tours) {
    const themes = deriveThemes(tour);
    themes.forEach(t => { themeCount[t] = (themeCount[t] || 0) + 1; });

    if (!dryRun) {
      tour.themes = themes;
      await tour.save();
    }
    tourUpdated++;
  }

  console.log(`\nTour được gán chủ đề: ${tourUpdated}/${tours.length}`);
  console.log('Phân bố chủ đề:');
  Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, c]) => console.log(`   ${t.padEnd(14)} ${c} tour`));

  // --- Phần 2: hồ sơ hướng dẫn viên ---
  const guides = await TourGuide.find({});
  const coveredCountries = new Set();
  let guideUpdated = 0;

  console.log('\nHướng dẫn viên:');

  for (const guide of guides) {
    const profile = GUIDE_PROFILES[guide.name];
    if (!profile) {
      console.log(`   ${guide.name.padEnd(20)} (chưa có hồ sơ mẫu, bỏ qua)`);
      continue;
    }

    const { breakdown, reviewCount } = await buildRatingBreakdown(guide._id);

    guide.languageSkills = (guide.languages || []).map(lang => ({
      language: lang,
      level: profile.levels[lang] || 'fluent'
    }));
    guide.coverage = {
      countries: profile.countries,
      cities: [],
      regions: profile.regions
    };
    guide.specialtyThemes = profile.themes;
    guide.tourTypes = ['domestic', 'international'];
    guide.difficultyLevels = profile.difficulty;
    guide.groupSize = profile.groupSize;
    guide.ageGroups = profile.ageGroups;
    guide.pricing = { perDay: profile.perDay, currency: 'USD' };
    guide.ratingBreakdown = breakdown;
    guide.highlights = profile.highlights;

    if (!dryRun) await guide.save();

    profile.countries.forEach(c => coveredCountries.add(c));
    guideUpdated++;

    console.log(`   ${guide.name.padEnd(20)} ${profile.themes.slice(0, 3).join('/')} | ${profile.countries.join(', ')} | $${profile.perDay}/ngày | ${reviewCount} đánh giá`);
  }

  // --- Kiểm tra độ phủ ---
  const tourCountries = [...new Set(tours.map(t => t.country))];
  const uncovered = tourCountries.filter(c => !coveredCountries.has(c));

  console.log(`\nQuốc gia có tour: ${tourCountries.length} | đã có HDV phụ trách: ${tourCountries.length - uncovered.length}`);
  if (uncovered.length) {
    console.log('Chưa có HDV:', uncovered.join(', '));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tour cập nhật : ${tourUpdated}`);
  console.log(`HDV cập nhật  : ${guideUpdated}`);
  console.log('='.repeat(50));
  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');

  await mongoose.disconnect();
})().catch(err => {
  console.error('Thất bại:', err);
  process.exit(1);
});
