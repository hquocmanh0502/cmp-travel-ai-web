/**
 * PHAN LOAI DIEM THAM QUAN (POI) - dung chung cho script tai va model Poi.
 *
 * Nguon POI la Wikidata cho CA 36 thanh pho, cung mot cau truy van, cung mot
 * bang phan loai duoi day. Khong co thanh pho nao duoc nguon rieng hay luat
 * rieng - neu khong, SmartTour se thien vi nhung tour tinh co co du lieu tot hon.
 *
 * Moi loai gom:
 *   roots        : cac lop Wikidata goc. Mot dia diem thuoc loai nay neu P31 cua
 *                  no la lop con (P279*) cua mot trong cac lop goc.
 *   visitMinutes : thoi gian tham quan dien hinh. Wikidata khong co truong nay,
 *                  nen dung MOT bang co dinh cho moi thanh pho (giai trinh duoc,
 *                  va dong nhat) thay vi doan rieng tung diem.
 *   themes       : anh xa sang Tour.themes de cham diem theo so thich.
 *   cap          : toi da bao nhieu diem loai nay moi thanh pho. Khong co tran thi
 *                  London co 6 san van dong trong top 60 - dung la noi tieng
 *                  nhung khong phai thu khach tour muon xep kin lich.
 *
 * Thu tu trong mang = do uu tien khi mot dia diem thuoc nhieu loai.
 * Vi du Tower of London vua la museum vua la castle -> lay 'palace-castle'.
 */

const POI_CATEGORIES = [
  { key: 'family-attraction', roots: ['Q43501', 'Q2281788', 'Q194195'],         // zoo, thuy cung, cong vien giai tri
    visitMinutes: 180, themes: ['family'], cap: 3 },
  { key: 'palace-castle',     roots: ['Q16560', 'Q23413', 'Q57821'],            // cung dien, lau dai, thanh luy
    visitMinutes: 120, themes: ['history', 'architecture'], cap: 6 },
  { key: 'museum',            roots: ['Q33506', 'Q1007870', 'Q5773747'],        // bao tang, phong tranh, nha di san
    visitMinutes: 120, themes: ['museum', 'culture'], cap: 8 },
  { key: 'archaeological',    roots: ['Q839954', 'Q109607'],                    // khu khao co, phe tich
    visitMinutes: 90, themes: ['history'], cap: 5 },
  { key: 'religious',         roots: ['Q24398318', 'Q1370598'],                 // cong trinh ton giao
    visitMinutes: 45, themes: ['culture', 'architecture'], cap: 6 },
  { key: 'monument',          roots: ['Q4989906', 'Q5003624', 'Q1081138', 'Q179700'], // tuong dai, dai tuong niem, di tich, tuong
    visitMinutes: 20, themes: ['history'], cap: 4 },
  { key: 'beach',             roots: ['Q40080'],
    visitMinutes: 180, themes: ['beach'], cap: 4 },
  { key: 'island',            roots: ['Q23442'],
    visitMinutes: 240, themes: ['island'], cap: 4 },
  { key: 'mountain',          roots: ['Q8502'],
    visitMinutes: 240, themes: ['mountain', 'nature'], cap: 4 },
  { key: 'nature',            roots: ['Q34038', 'Q23397', 'Q46169', 'Q473972'], // thac, ho, VQG, khu bao ton
    visitMinutes: 90, themes: ['nature'], cap: 5 },
  { key: 'park',              roots: ['Q22698', 'Q1107656'],                    // cong vien, vuon
    visitMinutes: 60, themes: ['nature'], cap: 5 },
  { key: 'viewpoint',         roots: ['Q6017969', 'Q185113'],                   // diem ngam canh, mui dat
    visitMinutes: 30, themes: ['photography'], cap: 3 },
  { key: 'landmark',          roots: ['Q12280', 'Q12518', 'Q11303'],            // cau, thap, nha choc troi
    visitMinutes: 30, themes: ['architecture', 'photography'], cap: 5 },
  { key: 'performing-arts',   roots: ['Q24354', 'Q153562', 'Q1060829'],         // nha hat, nha hat opera, phong hoa nhac
    visitMinutes: 60, themes: ['culture', 'nightlife'], cap: 3 },
  // 3 loai duoi day them ngay 2026-10-19: truoc do 17/20 tour gan 'food' nhung
  // co duoi 2 diem am thuc, khach chon "Food" nhan lich toan bao tang.
  { key: 'market',            roots: ['Q132510', 'Q28142754', 'Q1962840'],      // cho, cho am thuc, cho dem
    visitMinutes: 60, themes: ['food', 'shopping'], cap: 3 },
  { key: 'eatery',            roots: ['Q11707', 'Q30022', 'Q18355750'],         // nha hang, quan ca phe, khu am thuc
    visitMinutes: 75, themes: ['food'], cap: 3 },
  { key: 'nightlife',         roots: ['Q622425', 'Q187456', 'Q212198', 'Q3055075'], // hop dem, bar, pub, khu giai tri
    visitMinutes: 90, themes: ['nightlife'], cap: 3 },
  { key: 'shopping',          roots: ['Q11315', 'Q216107', 'Q21000333', 'Q27095213'], // TTTM, bach hoa, pho / khu mua sam
    visitMinutes: 60, themes: ['shopping'], cap: 3 },
  { key: 'district',          roots: ['Q174782', 'Q123705', 'Q15243209'],       // quang truong, khu pho, khu pho co
    visitMinutes: 60, themes: ['culture', 'architecture'], cap: 4 },
  { key: 'stadium',           roots: ['Q483110'],
    visitMinutes: 60, themes: [], cap: 1 },
  { key: 'attraction',        roots: ['Q570116', 'Q1576693'],                   // "tourist attraction" chung chung, cap treo
    visitMinutes: 60, themes: [], cap: 5 }
];

