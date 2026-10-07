/**
 * TU VUNG CHUAN CHO TOAN BO HE THONG (single source of truth).
 *
 * Vi sao can file nay:
 * Truoc day moi noi tu dinh nghia tu vung rieng, va chung da lech nhau that:
 *
 *   - User.preferences.activities trong DB co ca 'culture' VA 'cultural',
 *     ca 'beach' VA 'beaches', va 'nature'. Nhung config/tour-mapping.js chi
 *     co key 'culture', 'beach' -> 3 gia tri nay roi vao nhanh `if (!mapping)
 *     continue;` nen AM THAM bi bo qua, khong he bao loi.
 *
 *   - Tour.themes (enum 21 gia tri, du lieu sach) KHONG he duoc
 *     recommendationService dung den. No cham diem tren Tour.tags, ma tags chi
 *     chua ["<ten nuoc>", "budget|luxury", "popular"] -> vo nghia de so khop.
 *
 * Tu day moi anh xa so thich <-> chu de tour deu di qua file nay. Them mot gia
 * tri moi thi them o day, khong rai rac nhieu cho nua.
 */

// ---------------------------------------------------------------------------
// 1. Chu de tour - enum goc, Tour.js import lai tu day de khong bi lech
// ---------------------------------------------------------------------------
const TOUR_THEMES = [
  'culture', 'history', 'architecture', 'museum',
  'nature', 'mountain', 'beach', 'island', 'wildlife',
  'adventure', 'trekking', 'water-sports',
  'food', 'nightlife', 'shopping',
  'photography', 'family', 'romantic', 'wellness', 'luxury', 'budget'
];

// Hai nhan nay duoc TINH tu gia/ngay chu khong gan tay, nen tach rieng de
// script phan loai khong vo tinh ghi de.
const PRICE_THEMES = ['budget', 'luxury'];

// ---------------------------------------------------------------------------
// 2. Phong cach du lich (User.preferences.travelStyle)
//    Khoa canonical phai khop voi value cua checkbox trong frontend/preferences.html
// ---------------------------------------------------------------------------
const TRAVEL_STYLES = {
  luxury:     { themes: ['luxury'],                                        difficulty: ['easy', 'moderate'] },
  budget:     { themes: ['budget'],                                        difficulty: ['easy', 'moderate', 'challenging'] },
  adventure:  { themes: ['adventure', 'trekking', 'mountain', 'water-sports', 'nature'], difficulty: ['moderate', 'challenging'] },
  cultural:   { themes: ['culture', 'history', 'architecture', 'museum'],   difficulty: ['easy', 'moderate'] },
  relaxation: { themes: ['wellness', 'beach', 'island'],                    difficulty: ['easy'] },
  romance:    { themes: ['romantic', 'beach', 'island', 'wellness'],         difficulty: ['easy'] }
};

// ---------------------------------------------------------------------------
// 3. Hoat dong (User.preferences.activities)
// ---------------------------------------------------------------------------
const ACTIVITIES = {
  sightseeing: ['architecture', 'museum', 'nature', 'photography'],
  shopping:    ['shopping'],
  food:        ['food'],
  adventure:   ['adventure', 'trekking', 'water-sports'],
  culture:     ['culture', 'history', 'museum', 'architecture'],
  nightlife:   ['nightlife'],
  hiking:      ['trekking', 'mountain', 'nature'],
  beach:       ['beach', 'island'],
  diving:      ['water-sports', 'island'],
  photography: ['photography', 'nature']
};

// ---------------------------------------------------------------------------
// 4. Bi danh - hap thu nhung gia tri lech da nam san trong DB va nhung bien the
//    nguoi dung hay nhap. Danh sach nay lay tu gia tri THAT dang co trong
//    User.preferences, khong phai doan.
// ---------------------------------------------------------------------------
const STYLE_ALIASES = {
  cultural: 'cultural',
  culture: 'cultural',
  heritage: 'cultural',
  relax: 'relaxation',
  relaxing: 'relaxation',
  relaxation: 'relaxation',
  wellness: 'relaxation',
  romantic: 'romance',
  honeymoon: 'romance',
  premium: 'luxury',
  cheap: 'budget',
  backpacking: 'budget'
};

