/**
 * BANG PHAN LOAI THAM DINH TAY CHO 36 THANH PHO DANG CO TOUR.
 *
 * Vi sao khong suy luan tu khoa:
 * Cach cu do script seed-matching-data.js suy themes tu attractions/food/
 * description bang tu khoa, va no da sai that:
 *
 *   - Malacca gan 'mountain' vi attraction co "St. Paul's HILL" (mot go cao 20m),
 *     keo theo physicalLevel 4 + difficulty 'challenging' cho mot tour pho co
 *     3 ngay di bo phang.
 *   - Berlin gan 'island' vi co "Museum ISLAND" (mot cu lao giua song, khong he
 *     la diem den bien dao).
 *   - Milan chi con 2 chu de (food, budget) vi khong tu khoa nao khop.
 *   - 'food' gan cho 36/36 tour, 'solo' va 'friends' cung 36/36 -> nhan xuat hien
 *     o moi tour thi khong giup loc hay xep hang gi.
 *
 * Itinerary cung khong cuu duoc: moi tour deu la template "Taste <mon>",
 * "Guided visit to <diem>", nen khong co tin hieu phan biet nao de suy ra.
 *
 * => 36 dong duoi day duoc kiem tra tay theo dac trung thuc cua tung thanh pho.
 *    Day la du lieu goc (ground truth) cua do an; script chi doc, khong ghi de.
 *
 * Quy uoc:
 *   themes   : toi da 5 chu de NOI DUNG. Khong chua 'budget'/'luxury' - hai nhan
 *              do duoc TINH tu gia moi ngay (xem scripts/fix-tour-taxonomy.js).
 *   phys     : muc van dong 1 (di bo nhe) -> 5 (leo nui nhieu ngay).
 *              difficulty duoc suy ra tu phys de hai truong khong bao gio nguoc nhau.
 *   pace     : relaxed | balanced | packed
 *   railGroup: nhom co the di duong sat/duong bo lien thong. Cross-group phai bay.
 *   hsr      : co mang duong sat cao toc (dung de tinh thoi gian di chuyen that hon)
 *   island   : la diem den dao (dung de xet ferry va chu de 'island')
 */

