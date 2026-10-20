/**
 * Doi User.preferences.budgetRange tu "tong tien ca doan" sang "USD moi nguoi".
 *
 * VAN DE TRUOC KHI CHAY:
 *   scripts/seed-user-behavior.js (ban cu) lay budgetRange quanh TONG TIEN cac
 *   booking da dat (totalAmount, ca doan), +-20%. Ket qua: 55/62 nguoi co
 *   "ngan sach toi da" tren $10,000, vd $26,400 - trong khi gia tour tinh theo
 *   NGUOI ($3,200 - $9,600). SmartTour tu dien ngan sach do vao form thi tour
 *   nao cung "du ngan sach", va thanh truot o trang Preferences (toi da $10,000)
 *   khong hien duoc.
 *
 * CACH SUA:
 *   Chi sua nhung user co budgetRange KHOP DUNG cong thuc cu tren tong tien
 *   (min = round(min tong * 0.8), max = round(max tong * 1.2)) - tuc chac chan do
 *   script sinh ra. Ngan sach nguoi dung tu chon tren trang Preferences giu nguyen.
 *   Gia tri moi: cung cong thuc nhung tren tien MOI NGUOI cua tung booking
 *   (totalAmount / so khach tra tien).
 *
 * Chay lai duoc: sau khi doi, gia tri khong con khop cong thuc tong tien nen lan
 * sau bo qua (tru booking 1 nguoi, khi do tong tien = tien moi nguoi, ket qua y het).
 *
 * Chay (tu thu muc backend):
 *   node scripts/fix-budget-per-person.js --dry-run
 *   node scripts/fix-budget-per-person.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Booking = require('../models/Booking');

const dryRun = process.argv.includes('--dry-run');

const rangeAround = (amounts) => ({
  min: Math.round(Math.min(...amounts) * 0.8),
  max: Math.round(Math.max(...amounts) * 1.2)
});

(async () => {
  await connectDB();

  const users = await User.find({ 'preferences.budgetRange.max': { $gt: 0 } });
  const bookings = await Booking.find({ totalAmount: { $gt: 0 } }, { userId: 1, totalAmount: 1, adults: 1, children: 1 }).lean();
  const byUser = new Map();
  bookings.forEach(b => {
    const k = String(b.userId);
    if (!byUser.has(k)) byUser.set(k, []);
    byUser.get(k).push(b);
  });

  let fixed = 0, kept = 0;
  const examples = [];
  for (const user of users) {
    const current = user.preferences.budgetRange;
    const own = byUser.get(String(user._id)) || [];
    if (!own.length) { kept++; continue; }

    const legacy = rangeAround(own.map(b => b.totalAmount));
    if (current.min !== legacy.min || current.max !== legacy.max) { kept++; continue; }

    const perPerson = rangeAround(own.map(b => b.totalAmount / Math.max(1, (b.adults || 1) + (b.children || 0))));
    // Booking 1 nguoi: tien moi nguoi = tong tien, gia tri da dung san
    if (perPerson.min === current.min && perPerson.max === current.max) { kept++; continue; }
    if (examples.length < 5) {
      examples.push(`${user.username}: $${current.min}-$${current.max} -> $${perPerson.min}-$${perPerson.max} /nguoi`);
    }
    if (!dryRun) {
      user.preferences.budgetRange = perPerson;
      await user.save();
    }
    fixed++;
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Doi ${fixed} user sang ngan sach moi nguoi, giu nguyen ${kept} user.`);
  examples.forEach(e => console.log('  ' + e));
  await mongoose.disconnect();
})().catch(async err => {
  console.error('That bai:', err);
  await mongoose.disconnect();
  process.exit(1);
});
