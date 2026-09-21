/**
 * Xoá các tài khoản do bộ test tự động tạo ra.
 *
 * Nhận diện theo email:
 *   - *@test.cmptravel.local                  (bộ test hiện tại)
 *   - probe_<số>@example.com, roundtrip_<số>@example.com   (các lần chạy cũ)
 *
 * Chạy (từ thư mục backend):
 *   node scripts/cleanup-test-accounts.js --dry-run   -> chỉ liệt kê
 *   node scripts/cleanup-test-accounts.js             -> xoá thật
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const TEST_EMAIL_PATTERNS = [
  /@test\.cmptravel\.local$/,
  /^(probe|roundtrip|short)_\d+@example\.com$/
];

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await connectDB();

  const users = await User.find({
    $or: TEST_EMAIL_PATTERNS.map(re => ({ email: { $regex: re } }))
  }).select('email createdAt');

  console.log(`\nTìm thấy ${users.length} tài khoản test:`);
  users.forEach(u => console.log(`  - ${u.email}`));

  if (users.length === 0 || dryRun) {
    if (dryRun && users.length) console.log('\nDry-run, không xoá gì.');
    await mongoose.disconnect();
    return;
  }

  const result = await User.deleteMany({ _id: { $in: users.map(u => u._id) } });
  console.log(`\nĐã xoá ${result.deletedCount} tài khoản.`);

  await mongoose.disconnect();
})().catch(err => {
  console.error('Thất bại:', err);
  process.exit(1);
});