const CITY_PROFILES = {
  // --- Alps / Trung Au ---
  Lauterbrunnen: {
    themes: ['nature', 'mountain', 'trekking', 'adventure', 'photography'],
    phys: 4, pace: 'relaxed', railGroup: 'EUROPE', hsr: true, island: false
  },
  Munich: {
    themes: ['history', 'architecture', 'museum', 'food'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },
  Berlin: {
    // 'island' cu la do "Museum Island" - sua thanh 'museum'
    themes: ['history', 'museum', 'culture', 'nightlife', 'architecture'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },

  // --- Anh ---
  London: {
    themes: ['museum', 'history', 'architecture', 'shopping'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },
  Manchester: {
    themes: ['culture', 'nightlife', 'architecture', 'museum'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },

  // --- Phap ---
  Paris: {
    themes: ['museum', 'architecture', 'romantic', 'food', 'history'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },
  Lyon: {
    // Lyon la thu phu am thuc cua Phap - 'food' o day co co so that
    themes: ['food', 'history', 'architecture', 'museum'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },
  Bordeaux: {
    themes: ['food', 'architecture', 'history', 'culture'],
    phys: 1, pace: 'relaxed', railGroup: 'EUROPE', hsr: true, island: false
  },
  Marseille: {
    themes: ['beach', 'culture', 'food', 'nature'],
    phys: 3, pace: 'relaxed', railGroup: 'EUROPE', hsr: true, island: false
  },

  // --- Y ---
  Rome: {
    themes: ['history', 'architecture', 'museum', 'culture', 'food'],
    phys: 3, pace: 'packed', railGroup: 'EUROPE', hsr: true, island: false
  },
  Florence: {
    themes: ['museum', 'architecture', 'history', 'culture', 'food'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },
  Venice: {
    themes: ['architecture', 'history', 'romantic', 'photography', 'culture'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },
  Milan: {
    // truoc chi co 2 chu de
    themes: ['architecture', 'shopping', 'museum', 'food'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },

  // --- Tay Ban Nha ---
  Barcelona: {
    themes: ['architecture', 'beach', 'culture', 'nightlife', 'food'],
    phys: 3, pace: 'balanced', railGroup: 'EUROPE', hsr: true, island: false
  },
  Valencia: {
    themes: ['beach', 'culture', 'architecture', 'food'],
    phys: 1, pace: 'relaxed', railGroup: 'EUROPE', hsr: true, island: false
  },

  // --- Bo Dao Nha (hai thanh pho nhieu doi doc, phys 3 la that) ---
  Lisbon: {
    themes: ['history', 'architecture', 'culture', 'food', 'photography'],
    phys: 3, pace: 'packed', railGroup: 'EUROPE', hsr: true, island: false
  },
  Porto: {
    themes: ['food', 'history', 'architecture', 'culture'],
    phys: 3, pace: 'packed', railGroup: 'EUROPE', hsr: true, island: false
  },

  // --- Ha Lan ---
  Amsterdam: {
    themes: ['museum', 'history', 'architecture', 'nightlife'],
    phys: 2, pace: 'packed', railGroup: 'EUROPE', hsr: true, island: false
  },

  // --- Hy Lap ---
  Athens: {
    themes: ['history', 'architecture', 'museum', 'culture'],
    phys: 2, pace: 'balanced', railGroup: 'EUROPE', hsr: false, island: false
  },
  Santorini: {
    themes: ['island', 'beach', 'romantic', 'photography', 'wellness'],
    phys: 2, pace: 'relaxed', railGroup: 'EUROPE', hsr: false, island: true
  },

  // --- Nga ---
  Moscow: {
    themes: ['history', 'architecture', 'museum', 'culture'],
    phys: 2, pace: 'balanced', railGroup: 'RUSSIA', hsr: false, island: false
  },
  Kazan: {
    themes: ['history', 'architecture', 'culture', 'museum'],
    phys: 2, pace: 'balanced', railGroup: 'RUSSIA', hsr: false, island: false
  },

  // --- Canada ---
  Toronto: {
    themes: ['museum', 'culture', 'architecture', 'shopping'],
    phys: 2, pace: 'balanced', railGroup: 'CANADA', hsr: false, island: false
  },
  Montreal: {
    themes: ['culture', 'history', 'museum', 'food'],
    phys: 2, pace: 'packed', railGroup: 'CANADA', hsr: false, island: false
  },
  Vancouver: {
    // phys 4 + challenging truoc day la qua: day la tour thanh pho co nui o ke ben
    themes: ['nature', 'mountain', 'trekking', 'adventure', 'beach'],
    phys: 3, pace: 'relaxed', railGroup: 'CANADA', hsr: false, island: false
  },

  // --- Nhat ---
  Tokyo: {
    themes: ['culture', 'shopping', 'food', 'nightlife', 'architecture'],
    phys: 2, pace: 'packed', railGroup: 'JAPAN', hsr: true, island: false
  },
  Osaka: {
    // Osaka duoc goi la "nha bep cua Nhat" - 'food' co co so
    themes: ['food', 'nightlife', 'culture', 'shopping'],
    phys: 2, pace: 'packed', railGroup: 'JAPAN', hsr: true, island: false
  },
  Kyoto: {
    themes: ['culture', 'history', 'architecture', 'photography', 'wellness'],
    phys: 2, pace: 'relaxed', railGroup: 'JAPAN', hsr: true, island: false
  },

  // --- Dong Nam A ---
  Bangkok: {
    themes: ['culture', 'history', 'shopping', 'food', 'nightlife'],
    phys: 2, pace: 'packed', railGroup: 'SEA', hsr: false, island: false
  },
  Phuket: {
    themes: ['beach', 'island', 'water-sports', 'nightlife', 'wellness'],
    phys: 2, pace: 'relaxed', railGroup: 'SEA', hsr: false, island: true
  },
  'Kuala Lumpur': {
    themes: ['architecture', 'shopping', 'food', 'culture'],
    phys: 2, pace: 'balanced', railGroup: 'SEA', hsr: false, island: false
  },
  Malacca: {
    // Sua loi nang nhat: truoc day la mountain / phys 4 / challenging vi
    // "St. Paul's Hill". Thuc te la pho co di bo phang, di san UNESCO.
    themes: ['history', 'culture', 'food', 'shopping'],
    phys: 2, pace: 'relaxed', railGroup: 'SEA', hsr: false, island: false
  },
  Langkawi: {
    themes: ['island', 'beach', 'nature', 'wildlife', 'water-sports'],
    phys: 2, pace: 'relaxed', railGroup: 'SEA', hsr: false, island: true
  },
  'Causeway Bay': {
    themes: ['shopping', 'food', 'nightlife', 'culture'],
    phys: 2, pace: 'packed', railGroup: 'SEA', hsr: false, island: false
  },

  // --- Nam A ---
  Delhi: {
    themes: ['history', 'architecture', 'culture', 'food', 'shopping'],
    phys: 3, pace: 'packed', railGroup: 'INDIA', hsr: false, island: false
  },

  // --- An Do Duong ---
  Maldives: {
    themes: ['island', 'beach', 'water-sports', 'wellness', 'romantic'],
    phys: 1, pace: 'relaxed', railGroup: 'MALDIVES', hsr: false, island: true
  }
};

/** difficulty luon suy ra tu physicalLevel, de hai truong khong bao gio nguoc nhau. */
function difficultyFromPhysical(phys) {
  if (phys >= 4) return 'challenging';
  if (phys === 3) return 'moderate';
  return 'easy';
}

module.exports = { CITY_PROFILES, difficultyFromPhysical };
