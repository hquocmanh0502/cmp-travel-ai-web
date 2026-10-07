/**
 * Dua User.preferences ve dung tu vung chuan.
 *
 * VAN DE TRUOC KHI CHAY:
 *   Gia tri THAT dang co trong DB (User.preferences.activities):
 *     adventure, beach, beaches, cultural, culture, food, nature,
 *     nightlife, photography, shopping, sightseeing
 *
 *   Nhung config/tour-mapping.js chi co cac khoa:
 *     sightseeing, shopping, food, adventure, culture, nightlife,
 *     hiking, beach, diving, photography
 *
 *   => 'beaches', 'cultural', 'nature' KHONG co khoa nao khop. Trong
 *   recommendationService.calculateActivityMatch chung roi vao nhanh
 *
 *       const mapping = tourMapping.activities[activity.toLowerCase()];
 *       if (!mapping) continue;
 *
 *   tuc bi bo qua AM THAM, khong he bao loi - nhung VAN duoc tinh vao mau so
 *   `activities.length`. Nen mot nguoi chon 3 hoat dong ma 1 trong do la
 *   'cultural' thi diem toi da chi con 2/3, du ho khong chon gi sai.
 *
 *   Day dung la kieu loi lech mot hau to ("cultural" vs "culture") lam chet ca
 *   mot tieu chi cham diem ma khong ai thay.
 *
 * CACH SUA:
 *   Dung bang bi danh trong config/travel-vocabulary.js de dua moi gia tri ve
 *   khoa canonical, bo trung lap, va bo nhung gia tri khong nhan ra duoc.
 *   Tu nay tro di moi anh xa deu di qua mot file duy nhat.
 *
 * Chay (tu thu muc backend):
 *   node scripts/normalize-user-preferences.js --dry-run
 *   node scripts/normalize-user-preferences.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { normalizeStyle, normalizeActivity } = require('../config/travel-vocabulary');

const dryRun = process.argv.includes('--dry-run');

/** Chuan hoa mot mang gia tri, bo trung lap, giu nguyen thu tu. */
function normalizeList(list, normalizer, dropped) {
  const out = [];
  for (const raw of list || []) {
    const key = normalizer(raw);
    if (!key) {
      dropped[raw] = (dropped[raw] || 0) + 1;
      continue;
    }
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

(async () => {
  await connectDB();

  const users = await User.find({
    $or: [
      { 'preferences.travelStyle.0': { $exists: true } },
      { 'preferences.activities.0': { $exists: true } }
    ]
  }).select('username preferences');

  console.log(`Tim thay ${users.length} nguoi dung co so thich.\n`);

  const droppedStyles = {};
  const droppedActivities = {};
  const remapped = {};
  let changed = 0;

  for (const user of users) {
    const beforeStyle = [...(user.preferences.travelStyle || [])];
    const beforeAct = [...(user.preferences.activities || [])];

    const afterStyle = normalizeList(beforeStyle, normalizeStyle, droppedStyles);
    const afterAct = normalizeList(beforeAct, normalizeActivity, droppedActivities);

    // Ghi lai nhung gia tri bi doi ten de bao cao
    beforeAct.forEach(raw => {
      const key = normalizeActivity(raw);
      if (key && key !== raw) remapped[`${raw} -> ${key}`] = (remapped[`${raw} -> ${key}`] || 0) + 1;
    });
    beforeStyle.forEach(raw => {
      const key = normalizeStyle(raw);
      if (key && key !== raw) remapped[`${raw} -> ${key}`] = (remapped[`${raw} -> ${key}`] || 0) + 1;
    });

    const styleDiff = beforeStyle.join(',') !== afterStyle.join(',');
    const actDiff = beforeAct.join(',') !== afterAct.join(',');

    if (styleDiff || actDiff) {
      changed++;
      user.preferences.travelStyle = afterStyle;
      user.preferences.activities = afterAct;
      if (!dryRun) await user.save();
    }
  }

  // ------------------------------- bao cao -------------------------------
  const show = (obj, title) => {
    const rows = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    console.log(`--- ${title} ---`);
    if (!rows.length) console.log('  (khong co)');
    rows.forEach(([k, v]) => console.log(`  ${k.padEnd(28)} ${v} luot`));
    console.log('');
  };

  show(remapped, 'Da doi ten ve khoa chuan');
  show(droppedStyles, 'travelStyle khong nhan ra (da bo)');
  show(droppedActivities, 'activities khong nhan ra (da bo)');

  console.log(`So nguoi dung thay doi: ${changed}/${users.length}`);

  // Doi chieu lai sau khi sua
  const stylesNow = (await User.distinct('preferences.travelStyle')).filter(Boolean).sort();
  const actsNow = (await User.distinct('preferences.activities')).filter(Boolean).sort();
  console.log('\ntravelStyle con lai trong DB :', stylesNow.join(', '));
  console.log('activities  con lai trong DB :', actsNow.join(', '));

  if (dryRun) console.log('\nDRY-RUN: chua ghi gi vao DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
