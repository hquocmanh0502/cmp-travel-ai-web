/**
 * Sua lai phan loai cua 36 tour cho dung va co tinh phan biet.
 *
 * NHUNG GI SAI TRUOC KHI CHAY (do do thuc tren DB, khong phai phong doan):
 *
 *   1. duration la String "5 days" -> khong the tra loi "toi co 6 ngay" bang
 *      truy van. Day la loi chan SmartTour nang nhat.
 *   2. 'food' gan cho 36/36 tour; 'solo' va 'friends' cung 36/36. Nhan co o moi
 *      tour thi khong giup loc hay xep hang gi.
 *   3. 'seniors' gan cho 31/36 tour, trong do co 2 tour difficulty
 *      'challenging' (Lauterbrunnen, Malacca) - hai thong tin nguoc nhau.
 *   4. Nhan gia nguoc voi gia: London 8000$/10 ngay = 800$/ngay (RE NHAT tinh
 *      theo ngay) bi gan 'luxury', con Valencia 4000$/3 ngay = 1333$/ngay (DAT
 *      NHAT) bi gan 'budget'.
 *   5. Malacca co 'mountain' + physicalLevel 4 + 'challenging' vi attraction ten
 *      "St. Paul's Hill" (go cao 20m). Berlin co 'island' vi "Museum Island".
 *   6. Milan chi con 2 chu de; mot so tour khac len tan 9 chu de.
 *   7. Khong truong nao ghi don vi tien te.
 *
 * CACH SUA:
 *   - Chu de NOI DUNG: lay tu config/city-profiles.js (tham dinh tay 36 thanh pho).
 *   - Nhan GIA ('budget'/'luxury'): tinh theo phan vi 1/3 cua gia moi ngay.
 *   - physicalLevel: lay tu city-profiles; difficulty va minAge SUY RA tu no nen
 *     ba truong khong bao gio nguoc nhau nua.
 *   - suitableFor: suy ra bang luat co dieu kien ro rang (in o cuoi script).
 *
 * Chay (tu thu muc backend):
 *   node scripts/fix-tour-taxonomy.js --dry-run
 *   node scripts/fix-tour-taxonomy.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const { CURRENCY } = require('../config/travel-vocabulary');
const { CITY_PROFILES, difficultyFromPhysical } = require('../config/city-profiles');

const dryRun = process.argv.includes('--dry-run');

const MAX_CONTENT_THEMES = 5;

/** So ngay dang so, doc tu chuoi duration ("5 days", "1 week", "10 ngay"). */
function parseDurationDays(duration) {
  if (typeof duration === 'number') return duration;
  const text = String(duration || '').toLowerCase();

  const weeks = text.match(/(\d+)\s*(week|tuan)/);
  if (weeks) return Number(weeks[1]) * 7;

  const days = text.match(/(\d+)/);
  return days ? Number(days[1]) : null;
}

/**
 * minAge suy ra tu muc van dong, de khong con truong hop tour di bo phang
 * nhung lai chan tre duoi 12 tuoi (Malacca truoc day).
 */
function minAgeFromPhysical(phys) {
  if (phys >= 4) return 12;
  if (phys === 3) return 6;
  return 0;
}

/**
 * Nhan gia theo phan vi gia-moi-ngay trong toan bo danh muc.
 * 1/3 thap nhat -> 'budget', 1/3 cao nhat -> 'luxury', khoang giua khong gan nhan.
 * Nho vay mot tour khong bao gio vua 'budget' vua 'luxury'.
 */
function buildPriceTierResolver(tours) {
  const perDay = tours
    .map(t => {
      const days = parseDurationDays(t.duration);
      return days ? t.estimatedCost / days : null;
    })
    .filter(v => v !== null)
    .sort((a, b) => a - b);

  const lowCut = perDay[Math.floor(perDay.length / 3)];
  const highCut = perDay[Math.floor((perDay.length * 2) / 3)];

  return {
    lowCut,
    highCut,
    resolve(costPerDay) {
      if (costPerDay === null) return null;
      if (costPerDay < lowCut) return 'budget';
      if (costPerDay >= highCut) return 'luxury';
      return null;
    }
  };
}

const overlaps = (list, wanted) => list.filter(x => wanted.includes(x)).length;

/**
 * Nhom khach phu hop, suy ra bang luat.
 *
 * Moi luat phai co it nhat mot dieu kien LOAI TRU, neu khong ta lai quay ve
 * tinh trang mot nhan gan cho ca 36 tour.
 */
