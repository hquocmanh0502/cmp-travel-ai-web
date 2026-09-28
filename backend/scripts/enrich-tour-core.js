/**
 * Sửa và làm giàu các trường lõi của tour.
 *
 * Vì sao cần: khảo sát cho thấy 7 trường có dữ liệu nhưng GIỐNG HỆT NHAU ở cả 36
 * tour, nên với thuật toán thì chúng không mang thông tin gì:
 *   - location.coordinates: cả 36 tour cùng một toạ độ (TP.HCM) -> không định tuyến được
 *   - duration: tất cả "5 days"      -> SmartTour không ghép nổi chuyến 7 hay 8 ngày
 *   - difficulty: tất cả "moderate"  -> không lọc theo thể lực
 *   - bestTimeToVisit: giống nhau    -> không ràng buộc mùa vụ
 *   - minAge / maxGroupSize: giống nhau
 *   - type: 32 tour ở châu Âu bị gắn "domestic"
 *   - inclusions/exclusions: 1 biến thể duy nhất
 *
 * Script gán giá trị THẬT và có tương quan với nhau (giá cao -> tour dài hơn,
 * tour leo núi -> độ khó cao, tuổi tối thiểu lớn hơn, đoàn nhỏ hơn).
 *
 * Chạy (từ thư mục backend):
 *   node scripts/enrich-tour-core.js --dry-run
 *   node scripts/enrich-tour-core.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');

const dryRun = process.argv.includes('--dry-run');

// Toạ độ thật [kinh độ, vĩ độ] của 36 thành phố đang có tour.
const CITY_COORDS = {
  Lauterbrunnen: [7.9089, 46.5936], London: [-0.1276, 51.5072], Manchester: [-2.2426, 53.4808],
  Bangkok: [100.5018, 13.7563], Phuket: [98.3381, 7.8804], Munich: [11.5820, 48.1351],
  Berlin: [13.4050, 52.5200], Florence: [11.2558, 43.7696], Rome: [12.4964, 41.9028],
  Venice: [12.3155, 45.4408], Milan: [9.1900, 45.4642], Valencia: [-0.3763, 39.4699],
  Barcelona: [2.1734, 41.3851], Marseille: [5.3698, 43.2965], Paris: [2.3522, 48.8566],
  Bordeaux: [-0.5792, 44.8378], Lyon: [4.8357, 45.7640], Toronto: [-79.3832, 43.6532],
  Vancouver: [-123.1207, 49.2827], Montreal: [-73.5673, 45.5017], Athens: [23.7275, 37.9838],
  Santorini: [25.4615, 36.3932], Tokyo: [139.6503, 35.6762], Osaka: [135.5023, 34.6937],
  Kyoto: [135.7681, 35.0116], Maldives: [73.5093, 4.1755], Amsterdam: [4.9041, 52.3676],
  Langkawi: [99.8000, 6.3500], 'Kuala Lumpur': [101.6869, 3.1390], Malacca: [102.2501, 2.1896],
  'Causeway Bay': [114.1850, 22.2800], Lisbon: [-9.1393, 38.7223], Porto: [-8.6291, 41.1579],
  Moscow: [37.6173, 55.7558], Kazan: [49.1064, 55.7963], Delhi: [77.2090, 28.6139]
};

// Mùa đẹp nhất theo vùng khí hậu, ghi theo tháng để SmartTour so sánh được với
// ngày khởi hành khách chọn.
const BEST_MONTHS = {
  tropical: ['November', 'December', 'January', 'February', 'March', 'April'],
  europe: ['April', 'May', 'June', 'September', 'October'],
  mediterranean: ['April', 'May', 'June', 'September', 'October'],
  japan: ['March', 'April', 'May', 'October', 'November'],
  canada: ['June', 'July', 'August', 'September'],
  russia: ['May', 'June', 'July', 'August'],
  alpine: ['June', 'July', 'August', 'December', 'January', 'February']
};

const CLIMATE_BY_COUNTRY = {
  Maldives: 'tropical', Thailand: 'tropical', Malaysia: 'tropical',
  India: 'tropical', 'Hong Kong': 'tropical',
  Japan: 'japan', Canada: 'canada', Russia: 'russia', Switzerland: 'alpine',
  Italy: 'mediterranean', Spain: 'mediterranean', Greece: 'mediterranean', Portugal: 'mediterranean',
  France: 'europe', Germany: 'europe', Netherlands: 'europe', 'United Kingdom': 'europe'
};

// Hạng mục có/không bao gồm, khác nhau theo chủ đề của tour.
const EXTRA_INCLUSIONS = {
  beach: ['Snorkeling equipment', 'Beach transfers'],
  island: ['Island hopping boat trips'],
  'water-sports': ['Water sports equipment', 'Safety briefing'],
  trekking: ['Trekking poles', 'Mountain guide', 'Safety equipment'],
  mountain: ['Cable car tickets'],
  museum: ['Museum passes', 'Skip-the-line tickets'],
  food: ['Food tasting sessions', 'Cooking class'],
  wellness: ['One spa session'],
  luxury: ['Private airport transfer', 'Welcome drink']
};

const EXTRA_EXCLUSIONS = {
  beach: ['Diving certification course'],
  trekking: ['Personal climbing gear'],
  luxury: ['Private chauffeur beyond scheduled transfers'],
  food: ['Alcoholic beverages']
};

/** Khoảng cách hai điểm theo công thức Haversine, đơn vị km. */
function distanceKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Chọn phương tiện và thời gian di chuyển theo khoảng cách. */
function transportFor(km) {
  if (km <= 60) return { mode: 'bus', durationHours: 1 };
  if (km <= 800) return { mode: 'train', durationHours: Math.max(1, Math.round(km / 120)) };
  return { mode: 'flight', durationHours: Math.max(2, Math.round(km / 750) + 1) };
}

