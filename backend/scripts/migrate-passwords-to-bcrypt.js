/**
 * Migration: hash các mật khẩu còn lưu dạng plaintext.
 *
 * Bối cảnh: dữ liệu cũ được nạp bằng insertMany nên hook pre('save') của model
 * không chạy, mật khẩu nằm nguyên văn trong DB. Sau khi chuyển sang bcrypt.compare,
 * những tài khoản này sẽ không đăng nhập được nữa nếu không migrate.
 *
 * Script giữ nguyên mật khẩu hiện tại của người dùng - chỉ thay giá trị lưu trong
 * DB bằng bản hash, nên không ai phải đặt lại mật khẩu.
 *
 * Chạy:  node scripts/migrate-passwords-to-bcrypt.js
 *        node scripts/migrate-passwords-to-bcrypt.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await connectDB();

  const users = await User.find({}).select('+password');
  console.log(`\nTổng số tài khoản: ${users.length}`);

  const needMigration = users.filter(u => !User.isBcryptHash(u.password));
  const alreadyHashed = users.length - needMigration.length;

  console.log(`Đã hash sẵn      : ${alreadyHashed}`);
  console.log(`Cần migrate      : ${needMigration.length}\n`);

  if (needMigration.length === 0) {
    console.log('Không có gì để làm.');
    await mongoose.disconnect();
    return;
  }

  if (dryRun) {
    needMigration.forEach(u => console.log(`  [dry-run] sẽ hash: ${u.email}`));
    console.log('\nDry-run - không ghi gì vào DB.');
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  for (const user of needMigration) {
    // Gán lại chính mật khẩu cũ rồi save: hook pre('save') sẽ hash nó.
    user.password = user.password;
    user.markModified('password');
    await user.save();
    migrated++;
    console.log(`  ✅ ${user.email}`);
  }

  // Kiểm chứng lại sau khi ghi.
  const stillPlain = (await User.find({}).select('+password'))
    .filter(u => !User.isBcryptHash(u.password));

  console.log(`\nĐã migrate ${migrated} tài khoản.`);
  console.log(`Còn sót plaintext: ${stillPlain.length}`);

  await mongoose.disconnect();
})().catch(err => {
  console.error('Migration thất bại:', err);
  process.exit(1);
});