function deriveSuitableFor({ themes, phys, pace, difficulty, durationDays, minAge, childPrice, isIsland, maxGroupSize }) {
  const out = [];
  const cityish = ['culture', 'history', 'museum', 'architecture', 'nightlife', 'food', 'shopping'];

  // Khach di mot minh: tour thien ve thanh pho / van hoa, VA doan du dong.
  //
  // Dieu kien maxGroupSize >= 16 khong phai cat tuy y: voi khach di mot minh thi
  // chuyen co doan dong moi co nguoi de giao luu va khong bi phu phi phong don
  // nhu tour rieng doan nho. Neu bo dieu kien nay thi 'solo' gan cho 83% tour,
  // tuc lai tro ve tinh trang nhan khong phan biet duoc gi.
  if (overlaps(themes, cityish) >= 2 && maxGroupSize >= 16) out.push('solo');

  // Cap doi: hoac co yeu to lang man/thu gian, hoac la diem den am thuc - van hoa
  // (an uong va kham pha van hoa la kieu di pho bien cua cap doi), va khong don dap.
  if (pace !== 'packed' && (
        overlaps(themes, ['romantic', 'beach', 'island', 'wellness', 'photography']) >= 1 ||
        overlaps(themes, ['food', 'culture']) >= 2
      )) {
    out.push('couple');
  }

  // Gia dinh co tre nho: van dong nhe, cho phep tre nho, co gia tre em.
  // phys <= 2 (khong phai 3) vi tour nhieu doi doc nhu Lisbon/Porto khong phu hop
  // voi gia dinh co tre nho.
  if (phys <= 2 && minAge <= 6 && childPrice > 0 && pace !== 'packed') out.push('family');

  // Nhom ban be: can hoat dong soi noi.
  if (overlaps(themes, ['nightlife', 'beach', 'island', 'adventure', 'water-sports', 'shopping']) >= 1) {
    out.push('friends');
  }

  // Nguoi lon tuoi: van dong nhe, khong don dap, khong tour kho.
  if (phys <= 2 && pace !== 'packed' && difficulty !== 'challenging') out.push('seniors');

  // Tuan trang mat: lang man hoac dao, hoac bien ket hop nghi duong.
  if (overlaps(themes, ['romantic', 'island']) >= 1 ||
      (themes.includes('beach') && themes.includes('wellness'))) {
    out.push('honeymoon');
  }

  // Ket hop cong tac: chuyen ngan, thanh pho lon, khong phai diem nghi duong dao.
  if (durationDays <= 5 && pace !== 'relaxed' && !isIsland &&
      overlaps(themes, ['architecture', 'museum', 'culture', 'shopping', 'food']) >= 2) {
    out.push('business');
  }

  return out;
}

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  console.log(`Tim thay ${tours.length} tour.\n`);

  const priceTier = buildPriceTierResolver(tours);
  console.log(`Nguong gia moi ngay: budget < $${priceTier.lowCut.toFixed(0)} | luxury >= $${priceTier.highCut.toFixed(0)}\n`);

  const missingProfile = [];
  const changes = [];
  const themeCount = {};
  const audienceCount = {};
  const physCount = {};

  for (const tour of tours) {
    const profile = CITY_PROFILES[tour.name];
    if (!profile) {
      missingProfile.push(tour.name);
      continue;
    }

    const before = {
      themes: [...(tour.themes || [])],
      suitableFor: [...(tour.suitableFor || [])],
      phys: tour.physicalLevel,
      difficulty: tour.difficulty,
      minAge: tour.minAge
    };

    // --- 1. Ban so cua duration ---
    const durationDays = parseDurationDays(tour.duration);
    tour.durationDays = durationDays;

    // --- 2. Don vi tien te ---
    tour.currency = CURRENCY;

    // --- 3. Chu de: noi dung tham dinh tay + nhan gia tinh toan ---
    const contentThemes = profile.themes.slice(0, MAX_CONTENT_THEMES);
    const costPerDay = durationDays ? tour.estimatedCost / durationDays : null;
    const priceTheme = priceTier.resolve(costPerDay);
    tour.themes = priceTheme ? [...contentThemes, priceTheme] : contentThemes;

    // --- 4. Van dong / do kho / tuoi toi thieu: mot nguon, ba truong khop nhau ---
    tour.physicalLevel = profile.phys;
    tour.difficulty = difficultyFromPhysical(profile.phys);
    tour.minAge = minAgeFromPhysical(profile.phys);
    tour.pace = profile.pace;

    // --- 5. Nhom khach phu hop ---
    tour.suitableFor = deriveSuitableFor({
      themes: tour.themes,
      phys: tour.physicalLevel,
      pace: tour.pace,
      difficulty: tour.difficulty,
      durationDays: durationDays || 99,
      minAge: tour.minAge,
      childPrice: tour.pricing?.child || 0,
      isIsland: profile.island,
      maxGroupSize: tour.maxGroupSize || 0
    });

    // --- 6. tags: thay "ten nuoc / budget / popular" bang tu vung dung duoc ---
    // tags cu chi co 3 gia tri vo nghia nen khong ai so khop duoc. Gio dong bo
    // voi themes de cac truy van text/SEO cu van chay.
    tour.tags = [...new Set([
      tour.country.toLowerCase(),
      ...tour.themes
    ])];

    tour.themes.forEach(t => (themeCount[t] = (themeCount[t] || 0) + 1));
    tour.suitableFor.forEach(a => (audienceCount[a] = (audienceCount[a] || 0) + 1));
    physCount[tour.physicalLevel] = (physCount[tour.physicalLevel] || 0) + 1;

    const themeDiff = before.themes.sort().join(',') !== [...tour.themes].sort().join(',');
    const audDiff = before.suitableFor.sort().join(',') !== [...tour.suitableFor].sort().join(',');
    if (themeDiff || audDiff || before.phys !== tour.physicalLevel || before.minAge !== tour.minAge) {
      changes.push({ name: tour.name, before, after: {
        themes: [...tour.themes], suitableFor: [...tour.suitableFor],
        phys: tour.physicalLevel, difficulty: tour.difficulty, minAge: tour.minAge
      }});
    }

    if (!dryRun) await tour.save();
  }

  // ------------------------------- bao cao -------------------------------
  const n = tours.length;
  const pct = (c) => `${c} (${Math.round((c / n) * 100)}%)`;
  const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

  if (missingProfile.length) {
    console.log('THIEU PROFILE (khong sua):', missingProfile.join(', '), '\n');
  }

  console.log('--- Thay doi dang chu y ---');
  const notable = ['Malacca', 'Berlin', 'Milan', 'London', 'Valencia', 'Lauterbrunnen', 'Vancouver'];
  changes.filter(c => notable.includes(c.name)).forEach(c => {
    console.log(`\n${c.name}`);
    console.log(`  themes      : ${c.before.themes.join(', ')}`);
    console.log(`             -> ${c.after.themes.join(', ')}`);
    console.log(`  suitableFor : ${c.before.suitableFor.join(', ')}`);
    console.log(`             -> ${c.after.suitableFor.join(', ')}`);
    console.log(`  phys/diff/minAge: ${c.before.phys}/${c.before.difficulty}/${c.before.minAge}` +
                ` -> ${c.after.phys}/${c.after.difficulty}/${c.after.minAge}`);
  });

  console.log(`\n--- Phan bo chu de (${n} tour) ---`);
  sortDesc(themeCount).forEach(([k, v]) => {
    const flag = v / n > 0.7 ? '  <-- VUOT 70%' : '';
    console.log(`  ${k.padEnd(14)} ${pct(v)}${flag}`);
  });

  console.log('\n--- Phan bo nhom khach ---');
  sortDesc(audienceCount).forEach(([k, v]) => {
    const flag = v / n > 0.7 ? '  <-- VUOT 70%' : '';
    console.log(`  ${k.padEnd(14)} ${pct(v)}${flag}`);
  });

  console.log('\n--- Muc van dong ---');
  Object.entries(physCount).sort().forEach(([k, v]) => console.log(`  muc ${k}: ${v} tour`));

  console.log(`\nSo tour thay doi: ${changes.length}/${n}`);
  console.log('\nLuat suy ra suitableFor (de giai trinh):');
  console.log('  solo      : >=2 chu de thanh pho VA maxGroupSize >= 16');
  console.log('  couple    : pace != packed VA (>=1 chu de {romantic,beach,island,wellness,photography} HOAC >=2 chu de {food,culture})');
  console.log('  family    : phys<=2 VA minAge<=6 VA co gia tre em VA pace != packed');
  console.log('  friends   : >=1 chu de thuoc {nightlife,beach,island,adventure,water-sports,shopping}');
  console.log('  seniors   : phys<=2 VA pace != packed VA difficulty != challenging');
  console.log('  honeymoon : >=1 chu de thuoc {romantic,island} HOAC (beach VA wellness)');
  console.log('  business  : <=5 ngay VA pace != relaxed VA khong phai dao VA >=2 chu de thanh pho');

  if (dryRun) console.log('\nDRY-RUN: chua ghi gi vao DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