/**
 * Số ngày suy theo mức giá, để giá và độ dài không mâu thuẫn nhau.
 * Tour càng đắt thì càng dài, giữ chi phí mỗi ngày ở mức hợp lý.
 */
function durationFromPrice(price) {
  if (price <= 4000) return 3;
  if (price <= 5500) return 5;
  if (price <= 7000) return 7;
  return 10;
}

function difficultyFrom(themes) {
  if (themes.includes('trekking') || themes.includes('mountain')) return 'challenging';
  if (themes.includes('adventure') || themes.includes('water-sports') || themes.includes('nature')) return 'moderate';
  return 'easy';
}

function physicalLevelFrom(difficulty, themes) {
  if (difficulty === 'challenging') return themes.includes('trekking') ? 5 : 4;
  if (difficulty === 'moderate') return 3;
  return themes.includes('wellness') || themes.includes('beach') ? 1 : 2;
}

function paceFrom(themes, days, attractionCount) {
  if (themes.includes('wellness') || themes.includes('beach') || themes.includes('romantic')) return 'relaxed';
  if (attractionCount / Math.max(days - 2, 1) >= 1.2) return 'packed';
  return 'balanced';
}

function suitableForFrom(themes, difficulty) {
  const out = new Set(['solo', 'friends']);
  if (themes.includes('romantic') || themes.includes('beach') || themes.includes('luxury')) {
    out.add('couple'); out.add('honeymoon');
  }
  if (difficulty === 'easy') { out.add('family'); out.add('seniors'); }
  if (themes.includes('museum') || themes.includes('history')) out.add('seniors');
  if (themes.includes('shopping') || themes.includes('nightlife')) out.add('couple');
  if (themes.includes('luxury')) out.add('business');
  return [...out];
}

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  const hotels = await Hotel.find({}).lean();

  // Gom khách sạn theo thành phố để dựng các mức nâng hạng.
  const hotelsByCity = new Map();
  for (const h of hotels) {
    const key = (h.location?.city || '').toLowerCase();
    if (!hotelsByCity.has(key)) hotelsByCity.set(key, []);
    hotelsByCity.get(key).push(h);
  }

  const stats = { duration: {}, difficulty: {}, pace: {}, missingCoords: [] };

  // Lượt 1: gán toạ độ trước, vì lượt 2 cần chúng để tính chặng di chuyển.
  for (const tour of tours) {
    const coords = CITY_COORDS[tour.name];
    if (!coords) { stats.missingCoords.push(tour.name); continue; }
    tour.location = { ...(tour.location || {}), coordinates: coords, region: tour.country };
  }

  for (const tour of tours) {
    const themes = tour.themes || [];
    const price = tour.pricing?.adult || tour.estimatedCost || 4000;

    const days = durationFromPrice(price);
    const difficulty = difficultyFrom(themes);

    tour.duration = `${days} days`;
    tour.difficulty = difficulty;
    tour.physicalLevel = physicalLevelFrom(difficulty, themes);
    tour.pace = paceFrom(themes, days, (tour.attractions || []).length);
    tour.suitableFor = suitableForFrom(themes, difficulty);

    // Tuổi tối thiểu và quy mô đoàn đi theo độ khó, không còn đồng loạt 0 và 20.
    tour.minAge = difficulty === 'challenging' ? 12 : difficulty === 'moderate' ? 6 : 0;
    tour.maxGroupSize = themes.includes('luxury') ? 12
      : difficulty === 'challenging' ? 10
        : 16 + ((tour.name.length * 3) % 10);

    // Không có tour nào ở Việt Nam nên toàn bộ đều là tour nước ngoài.
    tour.type = 'international';

    tour.bestTimeToVisit = BEST_MONTHS[CLIMATE_BY_COUNTRY[tour.country] || 'europe'];

    // Hạng mục bao gồm riêng theo chủ đề
    const inc = new Set(['Accommodation', 'Transportation', 'Tour guide', 'Entrance fees', 'Daily breakfast']);
    const exc = new Set(['International flights', 'Personal expenses', 'Travel insurance', 'Tips for guide and driver']);
    themes.forEach(t => {
      (EXTRA_INCLUSIONS[t] || []).forEach(x => inc.add(x));
      (EXTRA_EXCLUSIONS[t] || []).forEach(x => exc.add(x));
    });
    tour.inclusions = [...inc];
    tour.exclusions = [...exc];

    // Tách giá thành phần, tổng đúng bằng giá người lớn
    const acc = Math.round(price * 0.40);
    const meals = Math.round(price * 0.15);
    const transport = Math.round(price * 0.20);
    const guide = Math.round(price * 0.15);
    tour.priceBreakdown = {
      accommodation: acc,
      meals,
      transport,
      guide,
      entranceFees: price - acc - meals - transport - guide
    };

    // Các mức khách sạn có thể chọn, phụ phí tính theo chênh lệch giá phòng
    const cityHotels = (hotelsByCity.get(tour.name.toLowerCase()) || [])
      .slice()
      .sort((a, b) => (a.details?.priceRange?.min || 0) - (b.details?.priceRange?.min || 0));

    if (cityHotels.length) {
      const base = cityHotels[0].details?.priceRange?.min || 0;
      tour.hotelTiers = cityHotels.slice(0, 3).map(h => ({
        level: h.details?.starRating || 4,
        hotelId: h._id,
        hotelName: h.name,
        surcharge: Math.round(((h.details?.priceRange?.min || base) - base) * (days - 1))
      }));
    }

    // Chặng kế tiếp: thành phố gần nhất trong cùng quốc gia, nếu không có thì
    // thành phố gần nhất nói chung. SmartTour dùng để ghép nhiều điểm đến.
    const from = CITY_COORDS[tour.name];
    if (from) {
      const others = tours
        .filter(t => t.name !== tour.name && CITY_COORDS[t.name])
        .map(t => ({ name: t.name, country: t.country, km: distanceKm(from, CITY_COORDS[t.name]) }))
        .sort((a, b) => a.km - b.km);

      const sameCountry = others.filter(o => o.country === tour.country);
      const next = sameCountry[0] || others[0];

      if (next) {
        tour.transport = {
          toNextCity: next.name,
          distanceKm: next.km,
          ...transportFor(next.km)
        };
      }
    }

    stats.duration[tour.duration] = (stats.duration[tour.duration] || 0) + 1;
    stats.difficulty[difficulty] = (stats.difficulty[difficulty] || 0) + 1;
    stats.pace[tour.pace] = (stats.pace[tour.pace] || 0) + 1;

    if (!dryRun) await tour.save();
  }

  const show = (obj) => Object.entries(obj).sort().map(([k, v]) => `${k}: ${v}`).join(' | ');
  console.log('\nĐộ dài     :', show(stats.duration));
  console.log('Độ khó     :', show(stats.difficulty));
  console.log('Nhịp độ    :', show(stats.pace));
  console.log('Thiếu toạ độ:', stats.missingCoords.length ? stats.missingCoords.join(', ') : 'không');

  const sample = tours.find(t => t.name === 'Paris') || tours[0];
  console.log(`\nVí dụ ${sample.name}:`);
  console.log('  toạ độ    :', sample.location.coordinates);
  console.log('  độ dài    :', sample.duration, '| độ khó:', sample.difficulty, '| nhịp:', sample.pace);
  console.log('  phù hợp   :', (sample.suitableFor || []).join(', '));
  console.log('  mùa đẹp   :', (sample.bestTimeToVisit || []).join(', '));
  console.log('  chặng tiếp:', sample.transport?.toNextCity, `${sample.transport?.distanceKm}km`, sample.transport?.mode, `${sample.transport?.durationHours}h`);
  console.log('  giá thành phần:', JSON.stringify(sample.priceBreakdown));
  console.log('  mức khách sạn :', (sample.hotelTiers || []).map(h => `${h.level}★ ${h.hotelName} +$${h.surcharge}`).join(' | '));

  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('Thất bại:', err);
  process.exit(1);
});
