/**
 * Bổ sung nội dung còn thiếu cho tour: lịch trình, khách sạn, hướng dẫn viên,
 * lịch khởi hành.
 *
 * Vì sao cần: khảo sát DB cho thấy cả 36 tour đều rỗng ở itinerary, selectedHotels,
 * assignedGuide và availability. Trang chi tiết phải hiển thị một lịch trình giả
 * viết cứng trong code (giống hệt nhau ở mọi tour), còn SmartTour và chatbot thì
 * không có dữ liệu để ghép hành trình hay trả lời câu hỏi.
 *
 * Script sinh dữ liệu từ những gì tour đã có (duration, attractions, food, country,
 * location) nên kết quả bám sát từng tour, không phải nội dung chung chung.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/seed-tour-content.js --dry-run   xem trước, không ghi gì
 *   node scripts/seed-tour-content.js             chỉ điền tour còn thiếu
 *   node scripts/seed-tour-content.js --force     làm lại toàn bộ, ghi đè
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');
const TourGuide = require('../models/TourGuide');

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const HOTELS_PER_CITY = 2;
const DEPARTURES_MONTHS = 6;

// Ảnh khách sạn dùng lại từ bộ ảnh của các khách sạn có sẵn, để giao diện đồng nhất.
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'
];

const HOTEL_STYLES = [
  { suffix: 'Grand Hotel', star: 5, kind: 'an elegant five-star hotel in the heart of' },
  { suffix: 'Boutique Residence', star: 4, kind: 'a cosy boutique stay in' },
  { suffix: 'City Suites', star: 4, kind: 'spacious serviced apartments in' }
];

const AMENITY_SETS = [
  ['wifi', 'pool', 'spa', 'gym', 'breakfast', 'parking'],
  ['wifi', 'breakfast', 'gym', 'bar'],
  ['wifi', 'pool', 'breakfast', 'family-rooms', 'parking']
];

/** Chọn phần tử theo chỉ số, luôn ra cùng kết quả cho cùng đầu vào. */
const pick = (arr, i) => arr[i % arr.length];

/** "5 days" -> 5. Mặc định 5 nếu không đọc được. */
function parseDays(duration) {
  const m = String(duration || '').match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 5;
  return Math.max(2, Math.min(n, 14));
}

// ---------------------------------------------------------------- khách sạn

function buildHotel(tour, index, imagePool) {
  const city = tour.name;
  const country = tour.country;
  const style = pick(HOTEL_STYLES, index);

  // Giá phòng/đêm suy ra từ giá tour, để hai con số không mâu thuẫn nhau.
  const base = Math.max(60, Math.round((tour.estimatedCost || 3000) * 0.025));
  const min = base + index * 20;
  const max = Math.round(min * 2.4);

  const coords = Array.isArray(tour.location?.coordinates) && tour.location.coordinates.length === 2
    ? [tour.location.coordinates[0] + index * 0.01, tour.location.coordinates[1] + index * 0.01]
    : undefined;

  return {
    name: `${city} ${style.suffix}`,
    location: {
      address: `${10 + index * 7} Central District, ${city}`,
      coordinates: coords,
      city,
      country,
      distanceToCenter: 1 + index
    },
    details: {
      rating: Number((4.2 + (index % 3) * 0.2).toFixed(1)),
      starRating: style.star,
      priceRange: { min, max },
      currency: 'USD',
      mainImage: pick(imagePool, index),
      amenities: pick(AMENITY_SETS, index),
      roomTypes: [
        {
          type: 'Deluxe',
          name: 'Deluxe Room',
          price: min,
          capacity: { adults: 2, children: 1, total: 3 },
          size: 32,
          bedInfo: '1 King Bed',
          amenities: ['wifi', 'air-conditioning', 'minibar'],
          description: `Deluxe room with city view in ${city}.`,
          totalRooms: 12,
          availableRooms: 12
        },
        {
          type: 'Suite',
          name: 'Executive Suite',
          price: max,
          capacity: { adults: 3, children: 2, total: 5 },
          size: 58,
          bedInfo: '1 King Bed + Sofa Bed',
          amenities: ['wifi', 'air-conditioning', 'bathtub', 'lounge-access'],
          description: `Spacious suite ideal for families, in ${city}.`,
          totalRooms: 5,
          availableRooms: 5
        }
      ],
      images: [pick(imagePool, index), pick(imagePool, index + 1)],
      description: `${style.kind} ${city}, ${country}. Well located for the main sights included in this tour.`,
      checkInTime: '14:00',
      checkOutTime: '12:00',
      policies: {
        cancellation: 'Free cancellation up to 7 days before check-in.',
        petPolicy: 'Pets are not allowed.',
        childPolicy: 'Children under 6 stay free with parents.'
      }
    },
    reviewsSummary: { totalReviews: 0, averageRating: 0 },
    status: 'active',
    // Dữ liệu seed phục vụ demo, không phải đối tác đã xác minh.
    verifiedPartner: false
  };
}

