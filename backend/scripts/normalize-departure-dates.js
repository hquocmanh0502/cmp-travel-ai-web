/**
 * Doi moi ngay khoi hanh va ngay cua booking sang QUY UOC NGAY chung:
 * ngay theo lich dia phuong, luu dang 00:00 UTC (xem models/Tour.js).
 *
 * VAN DE TRUOC KHI CHAY:
 *   - Tour.availability.startDate luu nua dem gio Viet Nam (17:00Z hom truoc):
 *     chuyen Paris "04/12" nam trong DB la 2026-12-03T17:00Z. Ai doc theo UTC
 *     (script chatbot, server tren Vercel) se thay 03/12.
 *   - Booking.departureDate luu 08:16Z (gio script seed chay) - 0/227 booking
 *     khop voi bat ky chuyen nao, ke ca so theo gio VN.
 *
 * CACH SUA:
 *   - Gia tri da la 00:00Z: giu nguyen (da theo quy uoc).
 *   - Con lai: lay ngay theo gio Viet Nam (cach luu cu), dat ve 00:00Z cua ngay do.
 *   - availability.endDate = startDate + (durationDays - 1) ngay.
 * Chay lai bao nhieu lan cung ra cung ket qua.
 *
 * Chay (tu thu muc backend):
 *   node scripts/normalize-departure-dates.js --dry-run
 *   node scripts/normalize-departure-dates.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const dryRun = process.argv.includes('--dry-run');
const DAY_MS = 24 * 60 * 60 * 1000;

const isMidnightUtc = (d) => new Date(d).toISOString().slice(11) === '00:00:00.000Z';
const vnDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(d));

/** Ngay theo lich cua mot gia tri cu hoac moi -> Date 00:00Z. */
function normalize(d) {
  if (!d) return d;
  const day = isMidnightUtc(d) ? new Date(d).toISOString().slice(0, 10) : vnDay(d);
  return new Date(`${day}T00:00:00.000Z`);
}

const same = (a, b) => (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);

(async () => {
  await connectDB();
  const db = mongoose.connection.db;

  // ---------------- lich khoi hanh ----------------
  const tours = await db.collection('tours').find({}, { projection: { name: 1, durationDays: 1, availability: 1 } }).toArray();
  let depChanged = 0, depTotal = 0;
  const example = [];
  for (const t of tours) {
    let changed = false;
    const availability = (t.availability || []).map(a => {
      depTotal++;
      const startDate = normalize(a.startDate);
      const endDate = new Date(startDate.getTime() + ((t.durationDays || 1) - 1) * DAY_MS);
      if (!same(startDate, a.startDate) || !same(endDate, a.endDate)) {
        changed = true;
        depChanged++;
        if (example.length < 3) {
          example.push(`${t.name}: ${new Date(a.startDate).toISOString()} -> ${startDate.toISOString().slice(0, 10)}`);
        }
      }
      return { ...a, startDate, endDate };
    });
    if (changed && !dryRun) {
      await db.collection('tours').updateOne({ _id: t._id }, { $set: { availability } });
    }
  }

  // ---------------- booking ----------------
  const bookings = await db.collection('bookings')
    .find({}, { projection: { checkinDate: 1, checkoutDate: 1, departureDate: 1 } }).toArray();
  let bkChanged = 0;
  for (const b of bookings) {
    const set = {};
    for (const f of ['checkinDate', 'checkoutDate', 'departureDate']) {
      if (b[f] && !isMidnightUtc(b[f])) set[f] = normalize(b[f]);
    }
    if (Object.keys(set).length) {
      bkChanged++;
      if (!dryRun) await db.collection('bookings').updateOne({ _id: b._id }, { $set: set });
    }
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Chuyen khoi hanh: doi ${depChanged}/${depTotal}. Booking: doi ${bkChanged}/${bookings.length}.`);
  example.forEach(e => console.log('  ' + e));
  await mongoose.disconnect();
})().catch(async err => {
  console.error('That bai:', err);
  await mongoose.disconnect();
  process.exit(1);
});
