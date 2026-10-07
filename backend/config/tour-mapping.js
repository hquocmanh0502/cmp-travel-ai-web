// Anh xa so thich nguoi dung <-> du lieu tour.
//
// DA SUA (do do thuc tren 36 tour trong DB):
//
//   1. Nguong gia nam NGOAI khoang gia that. Gia tour that tu 3.200 den 8.000:
//        - travelStyle.budget co maxCost 2000 -> 0/36 tour dat dieu kien
//        - travelStyle.luxury co minCost 4000 -> 33/36 tour dat dieu kien
//      Ca hai nguong deu vo nghia. Gio khong dat nguong tuyet doi nua: nhan gia
//      ('budget'/'luxury') da duoc tinh theo phan vi gia-moi-ngay va luu san
//      trong Tour.themes boi scripts/fix-tour-taxonomy.js, nen chi can so khop
//      chu de la du.
//
//   2. Khoa khong dong bo giua hai bang trong CUNG file nay: travelStyle co
//      'cultural' nhung activities lai co 'culture'. Nguoi dung chon
//      activities: ['cultural'] thi roi vao `if (!mapping) continue` va bi bo
//      qua am tham. Tu vung chuan va bang bi danh gio nam o
//      config/travel-vocabulary.js.
//
//   3. So khop dua tren Tour.tags, ma tags chi chua
//      ["<ten nuoc>", "budget|luxury", "popular"] -> khong mang thong tin chu de.
//      Trong khi Tour.themes (enum 21 gia tri, du lieu sach) thi khong ai dung.
//      Gio cham diem tren themes.
//
// Giu lai file nay vi cac phan khac (climate, groupSize, duration, seasons) van
// dung. Phan travelStyle / activities da chuyen sang travel-vocabulary.js.

const {
  TRAVEL_STYLES,
  ACTIVITIES,
  CLIMATE_BY_COUNTRY
} = require('./travel-vocabulary');

// Tu khoa khi hau theo quoc gia, dung chung voi travel-vocabulary de khong lech.
// Dao nguoc CLIMATE_BY_COUNTRY thanh { climate: [countries] }.
const climate = Object.entries(CLIMATE_BY_COUNTRY).reduce((acc, [country, zone]) => {
  if (!acc[zone]) acc[zone] = { countries: [], themes: [] };
  acc[zone].countries.push(country);
  return acc;
}, {});

// Chu de tour dac trung cho tung vung khi hau, dung khi ten quoc gia khong khop.
climate.tropical.themes = ['beach', 'island', 'water-sports'];
climate.temperate.themes = ['culture', 'history', 'architecture', 'museum'];
climate.cold.themes = ['mountain', 'nature', 'trekking'];
if (climate.desert) climate.desert.themes = ['adventure', 'nature'];

module.exports = {
  // travelStyle / activities giu lai de tuong thich nguoc, noi dung lay tu
  // travel-vocabulary.js (mot nguon duy nhat).
  travelStyle: TRAVEL_STYLES,
  activities: ACTIVITIES,

  climate,

  // Nhom khach -> so cho trong doan
  groupSize: {
    solo: { minSize: 1, maxSize: 1, audiences: ['solo'] },
    couple: { minSize: 2, maxSize: 2, audiences: ['couple', 'honeymoon'] },
    small: { minSize: 3, maxSize: 5, audiences: ['family', 'friends'] },
    medium: { minSize: 6, maxSize: 15, audiences: ['friends', 'family'] },
    large: { minSize: 16, maxSize: 50, audiences: ['friends'] }
  },

  // So ngay mong muon -> khoang durationDays
  duration: {
    weekend: { minDays: 2, maxDays: 3 },
    short: { minDays: 4, maxDays: 5 },
    week: { minDays: 6, maxDays: 8 },
    long: { minDays: 9, maxDays: 14 },
    extended: { minDays: 15, maxDays: 999 }
  },

  seasons: {
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    autumn: [9, 10, 11],
    winter: [12, 1, 2]
  },

  // Loai luu tru -> yeu cau khach san
  accommodation: {
    hotel: { minRating: 3, types: ['hotel', 'business hotel'] },
    resort: { minRating: 4, types: ['resort', 'beach resort', 'spa resort'] },
    hostel: { minRating: 2, types: ['hostel', 'backpacker'] },
    apartment: { minRating: 3, types: ['apartment', 'serviced apartment', 'airbnb'] }
  }
};
