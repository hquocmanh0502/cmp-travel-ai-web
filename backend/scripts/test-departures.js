/**
 * Kiểm thử đặt tour theo CHUYẾN KHỞI HÀNH: giữ chỗ, trả chỗ, chặn bán quá chỗ.
 *
 * Chạy khi server đang lên (từ thư mục backend):
 *   node scripts/test-departures.js
 *
 * Test tự dọn: huỷ booking (trả chỗ) rồi xoá, số chỗ trả về như ban đầu.
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000/api';
const USER = {
  email: process.env.TEST_USER_EMAIL || 'demo@example.com',
  password: process.env.TEST_USER_PASSWORD || 'demo123'
};

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  console.log(ok ? `  ✅ ${name}` : `  ❌ ${name}${detail ? ` -> ${detail}` : ''}`);
  ok ? passed++ : failed++;
};

const api = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {})
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {})
  });
  let data = null;
  try { data = await res.json(); } catch { /* không phải JSON */ }
  return { status: res.status, data };
};

const day = (d) => new Date(d).toISOString().slice(0, 10);

(async () => {
  const login = await api('/auth/login', { method: 'POST', body: USER });
  if (login.status !== 200) {
    console.error('Không đăng nhập được:', login.data);
    process.exit(1);
  }
  const token = login.data.authToken;
  const userId = login.data.user.id;

  const tour = (await api('/tours/30')).data;
  const dep = (tour.availability || []).find(a => new Date(a.startDate) > new Date() && a.availableSlots >= 3);
  const slotsOf = async () => (await api('/tours/30')).data.availability.find(a => a._id === dep._id).availableSlots;
  const before = dep.availableSlots;
  console.log(`\nTour ${tour.name}, chuyến ${day(dep.startDate)} → ${day(dep.endDate)}, còn ${before} chỗ`);

  const body = (date, adults, children = 0) => ({
    userId, tourId: tour._id, checkinDate: date, departureDate: date,
    adults, children, rooms: { deluxe: Math.ceil((adults + children) / 2) },
    customerInfo: { fullName: 'Departure Test', email: USER.email, phone: '0900000000' }
  });

  console.log('\n=== 1. Chỉ đặt được ngày có chuyến ===');
  const noDep = new Date(new Date(dep.startDate).getTime() + 86400000);
  const r1 = await api('/bookings', { method: 'POST', token, body: body(day(noDep), 2) });
  check('Ngày không có chuyến bị từ chối (400)', r1.status === 400, `nhận ${r1.status}`);
  check('Trả kèm danh sách chuyến gợi ý', (r1.data?.upcomingDepartures || []).length > 0);

  console.log('\n=== 2. Đặt chỗ trừ đúng số ghế ===');
  const r2 = await api('/bookings', { method: 'POST', token, body: body(day(dep.startDate), 2, 1) });
  const b = r2.data?.booking;
  check('Tạo booking thành công', r2.status === 201, JSON.stringify(r2.data).slice(0, 160));
  check('Số chỗ giảm 3 (2 người lớn + 1 trẻ em)', (await slotsOf()) === before - 3);
  check('Booking gắn đúng chuyến', b && String(b.departureId) === String(dep._id));
  check('Ngày nhận phòng = ngày khởi hành', b && day(b.checkinDate) === day(dep.startDate));
  check('Ngày trả phòng = ngày cuối tour', b && day(b.checkoutDate) === day(dep.endDate));

  console.log('\n=== 3. Không bán quá chỗ ===');
  const r3 = await api('/bookings', { method: 'POST', token, body: body(day(dep.startDate), before + 5) });
  check('Đặt nhiều hơn số chỗ còn bị từ chối (409)', r3.status === 409, `nhận ${r3.status}`);
  check('Số chỗ không đổi sau khi bị từ chối', (await slotsOf()) === before - 3);

  console.log('\n=== 4. Huỷ booking trả lại chỗ ===');
  const r4 = await api(`/bookings/${b?._id}/cancel`, { method: 'POST', token, body: { reason: 'test' } });
  check('Huỷ thành công', r4.status === 200, `nhận ${r4.status}`);
  check('Số chỗ trở lại như ban đầu', (await slotsOf()) === before);
  const r5 = await api(`/bookings/${b?._id}/cancel`, { method: 'POST', token, body: { reason: 'test' } });
  check('Huỷ lần hai không trả chỗ lần nữa', r5.status === 400 && (await slotsOf()) === before);

  // Dọn booking test (đã huỷ, chỗ đã trả)
  if (b?._id) {
    await require('../config/db')();
    await require('../models/Booking').deleteOne({ _id: b._id });
    await mongoose.disconnect();
  }

  console.log(`\n${'='.repeat(46)}\nKết quả: ${passed} đạt, ${failed} lỗi\n${'='.repeat(46)}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => { console.error('Lỗi:', err); process.exit(1); });