// ---------------------------------------------------------------- lịch trình

/**
 * Sinh lịch trình n ngày bám theo điểm tham quan và món ăn của chính tour đó.
 *
 * Ngày đầu luôn là đón sân bay, ngày cuối luôn là trả phòng và tiễn sân bay.
 * Các ngày giữa rải đều attractions; nếu tour dài hơn số điểm tham quan thì thêm
 * ngày tự do, còn ngắn hơn thì gộp bớt.
 */
function buildItinerary(tour, hotelId) {
  const days = parseDays(tour.duration);
  const city = tour.name;
  const attractions = (tour.attractions || []).filter(Boolean);
  const foods = (tour.food || []).filter(Boolean);
  const plan = [];

  plan.push({
    day: 1,
    title: `Arrival in ${city}`,
    description: `Our driver meets you at the airport and transfers you to the hotel. The rest of the day is free to rest and take a first stroll around central ${city}.`,
    activities: ["Airport pickup", "Hotel check-in", `Evening walk around ${city}`],
    meals: ["Dinner"],
    accommodation: hotelId
  });

  const middleCount = Math.max(0, days - 2);
  for (let i = 0; i < middleCount; i++) {
    const spot = attractions[i % Math.max(attractions.length, 1)];
    const dish = foods[i % Math.max(foods.length, 1)];

    if (spot) {
      plan.push({
        day: i + 2,
        title: `Discover ${spot}`,
        description: `Guided visit to ${spot}. In the afternoon you will taste ${dish || "local specialities"} and have free time to explore ${city} at your own pace.`,
        activities: [`Guided visit to ${spot}`, "City sightseeing", dish ? `Taste ${dish}` : "Local cuisine tasting"],
        meals: ["Breakfast", "Lunch"],
        accommodation: hotelId
      });
    } else {
      plan.push({
        day: i + 2,
        title: `Free day in ${city}`,
        description: `A free day. You can go shopping, relax at the hotel or join one of our optional excursions.`,
        activities: ["Free time", "Local market tour"],
        meals: ["Breakfast"],
        accommodation: hotelId
      });
    }
  }

  plan.push({
    day: days,
    title: `Departure from ${city}`,
    description: `Breakfast at the hotel, check-out and transfer to the airport. End of your ${tour.duration} journey in ${tour.country}.`,
    activities: ["Breakfast at hotel", "Hotel check-out", "Transfer to airport"],
    meals: ["Breakfast"],
    accommodation: null
  });

  return plan;
}

const LANGUAGE_BY_COUNTRY = {
  France: 'French', Japan: 'Japanese', Thailand: 'Thai',
  'Hong Kong': 'Chinese', Malaysia: 'Chinese'
};

/** Ưu tiên hướng dẫn viên nói được ngôn ngữ của điểm đến, sau đó tới chuyên môn. */
function pickGuides(tour, guides, index) {
  if (guides.length === 0) return [];

  const wanted = LANGUAGE_BY_COUNTRY[tour.country];
  const byLanguage = wanted
    ? guides.filter(g => (g.languages || []).includes(wanted))
    : [];

  const tags = (tour.tags || []).join(' ').toLowerCase();
  const bySpecialty = guides.filter(g =>
    (g.specialties || []).some(s => tags.includes(s.split(' ')[0].toLowerCase()))
  );

  const chosen = [];
  const add = (g) => { if (g && !chosen.some(c => String(c._id) === String(g._id))) chosen.push(g); };

  add(byLanguage[0]);
  add(bySpecialty[0]);
  add(pick(guides, index)); // đảm bảo tour nào cũng có ít nhất một người

  return chosen.slice(0, 2).map(g => g._id);
}

/** Lịch khởi hành 2 chuyến mỗi tháng trong 6 tháng tới. */
function buildAvailability(tour) {
  const days = parseDays(tour.duration);
  const slots = tour.maxGroupSize || 20;
  const price = tour.pricing?.adult || tour.estimatedCost || 0;
  const out = [];
  const today = new Date();

  for (let m = 0; m < DEPARTURES_MONTHS; m++) {
    for (const dayOfMonth of [10, 24]) {
      const start = new Date(today.getFullYear(), today.getMonth() + m, dayOfMonth);
      if (start <= today) continue;

      const end = new Date(start);
      end.setDate(end.getDate() + days - 1);

      out.push({ startDate: start, endDate: end, availableSlots: slots, price });
    }
  }
  return out;
}

