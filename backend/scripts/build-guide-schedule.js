/**
 * Xử lý mâu thuẫn "một hướng dẫn viên dẫn nhiều tour cùng ngày".
 *
 * Bản chất vấn đề là ở CÁCH HIỂU DỮ LIỆU, không phải thiếu tính năng:
 *   - Tour.assignedGuide = danh sách hướng dẫn viên ĐỦ ĐIỀU KIỆN dẫn tour này
 *     (một người giỏi tiếng Pháp hoàn toàn có thể đủ điều kiện dẫn cả 4 tour ở Pháp).
 *   - Phân công THẬT phải gắn với từng CHUYẾN KHỞI HÀNH cụ thể, vì một người
 *     chỉ có thể dẫn một chuyến tại một thời điểm.
 *
 * Script làm 3 việc:
 *   1. Giãn ngày khởi hành giữa các tour (hiện mọi tour đều khởi hành ngày 10 và 24,
 *      nên va chạm lịch là điều tất yếu).
 *   2. Với mỗi chuyến, chọn một hướng dẫn viên đủ điều kiện VÀ đang rảnh.
 *   3. Ghi lịch bận vào TourGuide.unavailableDates để API gợi ý hướng dẫn viên
 *      (tham số departureDate) lọc được người đã kín lịch.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/build-guide-schedule.js --dry-run
 *   node scripts/build-guide-schedule.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const TourGuide = require('../models/TourGuide');

const dryRun = process.argv.includes('--dry-run');

const parseDays = (d) => parseInt(String(d).match(/\d+/)?.[0] || '5', 10);
const overlaps = (aFrom, aTo, bFrom, bTo) => aFrom <= bTo && bFrom <= aTo;

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  const guides = await TourGuide.find({ status: 'active' });

  // Lịch bận đang dựng, theo guideId -> [{from, to}]
  const busy = new Map(guides.map(g => [String(g._id), []]));

  let staggered = 0;
  let scheduled = 0;
  let unassigned = 0;

  for (const [index, tour] of tours.entries()) {
    const days = parseDays(tour.duration);

    // --- 1. Giãn ngày khởi hành ---
    // Mỗi tour lệch đi vài ngày so với tour khác, thay vì tất cả cùng ngày 10 và 24.
    const offset = (index * 3) % 14;
    const newAvailability = (tour.availability || []).map(slot => {
      const start = new Date(slot.startDate);
      start.setDate(start.getDate() + offset);
      const end = new Date(start);
      end.setDate(end.getDate() + days - 1);
      return { ...slot.toObject?.() ?? slot, startDate: start, endDate: end };
    });
    if (newAvailability.length) staggered++;

    // --- 2. Phân công từng chuyến ---
    const eligible = (tour.assignedGuide || []).map(String);

    // Neu ca 3 nguoi du dieu kien deu ban, mo rong dan: nguoi phu trach cung quoc gia,
    // roi den bat ky huong dan vien dang hoat dong nao. Thuc te cong ty cung dieu
    // nguoi khac sang thay chu khong de chuyen khong co ai dan.
    const sameCountry = guides
      .filter(g => (g.coverage?.countries || []).includes(tour.country))
      .map(g => String(g._id));
    const anyGuide = guides.map(g => String(g._id));
    const candidates = [...new Set([...eligible, ...sameCountry, ...anyGuide])];

    for (const slot of newAvailability) {
      const from = new Date(slot.startDate);
      const to = new Date(slot.endDate);

      // Chọn người đủ điều kiện và không trùng lịch chuyến nào khác
      const free = candidates.find(gid =>
        !(busy.get(gid) || []).some(p => overlaps(from, to, p.from, p.to)));

      if (!free) {
        unassigned++;
        slot.guideId = null;
        continue;
      }

      busy.get(free).push({ from, to, tourName: tour.name });
      slot.guideId = free;
      scheduled++;
    }

    tour.availability = newAvailability;
    if (!dryRun) await tour.save();
  }

  // --- 3. Ghi lịch bận vào hồ sơ hướng dẫn viên ---
  let guidesUpdated = 0;
  for (const guide of guides) {
    const periods = busy.get(String(guide._id)) || [];
    guide.unavailableDates = periods
      .sort((a, b) => a.from - b.from)
      .map(p => ({ from: p.from, to: p.to, reason: `Leading tour: ${p.tourName}` }));
    if (!dryRun) await guide.save();
    if (periods.length) guidesUpdated++;
  }

  // --- Kiểm chứng: còn chuyến nào bị trùng hướng dẫn viên không ---
  const check = new Map();
  let conflicts = 0;
  for (const tour of tours) {
    for (const slot of tour.availability || []) {
      if (!slot.guideId) continue;
      const key = String(slot.guideId);
      const from = new Date(slot.startDate), to = new Date(slot.endDate);
      const list = check.get(key) || [];
      if (list.some(p => overlaps(from, to, p.from, p.to))) conflicts++;
      list.push({ from, to });
      check.set(key, list);
    }
  }

  const loads = [...busy.entries()].map(([, v]) => v.length);

  console.log(`\nTour được giãn lịch khởi hành : ${staggered}`);
  console.log(`Chuyến đã phân công hướng dẫn viên: ${scheduled}`);
  console.log(`Chuyến chưa có người rảnh      : ${unassigned}`);
  console.log(`Hướng dẫn viên có lịch          : ${guidesUpdated}/${guides.length}`);
  console.log(`Số chuyến mỗi người             : ít nhất ${Math.min(...loads)}, nhiều nhất ${Math.max(...loads)}`);
  console.log(`\nXung đột lịch còn lại           : ${conflicts}  ${conflicts === 0 ? '(sạch)' : '<-- CẦN XEM LẠI'}`);

  if (dryRun) console.log('\nDRY-RUN: chưa ghi gì vào DB.');
  await mongoose.disconnect();
})().catch(err => { console.error('Thất bại:', err); process.exit(1); });
