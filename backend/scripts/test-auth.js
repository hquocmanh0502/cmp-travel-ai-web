/**
 * Kiểm thử tầng xác thực qua HTTP thật.
 *
 * Chạy khi server đang lên:  node scripts/test-auth.js
 */

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000/api';

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
  return { status: res.status, data };
}

(async () => {
  console.log('\n=== 1. Đăng nhập ===');

  const wrongPw = await call('/auth/login', {
    method: 'POST',
    body: { email: 'demo@example.com', password: 'sai-mat-khau' }
  });
  check('Sai mật khẩu bị từ chối (401)', wrongPw.status === 401, `nhận ${wrongPw.status}`);

  const noUser = await call('/auth/login', {
    method: 'POST',
    body: { email: 'khong-ton-tai@example.com', password: 'gi-do-123' }
  });
  check('Email không tồn tại cũng trả 401', noUser.status === 401, `nhận ${noUser.status}`);
  check(
    'Không lộ email nào đã đăng ký (thông báo lỗi giống nhau)',
    wrongPw.data?.error === noUser.data?.error
  );

  const demo = await call('/auth/login', {
    method: 'POST',
    body: { email: 'demo@example.com', password: 'demo123' }
  });
  check('Mật khẩu cũ vẫn đăng nhập được sau migration', demo.status === 200, `nhận ${demo.status}`);
  check('Trả về JWT 3 phần', (demo.data?.authToken || '').split('.').length === 3);
  check('Response không chứa password', !JSON.stringify(demo.data || {}).includes('password'));

  const demoToken = demo.data?.authToken;
  const demoId = demo.data?.user?.id;
  check('User thường có role = user', demo.data?.user?.role === 'user');

  const admin = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@cmptravel.com', password: 'admin123' }
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
    body: { email: 'traveler@example.com', password: 'travel123' }
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
    method: 'DELETE', token: demoToken, body: { password: 'travel123' }
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
      email: `probe_${Date.now()}@example.com`,
      password: 'ChuoiMatKhauDaiVaAnToan123',
      fullName: 'Privilege Probe',
      role: 'admin' // cố tình nhét role vào body
    }
  });
  check('Đăng ký thành công', sneaky.status === 201, `nhận ${sneaky.status}`);
  check('role trong body bị bỏ qua, vẫn là user', sneaky.data?.user?.role === 'user');

  const shortPw = await call('/auth/register', {
    method: 'POST',
    body: {
      username: `short_${Date.now()}`,
      email: `short_${Date.now()}@example.com`,
      password: '123',
      fullName: 'Short Password'
    }
  });
  check('Mật khẩu quá ngắn bị từ chối (400)', shortPw.status === 400, `nhận ${shortPw.status}`);

  console.log('\n=== 6. Đăng ký rồi đăng nhập lại (bug cũ) ===');

  const email = `roundtrip_${Date.now()}@example.com`;
  const pw = 'MatKhauKiemThu123';
  const reg = await call('/auth/register', {
    method: 'POST',
    body: { username: `rt_${Date.now()}`, email, password: pw, fullName: 'Round Trip' }
  });
  check('Tạo tài khoản mới thành công', reg.status === 201, `nhận ${reg.status}`);

  const relogin = await call('/auth/login', { method: 'POST', body: { email, password: pw } });
  check('Tài khoản vừa đăng ký đăng nhập lại được', relogin.status === 200, `nhận ${relogin.status}`);

  const me = await call('/auth/me', { token: relogin.data?.authToken });
  check('GET /auth/me trả đúng tài khoản', me.data?.user?.email === email);

  console.log(`\n${'='.repeat(46)}`);
  console.log(`Kết quả: ${passed} đạt, ${failed} lỗi`);
  console.log('='.repeat(46));

  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('Bộ test gặp lỗi:', err);
  process.exit(1);
});