// ---------------------------------------------------------------------- main

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  const guides = await TourGuide.find({ status: 'active' }).lean();
  const existingHotels = await Hotel.find({}).lean();

  const imagePool = [
    ...new Set(existingHotels.map(h => h.details?.mainImage).filter(Boolean))
  ];
  if (imagePool.length === 0) imagePool.push(...FALLBACK_IMAGES);

  // Gom khách sạn theo thành phố để biết thành phố nào còn thiếu.
  const hotelsByCity = new Map();
  for (const h of existingHotels) {
    const key = (h.location?.city || '').toLowerCase();
    if (!hotelsByCity.has(key)) hotelsByCity.set(key, []);
    hotelsByCity.get(key).push(h);
  }

  let createdHotels = 0;
  let refreshedHotels = 0;
  let updatedTours = 0;
  let skipped = 0;

  console.log(`\nTour: ${tours.length} | hướng dẫn viên: ${guides.length} | khách sạn hiện có: ${existingHotels.length}`);
  console.log(dryRun ? 'Chế độ DRY-RUN, không ghi vào DB.\n' : force ? 'Chế độ FORCE, ghi đè dữ liệu cũ.\n' : '');

  for (const [index, tour] of tours.entries()) {
    const alreadyFilled = (tour.itinerary || []).length > 0;
    if (alreadyFilled && !force) {
      skipped++;
      continue;
    }

    const cityKey = tour.name.toLowerCase();
    let cityHotels = hotelsByCity.get(cityKey) || [];

    // Bổ sung khách sạn cho thành phố chưa có, để lịch trình có chỗ ở thật
    // thay vì phải rơi xuống khách sạn của nước khác.
    let toCreate = Math.max(0, HOTELS_PER_CITY - cityHotels.length);
    for (let i = 0; i < toCreate; i++) {
      const doc = buildHotel(tour, cityHotels.length + i, imagePool);
      if (dryRun) {
        cityHotels.push({ ...doc, _id: new mongoose.Types.ObjectId() });
      } else {
        const saved = await Hotel.create(doc);
        cityHotels.push(saved.toObject());
      }
      createdHotels++;
    }
    // Khach san seed tao tu lan chay truoc co noi dung tieng Viet. Voi --force,
    // ghi de lai bang noi dung tieng Anh. Chi dung vao khach san do script nay tao ra
    // (ten khop mau "{Thanh pho} {suffix}"), khong dung toi 30 khach san goc.
    if (force && !dryRun) {
      const generatedNames = HOTEL_STYLES.map(st => `${tour.name} ${st.suffix}`);
      for (const h of cityHotels) {
        const pos = generatedNames.indexOf(h.name);
        if (pos < 0) continue;
        const fresh = buildHotel(tour, pos, imagePool);
        await Hotel.updateOne({ _id: h._id }, { $set: { details: fresh.details, updatedAt: new Date() } });
        refreshedHotels++;
      }
    }

    hotelsByCity.set(cityKey, cityHotels);

    const selectedHotels = cityHotels.slice(0, 3).map(h => h._id);
    const assignedGuide = pickGuides(tour, guides, index);

    tour.selectedHotels = selectedHotels;
    tour.assignedGuide = assignedGuide;
    tour.itinerary = buildItinerary(tour, selectedHotels[0] || null);
    tour.availability = buildAvailability(tour);

    if (!dryRun) await tour.save();
    updatedTours++;

    if (updatedTours <= 3 || dryRun) {
      console.log(`${tour.name} (${tour.country})`);
      console.log(`   lịch trình: ${tour.itinerary.length} ngày | khách sạn: ${selectedHotels.length} | HDV: ${assignedGuide.length} | ngày khởi hành: ${tour.availability.length}`);
      console.log(`   ngày 2: ${tour.itinerary[1]?.title || '-'}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tour được cập nhật : ${updatedTours}`);
  console.log(`Tour bỏ qua (đã có): ${skipped}${skipped ? '  -> dùng --force để làm lại' : ''}`);
  console.log(`Khách sạn tạo mới  : ${createdHotels}`);
  console.log(`Khách sạn cập nhật : ${refreshedHotels}`);
  console.log('='.repeat(50));
  if (dryRun) console.log('\nDRY-RUN: chưa có gì được ghi vào DB.');

  await mongoose.disconnect();
})().catch(err => {
  console.error('Thất bại:', err);
  process.exit(1);
});
