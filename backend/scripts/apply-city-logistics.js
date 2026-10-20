/**
 * Ghi hau can tu config/city-logistics.js vao DB:
 *   - Tour.location.timezone, Tour.logistics (san bay, ga/ben), Tour.operations
 *     (khung gio don/tien, gap doan, moc den muon nhat)
 *   - Hotel.details.checkInTime / checkOutTime cho khach san CHUA co du lieu,
 *     dung gia tri pho bien nhat trong DB va gan co checkTimesEstimated = true
 *     de phan biet voi du lieu that.
 *
 * Tour nao khong co trong bang -> bao loi va dung lai, khong ghi mot phan
 * (thieu mot thanh pho la SmartTour tinh sai gio cho chinh tour do).
 *
 * Chay lai duoc: luon ghi de bang gia tri trong config.
 *
 * Chay (tu thu muc backend):
 *   node scripts/apply-city-logistics.js --dry-run
 *   node scripts/apply-city-logistics.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { CITY_LOGISTICS, DEFAULT_OPERATIONS, DEFAULT_CHECK_TIMES } = require('../config/city-logistics');

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await connectDB();
  const db = mongoose.connection.db;

  const tours = await db.collection('tours').find({}, { projection: { name: 1 } }).toArray();
  const missing = tours.filter(t => !CITY_LOGISTICS[t.name]).map(t => t.name);
  if (missing.length) throw new Error(`config/city-logistics.js thieu: ${missing.join(', ')}`);

  for (const t of tours) {
    const c = CITY_LOGISTICS[t.name];
    if (!dryRun) {
      await db.collection('tours').updateOne({ _id: t._id }, {
        $set: {
          'location.timezone': c.timezone,
          logistics: { airport: c.airport, ground: c.ground },
          operations: DEFAULT_OPERATIONS
        }
      });
    }
  }

  // Khach san thieu gio nhan/tra phong
  const noTimes = await db.collection('hotels').find({
    $or: [{ 'details.checkInTime': { $in: [null, ''] } }, { 'details.checkOutTime': { $in: [null, ''] } }]
  }, { projection: { name: 1, 'details.checkInTime': 1, 'details.checkOutTime': 1 } }).toArray();

  for (const h of noTimes) {
    if (!dryRun) {
      await db.collection('hotels').updateOne({ _id: h._id }, {
        $set: {
          'details.checkInTime': h.details?.checkInTime || DEFAULT_CHECK_TIMES.checkInTime,
          'details.checkOutTime': h.details?.checkOutTime || DEFAULT_CHECK_TIMES.checkOutTime,
          'details.checkTimesEstimated': true
        }
      });
    }
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Ghi hau can cho ${tours.length} tour. ` +
    `Bo sung gio nhan/tra phong (uoc tinh) cho ${noTimes.length} khach san: ` +
    noTimes.slice(0, 6).map(h => h.name).join(', ') + (noTimes.length > 6 ? '...' : ''));
  await mongoose.disconnect();
})().catch(async err => {
  console.error('That bai:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
