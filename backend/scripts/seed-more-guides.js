/**
 * Bổ sung hướng dẫn viên.
 *
 * Hiện chỉ có 5 người cho 36 tour ở 17 quốc gia. Ghép được về mặt kỹ thuật
 * (mỗi người phụ trách 3-4 nước) nhưng khi demo tính năng "chọn hướng dẫn viên
 * phù hợp" thì danh sách quá nghèo.
 *
 * Script thêm 10 người, điền đầy đủ các trường dùng để ghép với tour
 * (coverage, languageSkills, specialtyThemes, groupSize, pricing...).
 *
 * Chạy (từ thư mục backend):
 *   node scripts/seed-more-guides.js --dry-run
 *   node scripts/seed-more-guides.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const TourGuide = require('../models/TourGuide');
const Tour = require('../models/Tour');

const dryRun = process.argv.includes('--dry-run');

const NEW_GUIDES = [
  {
    name: 'Đặng Thu Hà', gender: 'female', experience: 8,
    languages: ['Vietnamese', 'English', 'Italian'],
    levels: { Vietnamese: 'native', English: 'fluent', Italian: 'fluent' },
    themes: ['culture', 'history', 'architecture', 'museum', 'food'],
    countries: ['Italy', 'Greece', 'Portugal'],
    regions: ['Europe'], perDay: 105, difficulty: ['easy', 'moderate'],
    ageGroups: ['adults', 'seniors'], groupSize: { min: 2, max: 18 },
    bio: 'Chuyên tuyến Nam Âu, gắn bó với các thành phố di sản của Ý và Hy Lạp gần 8 năm.',
    highlights: ['Nói tiếng Ý thành thạo', 'Chuyên di sản UNESCO vùng Địa Trung Hải']
  },
  {
    name: 'Bùi Quang Huy', gender: 'male', experience: 6,
    languages: ['Vietnamese', 'English', 'German'],
    levels: { Vietnamese: 'native', English: 'fluent', German: 'fluent' },
    themes: ['history', 'architecture', 'nightlife', 'budget'],
    countries: ['Germany', 'Netherlands', 'Switzerland'],
    regions: ['Europe'], perDay: 95, difficulty: ['easy', 'moderate'],
    ageGroups: ['teenagers', 'adults'], groupSize: { min: 2, max: 20 },
    bio: 'Hướng dẫn viên tuyến Trung Âu, thông thạo tiếng Đức và hệ thống tàu châu Âu.',
    highlights: ['Nói tiếng Đức', 'Rành di chuyển bằng tàu liên quốc gia']
  },
  {
    name: 'Ngô Thanh Vân', gender: 'female', experience: 10,
    languages: ['Vietnamese', 'English', 'Japanese'],
    levels: { Vietnamese: 'native', English: 'fluent', Japanese: 'native' },
    themes: ['culture', 'food', 'photography', 'wellness'],
    countries: ['Japan'],
    regions: ['Asia'], perDay: 130, difficulty: ['easy', 'moderate'],
    ageGroups: ['adults', 'seniors'], groupSize: { min: 2, max: 14 },
    bio: 'Sống tại Kyoto 6 năm, chuyên các tour văn hoá và ẩm thực Nhật Bản.',
    highlights: ['Tiếng Nhật bản ngữ', 'Từng sống tại Kyoto 6 năm']
  },
  {
    name: 'Hoàng Đức Thắng', gender: 'male', experience: 12,
    languages: ['Vietnamese', 'English', 'Russian'],
    levels: { Vietnamese: 'native', English: 'fluent', Russian: 'fluent' },
    themes: ['history', 'architecture', 'museum', 'culture'],
    countries: ['Russia'],
    regions: ['Europe'], perDay: 100, difficulty: ['easy', 'moderate', 'challenging'],
    ageGroups: ['adults', 'seniors'], groupSize: { min: 4, max: 22 },
    bio: 'Tốt nghiệp tại Moscow, chuyên tuyến Nga với hơn 12 năm kinh nghiệm.',
    highlights: ['Nói tiếng Nga', 'Chuyên bảo tàng và kiến trúc Nga']
  },
  {
    name: 'Lý Mỹ Linh', gender: 'female', experience: 5,
    languages: ['Vietnamese', 'English', 'Chinese'],
    levels: { Vietnamese: 'native', English: 'fluent', Chinese: 'native' },
    themes: ['shopping', 'food', 'nightlife', 'budget'],
    countries: ['Hong Kong', 'Malaysia'],
    regions: ['Asia'], perDay: 85, difficulty: ['easy'],
    ageGroups: ['teenagers', 'adults'], groupSize: { min: 2, max: 20 },
    bio: 'Chuyên tour mua sắm và ẩm thực đường phố khu vực Hoa ngữ.',
    highlights: ['Tiếng Trung bản ngữ', 'Thuộc lòng các khu chợ đêm']
  },
  {
    name: 'Trịnh Bảo Nam', gender: 'male', experience: 9,
    languages: ['Vietnamese', 'English', 'Spanish'],
    levels: { Vietnamese: 'native', English: 'fluent', Spanish: 'fluent' },
    themes: ['beach', 'nightlife', 'culture', 'food'],
    countries: ['Spain', 'Portugal'],
    regions: ['Europe'], perDay: 98, difficulty: ['easy', 'moderate'],
    ageGroups: ['teenagers', 'adults'], groupSize: { min: 2, max: 20 },
    bio: 'Chuyên tuyến bán đảo Iberia, kết hợp biển, ẩm thực và đời sống về đêm.',
    highlights: ['Nói tiếng Tây Ban Nha', 'Chuyên tuyến Tây Ban Nha - Bồ Đào Nha']
  },
  {
    name: 'Phan Kiều Anh', gender: 'female', experience: 7,
    languages: ['Vietnamese', 'English', 'French'],
    levels: { Vietnamese: 'native', English: 'fluent', French: 'fluent' },
    themes: ['luxury', 'romantic', 'food', 'shopping', 'museum'],
    countries: ['France', 'United Kingdom'],
    regions: ['Europe'], perDay: 125, difficulty: ['easy'],
    ageGroups: ['adults', 'seniors'], groupSize: { min: 2, max: 12 },
    bio: 'Chuyên phục vụ khách cao cấp tuyến Pháp - Anh, ưu tiên trải nghiệm riêng tư.',
    highlights: ['Nói tiếng Pháp', 'Chuyên tour cao cấp và tuần trăng mật']
  },
  {
    name: 'Vũ Đình Khoa', gender: 'male', experience: 11,
    languages: ['Vietnamese', 'English'],
    levels: { Vietnamese: 'native', English: 'fluent' },
    themes: ['mountain', 'trekking', 'nature', 'adventure', 'wildlife'],
    countries: ['Canada', 'Switzerland'],
    regions: ['North America', 'Europe'], perDay: 115, difficulty: ['moderate', 'challenging'],
    ageGroups: ['teenagers', 'adults'], groupSize: { min: 2, max: 10 },
    bio: 'Hướng dẫn viên leo núi có chứng chỉ cứu hộ, chuyên tuyến Rockies và Alps.',
    highlights: ['Chứng chỉ cứu hộ leo núi', 'Chuyên Rockies và dãy Alps']
  },
  {
    name: 'Đỗ Hải Yến', gender: 'female', experience: 4,
    languages: ['Vietnamese', 'English', 'Thai'],
    levels: { Vietnamese: 'native', English: 'fluent', Thai: 'intermediate' },
    themes: ['beach', 'island', 'water-sports', 'wellness', 'family'],
    countries: ['Thailand', 'Maldives'],
    regions: ['Asia'], perDay: 90, difficulty: ['easy', 'moderate'],
    ageGroups: ['children', 'teenagers', 'adults'], groupSize: { min: 2, max: 16 },
    bio: 'Chuyên tour biển đảo cho gia đình có trẻ nhỏ, có chứng chỉ sơ cấp cứu.',
    highlights: ['Chứng chỉ sơ cấp cứu', 'Rất hợp với gia đình có trẻ nhỏ']
  },
  {
    name: 'Nguyễn Trọng Tín', gender: 'male', experience: 6,
    languages: ['Vietnamese', 'English', 'Hindi'],
    levels: { Vietnamese: 'native', English: 'fluent', Hindi: 'intermediate' },
    themes: ['culture', 'history', 'food', 'photography', 'budget'],
    countries: ['India'],
    regions: ['Asia'], perDay: 80, difficulty: ['moderate'],
    ageGroups: ['adults'], groupSize: { min: 2, max: 18 },
    bio: 'Chuyên tuyến Ấn Độ, am hiểu văn hoá và ẩm thực địa phương.',
    highlights: ['Nói được tiếng Hindi', 'Chuyên tuyến Bắc Ấn']
  }
];

const slug = (name) => name.normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .replace(/[^a-z]+/g, '.')
  .replace(/^\.|\.$/g, '');

(async () => {
  await connectDB();

  let created = 0, skipped = 0;

  for (const [i, g] of NEW_GUIDES.entries()) {
    const email = `${slug(g.name)}@cmptravel.com`;
    const existing = await TourGuide.findOne({ email });
    if (existing) { skipped++; continue; }

    const doc = {
      name: g.name,
      email,
      phone: '09' + String(30000000 + i * 1111111),
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
      bio: g.bio,
      gender: g.gender,
      languages: g.languages,
      languageSkills: g.languages.map(l => ({ language: l, level: g.levels[l] || 'fluent' })),
      specialties: g.themes.map(t => t.replace('-', ' ')),
      specialtyThemes: g.themes,
      coverage: { countries: g.countries, cities: [], regions: g.regions },
      tourTypes: ['international'],
      difficultyLevels: g.difficulty,
      ageGroups: g.ageGroups,
      groupSize: g.groupSize,
      pricing: { perDay: g.perDay, currency: 'USD' },
      experience: g.experience,
      // Chưa có đánh giá nào nên để 0, không bịa điểm.
      rating: 0,
      totalReviews: 0,
      ratingBreakdown: { knowledge: 0, communication: 0, professionalism: 0, friendliness: 0, punctuality: 0 },
      highlights: g.highlights,
      status: 'active',
      availability: 'available'
    };

    if (!dryRun) await TourGuide.create(doc);
    created++;
    console.log(`  + ${g.name.padEnd(20)} ${g.countries.join(', ').padEnd(34)} $${g.perDay}/ngày`);
  }

  // Kiểm tra độ phủ quốc gia sau khi thêm
  const guides = await TourGuide.find({ status: 'active' }, 'coverage.countries').lean();
  const covered = new Set(guides.flatMap(g => g.coverage?.countries || []));
  if (dryRun) NEW_GUIDES.forEach(g => g.countries.forEach(c => covered.add(c)));

  const tourCountries = [...new Set((await Tour.find({}, 'country').lean()).map(t => t.country))];
  const perCountry = tourCountries.map(c => ({
    c, n: guides.filter(g => (g.coverage?.countries || []).includes(c)).length +
      (dryRun ? NEW_GUIDES.filter(g => g.countries.includes(c)).length : 0)
  }));

  console.log(`\nTổng hướng dẫn viên: ${await TourGuide.countDocuments() + (dryRun ? created : 0)}`);
  console.log(`Quốc gia được phủ  : ${tourCountries.filter(c => covered.has(c)).length}/${tourCountries.length}`);
  console.log(`Quốc gia chỉ có 1 HDV: ${perCountry.filter(p => p.n === 1).map(p => p.c).join(', ') || 'không'}`);
  console.log(`\nTạo mới: ${created} | bỏ qua (đã có): ${skipped}`);
  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');

  await mongoose.disconnect();
})().catch(err => { console.error('Thất bại:', err); process.exit(1); });