// Loai bo:
//   Q19860854 cong trinh da bi pha huy (vd The Crystal Palace, Wembley cu)
//   Q852190   tau dam - nam duoi bien, khong tham quan duoc (vd HMT Royal
//             Edward o Santorini tung lot vao nhom 'archaeological')
//   Q4140840  tac pham da that lac (vd tuong Athena Parthenos - mat tu thoi co dai)
// Ngoai ra bi loai ngay trong cau truy van (xem scripts/fetch-wikidata-pois.js):
//   P576  da giai the / dong cua
//   P5816 = Q56556915 (da bi pha do), vd Marseille Transporter Bridge
//   P195  hien vat thuoc bo suu tap cua noi khac (vd Venus de Milo nam TRONG
//         Louvre) - khach xem no khi vao bao tang, khong phai mot diem rieng
const EXCLUDED_ROOTS = ['Q19860854', 'Q852190', 'Q4140840'];

// Don vi HANH CHINH thuan tuy (quan, phuong, arrondissement): khong phai noi de
// "tham quan 1 tieng". Vd "1st arrondissement of Paris", "Kita-ku" (Osaka),
// "North York" (Toronto), "Charlottenburg-Wilmersdorf" (Berlin).
//
// Khong loai theo "thuoc nhom hanh chinh" vi cay phan loai Wikidata coi ca
// phao dai, lau dai, thap la don vi hanh chinh - loai the thi mat Red Fort,
// Sforza Castle, Tower of London. Luat chinh xac: MOI loai (P31) cua dia diem
// deu la hanh chinh VA khong loai nao la cong trinh xay dung.
// Montmartre (con la "hill"), Covent Garden ("shopping district"), Murren
// ("ski resort") van duoc giu.
const ADMIN_ROOT = 'Q56061';         // administrative territorial entity
const CONSTRUCTION_ROOT = 'Q811430'; // fixed construction (phao dai, thap, cong...)

/** true neu dia diem chi la don vi hanh chinh (rootsPerType: lop goc cua tung P31). */
function isPurelyAdministrative(rootsPerType) {
  if (!rootsPerType.length) return false;
  const allAdmin = rootsPerType.every(r => r.includes(ADMIN_ROOT));
  const anyConstruction = rootsPerType.some(r => r.includes(CONSTRUCTION_ROOT));
  return allAdmin && !anyConstruction;
}

const ALL_ROOTS = [...new Set(POI_CATEGORIES.flatMap(c => c.roots))];
const CATEGORY_KEYS = POI_CATEGORIES.map(c => c.key);
const categoryByKey = Object.fromEntries(POI_CATEGORIES.map(c => [c.key, c]));

/** Chon loai uu tien cao nhat trong cac lop goc ma dia diem thuoc ve. */
function categoryFromRoots(rootIds) {
  const set = new Set(rootIds);
  return POI_CATEGORIES.find(c => c.roots.some(r => set.has(r))) || null;
}

// Quoc gia (P17) tren Wikidata - de loai diem nam ben kia bien gioi trong ban
// kinh tim kiem. Hong Kong tren Wikidata ghi P17 = Trung Quoc (Q148).
const COUNTRY_QIDS = {
  'United Kingdom': 'Q145', Italy: 'Q38', Spain: 'Q29', France: 'Q142',
  Canada: 'Q16', Greece: 'Q41', Malaysia: 'Q833', 'Hong Kong': 'Q148',
  Portugal: 'Q45', Russia: 'Q159', Thailand: 'Q869', Germany: 'Q183',
  Maldives: 'Q826', Netherlands: 'Q55', Japan: 'Q17', India: 'Q668',
  Switzerland: 'Q39'
};

module.exports = {
  POI_CATEGORIES, EXCLUDED_ROOTS, ALL_ROOTS, CATEGORY_KEYS, COUNTRY_QIDS,
  ADMIN_ROOT, CONSTRUCTION_ROOT, isPurelyAdministrative,
  categoryByKey, categoryFromRoots
};
