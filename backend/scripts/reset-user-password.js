/**
 * Đặt lại mật khẩu cho một tài khoản (dành cho admin/dev).
 *
 * Chạy (từ thư mục backend):
 *   node scripts/reset-user-password.js <email hoặc userId> <mật khẩu mới>
 *   node scripts/reset-user-password.js admin@cmptravel.com MatKhauMoi123
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const MIN_PASSWORD_LENGTH = 8; // khớp với quy định lúc đăng ký

async function resetPassword() {
    const target = process.argv[2];
    const newPassword = process.argv[3];

    if (!target || !newPassword) {
        console.log('Cách dùng: node scripts/reset-user-password.js <email hoặc userId> <mật khẩu mới>');
        process.exit(1);
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        console.log(`❌ Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`);
        process.exit(1);
    }

    await connectDB();

    try {
        const query = mongoose.Types.ObjectId.isValid(target)
            ? { _id: target }
            : { email: target.toLowerCase().trim() };

        const user = await User.findOne(query);
        if (!user) {
            console.log('❌ Không tìm thấy tài khoản');
            process.exitCode = 1;
            return;
        }

        // Gán mật khẩu thô, hook pre('save') của model sẽ hash bằng bcrypt.
        user.password = newPassword;
        await user.save();

        console.log(`\n✅ Đã đặt lại mật khẩu cho ${user.email} (role: ${user.role})`);
    } finally {
        await mongoose.disconnect();
    }
}

resetPassword().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});
