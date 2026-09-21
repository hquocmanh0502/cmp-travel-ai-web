/**
 * Cấp hoặc thu hồi quyền quản trị cho một tài khoản.
 *
 * Chạy:  node scripts/set-admin-role.js <email>            -> cấp quyền admin
 *        node scripts/set-admin-role.js <email> --revoke    -> hạ về user thường
 *        node scripts/set-admin-role.js --list              -> liệt kê admin hiện có
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();

  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const admins = await User.find({ role: 'admin' }).select('email fullName');
    console.log(`\nSố admin hiện có: ${admins.length}`);
    admins.forEach(a => console.log(`  - ${a.email} (${a.fullName})`));
    await mongoose.disconnect();
    return;
  }

  const email = args.find(a => !a.startsWith('--'));
  const revoke = args.includes('--revoke');

  if (!email) {
    console.error('Thiếu email. Ví dụ: node scripts/set-admin-role.js admin@cmptravel.com');
    process.exit(1);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`Không tìm thấy tài khoản với email: ${email}`);
    process.exit(1);
  }

  user.role = revoke ? 'user' : 'admin';
  await user.save();

  console.log(`\n✅ ${user.email} -> role = ${user.role}`);

  await mongoose.disconnect();
})().catch(err => {
  console.error('Thất bại:', err);
  process.exit(1);
});
