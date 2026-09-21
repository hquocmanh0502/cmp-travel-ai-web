/**
 * Kiểm thử tầng xác thực qua HTTP thật.
 *
 * Chạy khi server đang lên (từ thư mục backend):
 *   node scripts/test-auth.js
 *
 * Mật khẩu tài khoản dùng để test lấy từ biến môi trường, mặc định là tài khoản
 * seed. Nếu đã đổi mật khẩu admin thì truyền vào, ví dụ trên PowerShell:
 *   $env:TEST_ADMIN_PASSWORD="..."; node scripts/test-auth.js
 *
 * Các tài khoản test tạo ra trong lúc chạy sẽ bị xoá ở cuối, kể cả khi test lỗi.
 */

require('dotenv').config({ quiet: true });

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000/api';

const ACCOUNTS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@cmptravel.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
  },
  demo: {
    email: process.env.TEST_USER_EMAIL || 'demo@example.com',
    password: process.env.TEST_USER_PASSWORD || 'demo123'
  },
  traveler: {
    email: process.env.TEST_USER2_EMAIL || 'traveler@example.com',
    password: process.env.TEST_USER2_PASSWORD || 'travel123'
  }
};

// Mọi tài khoản test tạo ra đều dùng domain này để dễ nhận diện và dọn dẹp.
const TEST_EMAIL_DOMAIN = 'test.cmptravel.local';
const createdUserIds = [];

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try { data = await res.json(); } catch { /* không phải JSON */ }
  if (res.status === 429) rateLimited = true;
  return { status: res.status, data };
}

// Server giới hạn đăng ký 5 lần/giờ và đăng nhập sai 10 lần/15 phút cho mỗi IP.
// Một lượt test dùng 3 lần đăng ký, nên chạy 2 lượt liền nhau sẽ chạm giới hạn.
let rateLimited = false;

