/**
 * Nạp tiền vào ví để THỬ NGHIỆM, không qua cổng thanh toán.
 *
 * Dùng khi chưa cấu hình PayOS nhưng vẫn cần test luồng đặt tour và thanh toán
 * bằng ví. Mọi giao dịch tạo ra đều được đánh dấu là nạp thủ công để phân biệt
 * với giao dịch thật.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/topup-wallet.js demo@example.com 20000
 *   node scripts/topup-wallet.js --list          xem số dư các tài khoản
 *   node scripts/topup-wallet.js demo@example.com --reset   đưa số dư về 0
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const MARK = 'MANUAL-TOPUP';

(async () => {
  await connectDB();

  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const users = await User.find({ 'wallet.balance': { $gt: 0 } }, 'email wallet.balance')
      .sort({ 'wallet.balance': -1 }).limit(15).lean();
    console.log('\nTài khoản có số dư:');
    if (users.length === 0) console.log('  (không có tài khoản nào)');
    users.forEach(u => console.log(`  ${u.email.padEnd(32)} $${(u.wallet?.balance || 0).toLocaleString()}`));
    await mongoose.disconnect();
    return;
  }

  const email = args.find(a => a.includes('@'));
  if (!email) {
    console.error('Thiếu email. Ví dụ: node scripts/topup-wallet.js demo@example.com 20000');
    process.exit(1);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`Không tìm thấy tài khoản: ${email}`);
    process.exit(1);
  }

  const before = user.wallet?.balance || 0;

  if (args.includes('--reset')) {
    await User.updateOne({ _id: user._id }, {
      $set: { 'wallet.balance': 0 },
      $pull: { 'wallet.transactions': { description: { $regex: MARK } } }
    });
    console.log(`\n${user.email}: $${before} -> $0 (đã xoá các lần nạp thủ công)`);
    await mongoose.disconnect();
    return;
  }

  const amount = Number(args.find(a => /^\d+$/.test(a)));
  if (!amount || amount <= 0) {
    console.error('Số tiền không hợp lệ. Ví dụ: node scripts/topup-wallet.js demo@example.com 20000');
    process.exit(1);
  }

  // Cộng nguyên tử, giống cách các luồng thanh toán thật đang làm.
  await User.updateOne({ _id: user._id }, {
    $inc: { 'wallet.balance': amount },
    $push: {
      'wallet.transactions': {
        type: 'topup',
        amount,
        description: `${MARK}: nạp thủ công để thử nghiệm`,
        status: 'completed',
        date: new Date(),
        completedAt: new Date()
      }
    }
  });

  const after = await User.findById(user._id, 'wallet.balance').lean();
  console.log(`\n${user.email}: $${before.toLocaleString()} -> $${after.wallet.balance.toLocaleString()}`);

  await mongoose.disconnect();
})().catch(err => { console.error('Thất bại:', err); process.exit(1); });