const ACTIVITY_ALIASES = {
  cultural: 'culture',      // co that trong DB
  beaches: 'beach',         // co that trong DB
  nature: 'sightseeing',    // co that trong DB
  hike: 'hiking',
  trekking: 'hiking',
  snorkeling: 'diving',
  snorkelling: 'diving',
  culinary: 'food',
  foodie: 'food',
  dining: 'food',
  photo: 'photography',
  party: 'nightlife',
  sight: 'sightseeing',
  sights: 'sightseeing'
};

/** Dua mot gia tri travelStyle bat ky ve khoa canonical, hoac null neu khong nhan ra. */
function normalizeStyle(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  if (TRAVEL_STYLES[key]) return key;
  return STYLE_ALIASES[key] || null;
}

/** Dua mot gia tri activity bat ky ve khoa canonical, hoac null neu khong nhan ra. */
function normalizeActivity(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  if (ACTIVITIES[key]) return key;
  return ACTIVITY_ALIASES[key] || null;
}

/** Tap chu de tour ma mot danh sach travelStyle quan tam. */
function stylesToThemes(styles = []) {
  const out = new Set();
  for (const raw of styles) {
    const key = normalizeStyle(raw);
    if (key) TRAVEL_STYLES[key].themes.forEach(t => out.add(t));
  }
  return [...out];
}

/** Tap chu de tour ma mot danh sach activities quan tam. */
function activitiesToThemes(activities = []) {
  const out = new Set();
  for (const raw of activities) {
    const key = normalizeActivity(raw);
    if (key) ACTIVITIES[key].forEach(t => out.add(t));
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// 5. Khi hau theo quoc gia.
//    Phai phu HET 17 quoc gia dang co tour, neu khong calculateClimateMatch se
//    tra ve 0.3 cho ca nhung nuoc dung y khach. Truoc day Hong Kong, Portugal,
//    Greece, Netherlands, India deu bi thieu.
// ---------------------------------------------------------------------------
const CLIMATE_BY_COUNTRY = {
  // nhiet doi
  Thailand: 'tropical', Malaysia: 'tropical', Maldives: 'tropical',
  India: 'tropical', 'Hong Kong': 'tropical', Singapore: 'tropical',
  Indonesia: 'tropical', Philippines: 'tropical', Vietnam: 'tropical',
  // on doi
  Japan: 'temperate', 'United Kingdom': 'temperate', France: 'temperate',
  Italy: 'temperate', Spain: 'temperate', Germany: 'temperate',
  Netherlands: 'temperate', Portugal: 'temperate', Greece: 'temperate',
  Korea: 'temperate', 'South Korea': 'temperate', China: 'temperate',
  Taiwan: 'temperate',
  // lanh
  Switzerland: 'cold', Canada: 'cold', Russia: 'cold',
  Iceland: 'cold', Norway: 'cold', Sweden: 'cold', Finland: 'cold',
  // hoang mac
  UAE: 'desert', Egypt: 'desert', Morocco: 'desert', Jordan: 'desert'
};

/** Khi hau cua mot tour, suy ra tu quoc gia. Tra ve null neu chua biet. */
function climateOf(country) {
  if (!country) return null;
  return CLIMATE_BY_COUNTRY[country] || CLIMATE_BY_COUNTRY[String(country).trim()] || null;
}

// ---------------------------------------------------------------------------
// 6. Nhom khach phu hop (Tour.suitableFor)
// ---------------------------------------------------------------------------
const AUDIENCES = ['solo', 'couple', 'family', 'friends', 'seniors', 'honeymoon', 'business'];

// ---------------------------------------------------------------------------
// 7. Don vi tien te. Toan bo estimatedCost / pricing / priceBreakdown dung USD.
//    Ghi ro o day vi nguoi dung nhap ngan sach phai cung don vi.
// ---------------------------------------------------------------------------
const CURRENCY = 'USD';

module.exports = {
  TOUR_THEMES,
  PRICE_THEMES,
  TRAVEL_STYLES,
  ACTIVITIES,
  STYLE_ALIASES,
  ACTIVITY_ALIASES,
  AUDIENCES,
  CLIMATE_BY_COUNTRY,
  CURRENCY,
  normalizeStyle,
  normalizeActivity,
  stylesToThemes,
  activitiesToThemes,
  climateOf
};
