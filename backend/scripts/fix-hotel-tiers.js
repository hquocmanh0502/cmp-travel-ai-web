/**
 * Sua lai hotelTiers cho dung chieu.
 *
 * VAN DE (do do thuc tren DB):
 *   31/36 tour co phu phi NGUOC CHIEU. Vi du London:
 *
 *     level 5  "London Grand Hotel"   surcharge $0     <- bi coi la muc chuan
 *     level 4  "London City Suites"   surcharge $360   <- tra THEM tien de o
 *                                                          khach san hang THAP hon
 *
 *   Vi pricingService.resolveHotelTier lay muc co surcharge nho nhat lam muc
 *   chuan, nen gia tour dang bao gom khach san 5 sao, va lua chon duy nhat con
 *   lai la "ha xuong 4 sao va tra them tien". Vo ly voi khach, va lam mat han
 *   tinh nang "chon khach san re hon de tiet kiem" cua SmartTour.
 *
 *   Paris lai dung: 3* $0 -> 4* +$360 -> 5* +$1380.
 *
 *   Rieng Kyoto co HAI muc cung level 5 va cung surcharge $0, tuc chon hay khong
 *   chon cung nhu nhau.
 *
 * CACH SUA:
 *   1. Sap xep cac muc theo level tang dan.
 *   2. Neu hai muc trung level, ha muc co surcharge thap hon xuong 1 level
 *      (Tokyo: "Grand Imperial" $0 -> level 4, "Aman Tokyo" $2000 giu level 5).
 *   3. Sap xep cac gia tri surcharge dang co theo thu tu tang dan roi gan lai
 *      theo level tang dan. Nho vay KHONG BIA SO MOI - chi sua chieu.
 *   4. Muc thap nhat luon la $0 (da gom trong gia tour).
 *   5. Truong hop ca cac muc deu $0 (Kyoto): khong con thong tin nao de phuc hoi,
 *      nen suy ra phu phi tu ty le trung vi surcharge/priceBreakdown.accommodation
 *      cua nhung tour dung chieu. Co ghi ro trong bao cao.
 *
 * Chay (tu thu muc backend):
 *   node scripts/fix-hotel-tiers.js --dry-run
 *   node scripts/fix-hotel-tiers.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');

const dryRun = process.argv.includes('--dry-run');

const round10 = (v) => Math.round(v / 10) * 10;
const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  console.log(`Tim thay ${tours.length} tour.\n`);

  // --- Buoc 0: buoc phu phi tieu bieu cua ca danh muc ---
  // Chi dung cho tour khong con thong tin phu phi nao (moi muc deu $0).
  //
  // Lay trung vi cac BUOC phu phi thuc te, khong lay ty le voi accommodation:
  // ty le do bi keo lech boi vai khach san sieu sang (Aman Tokyo +$2000).
  const steps = [];
  for (const tour of tours) {
    (tour.hotelTiers || []).map(t => t.surcharge).filter(v => v > 0)
      .forEach(v => steps.push(v));
  }
  const typicalStep = steps.length ? median(steps) : 160;
  console.log(`Buoc phu phi tieu bieu (trung vi cua ${steps.length} gia tri > 0): $${typicalStep}\n`);

  const changes = [];
  const derived = [];

  for (const tour of tours) {
    const tiers = [...(tour.hotelTiers || [])];
    if (tiers.length === 0) continue;

    const before = tiers
      .map(t => `${t.level}*+$${t.surcharge}`)
      .join(' ');

    // --- 1. sap theo level, pha trung level ---
    tiers.sort((a, b) => a.level - b.level || a.surcharge - b.surcharge);

    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].level === tiers[i - 1].level) {
        // Ha muc co surcharge thap hon xuong 1 level, khong duoi 3
        tiers[i - 1].level = Math.max(3, tiers[i - 1].level - 1);
      }
    }
    tiers.sort((a, b) => a.level - b.level);

    // --- 2. gan lai surcharge theo thu tu tang dan ---
    const values = tiers.map(t => t.surcharge).sort((a, b) => a - b);

    // Neu moi muc deu $0 thi khong con thong tin -> suy ra tu ty le
    if (values[values.length - 1] === 0 && tiers.length >= 2) {
      const step = round10(typicalStep);
      for (let i = 0; i < values.length; i++) values[i] = step * i;
      derived.push(`${tour.name}: lay buoc tieu bieu +$${step}/muc`);
    }

    tiers.forEach((t, i) => { t.surcharge = values[i]; });

    // --- 3. muc thap nhat luon la $0 (da gom trong gia tour) ---
    if (tiers[0].surcharge !== 0) {
      const offset = tiers[0].surcharge;
      tiers.forEach(t => { t.surcharge -= offset; });
    }

    const after = tiers.map(t => `${t.level}*+$${t.surcharge}`).join(' ');
    tour.hotelTiers = tiers;

    if (before !== after) changes.push({ name: tour.name, before, after });
    if (!dryRun) await tour.save();
  }

  // ------------------------------- bao cao -------------------------------
  console.log(`--- Da sua ${changes.length}/${tours.length} tour ---`);
  changes.slice(0, 12).forEach(c => {
    console.log(`  ${c.name.padEnd(15)} ${c.before.padEnd(26)} ->  ${c.after}`);
  });
  if (changes.length > 12) console.log(`  … va ${changes.length - 12} tour nua`);

  if (derived.length) {
    console.log('\n--- Tour khong con thong tin phu phi, da suy ra ---');
    derived.forEach(d => console.log('  ' + d));
  }

  // Tu kiem tra tren du lieu TRONG BO NHO, de --dry-run cung bao dung con so sau
  // khi sua (neu doc lai tu DB thi o che do dry-run se van thay so cu).
  const after = tours;
  let wrongDir = 0, dupLevel = 0, nonZeroBase = 0;
  for (const t of after) {
    const tiers = [...(t.hotelTiers || [])].sort((a, b) => a.level - b.level);
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].surcharge < tiers[i - 1].surcharge) wrongDir++;
      if (tiers[i].level === tiers[i - 1].level) dupLevel++;
    }
    if (tiers.length && tiers[0].surcharge !== 0) nonZeroBase++;
  }
  console.log('\n--- Kiem tra lai ---');
  console.log(`  phu phi nguoc chieu      : ${wrongDir}`);
  console.log(`  trung level              : ${dupLevel}`);
  console.log(`  muc chuan khac $0        : ${nonZeroBase}`);

  const sample = after.find(t => t.name === 'London');
  console.log(`\nVi du London: ` +
    [...sample.hotelTiers].sort((a, b) => a.level - b.level)
      .map(t => `${t.level}* "${t.hotelName}" +$${t.surcharge}`).join('  |  '));

  if (dryRun) console.log('\nDRY-RUN: chua ghi gi vao DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
