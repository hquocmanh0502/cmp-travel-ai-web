/**
 * Kiểm thử mô hình giá: giá tour đã gồm khách sạn tiêu chuẩn, chọn hạng cao hơn
 * thì trả phụ phí, và server luôn tự tính lại thay vì tin số client gửi lên.
 *
 * Chạy khi server đang lên (từ thư mục backend):
 *   node scripts/test-pricing.js
 */

require('dotenv').config({ quiet: true });

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

(async () => {
  const login = await api('/auth/login', { method: 'POST', body: USER });
  if (login.status !== 200) {
    console.error('Không đăng nhập được:', login.data);
    process.exit(1);
  }
  const token = login.data.authToken;
  const userId = login.data.user.id;

  const tourRes = await api('/tours/30');
  const tour = tourRes.data;
  const tiers = tour.hotelTiers || [];
  const standard = tiers.find(t => t.surcharge === 0) || tiers[0];
  const top = tiers.reduce((m, t) => (t.surcharge > m.surcharge ? t : m), tiers[0]);

  console.log(`\nTour: ${tour.name} — $${tour.pricing.adult}/người lớn, ${tour.duration}`);
  tiers.forEach(t => console.log(`   ${t.level}★ ${t.hotelName} +$${t.surcharge}`));

  console.log('\n=== 1. Báo giá theo hạng khách sạn ===');
  const qStd = (await api(`/tours/${tour._id}/quote?adults=2&hotelId=${standard.hotelId}`)).data;
  const qTop = (await api(`/tours/${tour._id}/quote?adults=2&hotelId=${top.hotelId}`)).data;

  check('Hạng tiêu chuẩn không phụ phí', qStd.accommodationCost === 0, `nhận ${qStd.accommodationCost}`);
  check('Giá tour = giá người lớn × 2', qStd.tourBaseCost === tour.pricing.adult * 2, `nhận ${qStd.tourBaseCost}`);
  check('Hạng cao nhất có phụ phí', qTop.accommodationCost === top.surcharge, `nhận ${qTop.accommodationCost}`);
  check('Tổng = tour + phụ phí', qTop.subtotal === qTop.tourBaseCost + qTop.accommodationCost);

  console.log('\n=== 2. Phụ phí tính theo số phòng ===');
  const q4 = (await api(`/tours/${tour._id}/quote?adults=4&hotelId=${top.hotelId}`)).data;
  check('4 khách = 2 phòng -> phụ phí gấp đôi', q4.accommodationCost === top.surcharge * 2, `nhận ${q4.accommodationCost}`);

  console.log('\n=== 3. Giá theo ngày khởi hành ===');
  // Ngày theo lịch: availability lưu 00:00 UTC của ngày địa phương (xem models/Tour.js)
  const vnDay = (d) => new Date(d).toISOString().slice(0, 10);
  const future = (tour.availability || []).filter(a => new Date(a.startDate) > new Date());
  const seasonal = future.find(a => a.price !== tour.pricing.adult) || future[0];
  const qDep = (await api(`/tours/${tour._id}/quote?adults=2&departureDate=${vnDay(seasonal.startDate)}`)).data;
  check(`Giá người lớn ngày ${vnDay(seasonal.startDate)} = giá trong lịch ($${seasonal.price})`,
    qDep.adultPrice === seasonal.price, `nhận ${qDep.adultPrice}`);
  check('Chuyến trong lịch được nhận ra', !!qDep.scheduledDeparture);
  const cheapest = future.reduce((m, a) => (a.price < m.price ? a : m), future[0]);
  const priciest = future.reduce((m, a) => (a.price > m.price ? a : m), future[0]);
  const qLow = (await api(`/tours/${tour._id}/quote?adults=1&departureDate=${vnDay(cheapest.startDate)}`)).data;
  const qHigh = (await api(`/tours/${tour._id}/quote?adults=1&departureDate=${vnDay(priciest.startDate)}`)).data;
  check('Mùa thấp điểm rẻ hơn chính mùa', qLow.adultPrice < qHigh.adultPrice,
    `${qLow.adultPrice} vs ${qHigh.adultPrice}`);

  console.log('\n=== 4. Server không tin giá client gửi ===');
  // Đặt vào chuyến thật (tour đoàn chỉ chạy theo lịch khởi hành)
  const depDay = vnDay(seasonal.startDate);
  const booking = await api('/bookings', {
    method: 'POST', token,
    body: {
      userId, tourId: tour._id, hotelId: top.hotelId,
      checkinDate: depDay, departureDate: depDay, // chuyến thật trong lịch
      adults: 2, children: 0,
      rooms: { deluxe: 1 },
      customerInfo: { fullName: 'Pricing Test', email: USER.email, phone: '0900000000' },
      // Client cố tình gửi giá 1 USD
      tourBaseCost: 1, accommodationCost: 0, totalAmount: 1
    }
  });

  if (booking.status >= 400) {
    check('Tạo booking thành công', false, JSON.stringify(booking.data).slice(0, 160));
  } else {
    const b = booking.data.data || booking.data.booking || booking.data;
    check('Không nhận giá 1 USD từ client', b.totalAmount > 1000, `nhận ${b.totalAmount}`);
    // Giá đúng là giá theo mùa của chuyến đã đặt, khớp với báo giá cùng ngày
    const qNov = (await api(`/tours/${tour._id}/quote?adults=2&departureDate=${depDay}`)).data;
    check('tourBaseCost do server tính theo ngày khởi hành', b.tourBaseCost === qNov.tourBaseCost,
      `nhận ${b.tourBaseCost}, báo giá ${qNov.tourBaseCost}`);
    check('accommodationCost = phụ phí hạng đã chọn', b.accommodationCost === top.surcharge, `nhận ${b.accommodationCost}`);
    check('Lưu đúng hạng khách sạn', b.hotelTierLevel === top.level, `nhận ${b.hotelTierLevel}`);

    // Dọn booking test
    const Booking = require('../models/Booking');
    const mongoose = require('mongoose');
    await require('../config/db')();
    // Trả lại chỗ đã giữ trước khi xoá, nếu không mỗi lần chạy test mất 2 chỗ
    await require('../services/departureService').releaseForBooking(await Booking.findById(b._id));
    await Booking.deleteOne({ _id: b._id });
    await mongoose.disconnect();
    console.log('\n  (đã xoá booking test)');
  }

  console.log(`\n${'='.repeat(46)}\nKết quả: ${passed} đạt, ${failed} lỗi\n${'='.repeat(46)}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => { console.error('Lỗi:', err); process.exit(1); });