async function runTests() {
  console.log('\n=== 1. Đăng nhập ===');

  const wrongPw = await call('/auth/login', {
    method: 'POST',
    body: { email: ACCOUNTS.demo.email, password: 'sai-mat-khau' }
  });
  check('Sai mật khẩu bị từ chối (401)', wrongPw.status === 401, `nhận ${wrongPw.status}`);

  const noUser = await call('/auth/login', {
    method: 'POST',
    body: { email: `khong-ton-tai@${TEST_EMAIL_DOMAIN}`, password: 'gi-do-123' }
  });
  check('Email không tồn tại cũng trả 401', noUser.status === 401, `nhận ${noUser.status}`);
  check(
    'Không lộ email nào đã đăng ký (thông báo lỗi giống nhau)',
    wrongPw.data?.error === noUser.data?.error
  );

  const demo = await call('/auth/login', {
    method: 'POST',
    body: ACCOUNTS.demo
  });
  check('Mật khẩu cũ vẫn đăng nhập được sau migration', demo.status === 200, `nhận ${demo.status}`);
  check('Trả về JWT 3 phần', (demo.data?.authToken || '').split('.').length === 3);
  check('Response không chứa password', !JSON.stringify(demo.data || {}).includes('password'));

  const demoToken = demo.data?.authToken;
  const demoId = demo.data?.user?.id;
  check('User thường có role = user', demo.data?.user?.role === 'user');

  const admin = await call('/auth/login', {
    method: 'POST',
    body: ACCOUNTS.admin
  });
  check('Admin đăng nhập được', admin.status === 200, `nhận ${admin.status}`);
  check('Admin có role = admin', admin.data?.user?.role === 'admin');
  const adminToken = admin.data?.authToken;

  console.log('\n=== 2. Token giả mạo ===');

  // Đây chính là token của hệ thống cũ: base64("userId:timestamp")
  const legacyToken = Buffer.from(`${demoId}:${Date.now()}`).toString('base64');
  const legacy = await call(`/profile/${demoId}`, { token: legacyToken });
  check('Token base64 kiểu cũ bị từ chối', legacy.status === 401, `nhận ${legacy.status}`);

  const tampered = await call(`/profile/${demoId}`, { token: `${demoToken}x` });
  check('Token bị sửa chữ ký bị từ chối', tampered.status === 401, `nhận ${tampered.status}`);

  const noToken = await call(`/profile/${demoId}`);
  check('Không có token bị từ chối', noToken.status === 401, `nhận ${noToken.status}`);

  console.log('\n=== 3. Chặn IDOR (truy cập dữ liệu người khác) ===');

  const traveler = await call('/auth/login', {
    method: 'POST',
    body: ACCOUNTS.traveler
  });
  const travelerId = traveler.data?.user?.id;

  const ownProfile = await call(`/profile/${demoId}`, { token: demoToken });
  check('Đọc được hồ sơ của chính mình', ownProfile.status === 200, `nhận ${ownProfile.status}`);

  const otherProfile = await call(`/profile/${travelerId}`, { token: demoToken });
  check('Không đọc được hồ sơ người khác (403)', otherProfile.status === 403, `nhận ${otherProfile.status}`);

  const otherWallet = await call(`/wallet/${travelerId}`, { token: demoToken });
  check('Không đọc được ví người khác (403)', otherWallet.status === 403, `nhận ${otherWallet.status}`);

  const otherPrefs = await call(`/preferences/${travelerId}`, { token: demoToken });
  check('Không đọc được sở thích người khác (403)', otherPrefs.status === 403, `nhận ${otherPrefs.status}`);

  const otherDelete = await call(`/profile/${travelerId}`, {
    method: 'DELETE', token: demoToken, body: { password: ACCOUNTS.traveler.password }
  });
  check('Không xoá được tài khoản người khác (403)', otherDelete.status === 403, `nhận ${otherDelete.status}`);

  const adminReadsOther = await call(`/profile/${travelerId}`, { token: adminToken });
  check('Admin vẫn đọc được hồ sơ bất kỳ', adminReadsOther.status === 200, `nhận ${adminReadsOther.status}`);

  console.log('\n=== 4. Khu vực quản trị ===');

  const adminNoToken = await call('/admin/analytics/overview');
  check('API admin chặn khách vãng lai (401)', adminNoToken.status === 401, `nhận ${adminNoToken.status}`);

  const adminAsUser = await call('/admin/analytics/overview', { token: demoToken });
  check('API admin chặn user thường (403)', adminAsUser.status === 403, `nhận ${adminAsUser.status}`);

  const adminOk = await call('/admin/analytics/overview', { token: adminToken });
  check('Admin truy cập được', adminOk.status === 200, `nhận ${adminOk.status}`);

  const banAsUser = await call(`/users/${travelerId}/block`, {
    method: 'POST', token: demoToken, body: { action: 'block', reason: 'test' }
  });
  check('User thường không khoá được tài khoản khác (403)', banAsUser.status === 403, `nhận ${banAsUser.status}`);

  console.log('\n=== 5. Leo thang đặc quyền khi đăng ký ===');

  const sneaky = await call('/auth/register', {
    method: 'POST',
    body: {
      username: `probe_${Date.now()}`,
      email: `probe_${Date.now()}@${TEST_EMAIL_DOMAIN}`,
      password: 'ChuoiMatKhauDaiVaAnToan123',
      fullName: 'Privilege Probe',
      role: 'admin' // cố tình nhét role vào body
    }
  });
  if (sneaky.data?.user?.id) createdUserIds.push(sneaky.data.user.id);
  check('Đăng ký thành công', sneaky.status === 201, `nhận ${sneaky.status}`);
  check('role trong body bị bỏ qua, vẫn là user', sneaky.data?.user?.role === 'user');

  const shortPw = await call('/auth/register', {
    method: 'POST',
    body: {
      username: `short_${Date.now()}`,
      email: `short_${Date.now()}@${TEST_EMAIL_DOMAIN}`,
      password: '123',
      fullName: 'Short Password'
    }
  });
  if (shortPw.data?.user?.id) createdUserIds.push(shortPw.data.user.id); // phòng khi bị nhận nhầm
  check('Mật khẩu quá ngắn bị từ chối (400)', shortPw.status === 400, `nhận ${shortPw.status}`);

  console.log('\n=== 6. Đăng ký rồi đăng nhập lại (bug cũ) ===');

  const email = `roundtrip_${Date.now()}@${TEST_EMAIL_DOMAIN}`;
  const pw = 'MatKhauKiemThu123';
  const reg = await call('/auth/register', {
    method: 'POST',
    body: { username: `rt_${Date.now()}`, email, password: pw, fullName: 'Round Trip' }
  });
  if (reg.data?.user?.id) createdUserIds.push(reg.data.user.id);
  check('Tạo tài khoản mới thành công', reg.status === 201, `nhận ${reg.status}`);

  const relogin = await call('/auth/login', { method: 'POST', body: { email, password: pw } });
  check('Tài khoản vừa đăng ký đăng nhập lại được', relogin.status === 200, `nhận ${relogin.status}`);

  const me = await call('/auth/me', { token: relogin.data?.authToken });
  check('GET /auth/me trả đúng tài khoản', me.data?.user?.email === email);
}

/**
 * Xoá đúng những tài khoản bộ test vừa tạo, nối thẳng vào DB vì API chỉ hỗ trợ
 * khoá tài khoản chứ không xoá hẳn. Chỉ xoá theo ID đã ghi lại VÀ phải thuộc domain
 * test, để không bao giờ đụng nhầm tài khoản thật.
 */
async function cleanup() {
  if (createdUserIds.length === 0) return;

  const mongoose = require('mongoose');
  const connectDB = require('../config/db');
  const User = require('../models/User');

  await connectDB();
  const result = await User.deleteMany({
    _id: { $in: createdUserIds },
    email: { $regex: `@${TEST_EMAIL_DOMAIN.replace(/\./g, '\\.')}$` }
  });
  await mongoose.disconnect();

  console.log(`\nĐã dọn ${result.deletedCount} tài khoản test.`);
}

(async () => {
  let crashed = false;
  try {
    await runTests();
  } catch (err) {
    crashed = true;
    console.error('\nBộ test gặp lỗi:', err);
  } finally {
    try {
      await cleanup();
    } catch (err) {
      console.error('Không dọn được tài khoản test:', err.message);
    }
  }

  console.log(`\n${'='.repeat(46)}`);
  console.log(`Kết quả: ${passed} đạt, ${failed} lỗi`);
  console.log('='.repeat(46));

  if (rateLimited) {
    console.log('\n⚠️  Có request bị chặn 429 (rate limit) - đây là giới hạn chống spam hoạt');
    console.log('   động đúng, không phải lỗi. Bộ đếm lưu trong RAM: khởi động lại backend');
    console.log('   rồi chạy lại test là được.');
  }

  process.exit(crashed || failed > 0 ? 1 : 0);
})();
