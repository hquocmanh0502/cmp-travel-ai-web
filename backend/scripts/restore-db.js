/**
 * Khoi phuc du lieu tu mot ban sao luu do scripts/backup-db.js tao ra.
 *
 * Ba che do:
 *   --verify   KHONG ghi gi. Doc ban sao luu, doi chieu sha256, so sanh voi DB
 *              dang chay va bao cheng lech. Day la cach KIEM TRA ban backup
 *              that su dung duoc, vi mot ban sao luu chua thu khoi phuc thi
 *              chua phai ban sao luu.
 *   --dry-run  In ra se lam gi, khong ghi.
 *   --yes      Khoi phuc that: XOA collection dich roi nap lai tu file.
 *
 * Giu nguyen _id, nen moi tham chieu giua cac collection (Booking.tourId,
 * Comment.tourId, User.behavior.*, Tour.transportLegs.toTourId...) van dung.
 *
 * Chay (tu thu muc backend):
 *   node scripts/restore-db.js --list
 *   node scripts/restore-db.js --from <ten-thu-muc> --verify
 *   node scripts/restore-db.js --from <ten-thu-muc> --only tours --dry-run
 *   node scripts/restore-db.js --from <ten-thu-muc> --yes
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const connectDB = require('../config/db');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const BACKUP_ROOT = path.join(__dirname, '..', 'backups');
const from = getArg('--from');
const onlyArg = getArg('--only');
const only = onlyArg ? onlyArg.split(',').map(s => s.trim()) : null;
const verify = has('--verify');
const dryRun = has('--dry-run');
const confirmed = has('--yes');

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

function listBackups() {
  if (!fs.existsSync(BACKUP_ROOT)) return [];
  return fs.readdirSync(BACKUP_ROOT)
    .filter(d => fs.statSync(path.join(BACKUP_ROOT, d)).isDirectory())
    .sort()
    .reverse();
}

(async () => {
  if (has('--list') || !from) {
    const list = listBackups();
    console.log(list.length ? 'Cac ban sao luu dang co (moi nhat truoc):' : 'Chua co ban sao luu nao.');
    for (const d of list) {
      const mf = path.join(BACKUP_ROOT, d, '_manifest.json');
      let info = '';
      if (fs.existsSync(mf)) {
        const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
        info = `  ${m.totalDocs} ban ghi, ${(m.totalBytes / 1024 / 1024).toFixed(2)} MB`;
      }
      console.log(`  ${d}${info}`);
    }
    if (!from) {
      console.log('\nDung --from <ten-thu-muc> de chon mot ban.');
      process.exit(0);
    }
  }

  const dir = path.isAbsolute(from) ? from : path.join(BACKUP_ROOT, from);
  if (!fs.existsSync(dir)) {
    console.error('Khong tim thay:', dir);
    process.exit(1);
  }

  const manifestPath = path.join(dir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Thieu _manifest.json - thu muc nay khong phai ban sao luu hop le.');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const names = Object.keys(manifest.collections)
    .filter(n => !only || only.includes(n));

  console.log(`Ban sao luu : ${path.basename(dir)}`);
  console.log(`Tao luc     : ${manifest.createdAt}`);
  console.log(`Database    : ${manifest.database}`);
  if (manifest.label) console.log(`Ghi chu     : ${manifest.label}`);
  console.log('');

  // ---------------- Buoc 1: doi chieu sha256 cua tung file ----------------
  let corrupt = 0;
  const parsed = {};

  for (const name of names) {
    const file = path.join(dir, `${name}.json`);
    if (!fs.existsSync(file)) {
      console.log(`  ${name.padEnd(26)} THIEU FILE`);
      corrupt++;
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    const expected = manifest.collections[name].sha256;
    const actual = sha256(text);

    if (expected !== actual) {
      console.log(`  ${name.padEnd(26)} SHA256 KHONG KHOP - file da bi sua`);
      corrupt++;
      continue;
    }

    try {
      parsed[name] = EJSON.parse(text, { relaxed: false });
    } catch (err) {
      console.log(`  ${name.padEnd(26)} KHONG DOC DUOC EJSON: ${err.message}`);
      corrupt++;
      continue;
    }

    const expCount = manifest.collections[name].count;
    const gotCount = parsed[name].length;
    const ok = expCount === gotCount;
    console.log(`  ${name.padEnd(26)} ${String(gotCount).padStart(5)} ban ghi  ${ok ? 'OK' : `LECH (manifest ghi ${expCount})`}`);
    if (!ok) corrupt++;
  }

  if (corrupt) {
    console.error(`\n${corrupt} van de. Khong khoi phuc.`);
    process.exit(1);
  }
  console.log('\nMoi file deu nguyen ven (sha256 khop, EJSON doc duoc, so ban ghi dung).');

  // ---------------- Buoc 2: kiem tra kieu du lieu con nguyen ----------------
  // Day la diem quan trong nhat: neu ObjectId bi bien thanh chuoi thi moi tham
  // chieu giua cac collection se vo khi khoi phuc.
  const typeProblems = [];
  for (const name of names) {
    for (const doc of parsed[name].slice(0, 200)) {
      if (doc._id !== undefined && !(doc._id instanceof mongoose.Types.ObjectId)) {
        typeProblems.push(`${name}._id khong phai ObjectId (${typeof doc._id})`);
        break;
      }
    }
  }
  if (parsed.tours) {
    const t = parsed.tours[0];
    if (t) {
      if (!(t.createdAt instanceof Date)) typeProblems.push('tours.createdAt khong phai Date');
      const leg = (t.transportLegs || [])[0];
      if (leg && !(leg.toTourId instanceof mongoose.Types.ObjectId)) {
        typeProblems.push('tours.transportLegs.toTourId khong phai ObjectId');
      }
      const av = (t.availability || [])[0];
      if (av && !(av.startDate instanceof Date)) {
        typeProblems.push('tours.availability.startDate khong phai Date');
      }
    }
  }
  if (parsed.bookings && parsed.bookings[0] && !(parsed.bookings[0].tourId instanceof mongoose.Types.ObjectId)) {
    typeProblems.push('bookings.tourId khong phai ObjectId');
  }

  if (typeProblems.length) {
    console.error('\nKIEU DU LIEU SAI:');
    typeProblems.forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  console.log('Kieu du lieu con nguyen: _id la ObjectId, ngay la Date, tham chieu la ObjectId.');

  // ---------------- Buoc 3: doi chieu voi DB dang chay ----------------
  await connectDB();
  const db = mongoose.connection.db;

  console.log('\n--- Doi chieu ban sao luu voi DB dang chay ---');
  const live = {};
  for (const name of names) {
    const count = await db.collection(name).countDocuments();
    live[name] = count;
    const backupCount = parsed[name].length;
    const diff = count - backupCount;
    const note = diff === 0 ? 'giong nhau' : (diff > 0 ? `DB nhieu hon ${diff}` : `DB it hon ${-diff}`);
    console.log(`  ${name.padEnd(26)} backup ${String(backupCount).padStart(5)} | DB ${String(count).padStart(5)}  ${note}`);
  }

  // Kiem tra tham chieu trong ban sao luu co con tro dung nhau khong
  if (parsed.tours && parsed.bookings) {
    const tourIds = new Set(parsed.tours.map(t => String(t._id)));
    const orphan = parsed.bookings.filter(b => b.tourId && !tourIds.has(String(b.tourId))).length;
    console.log(`\n  bookings tro vao tour khong ton tai trong ban sao luu: ${orphan}`);
  }

  if (verify) {
    console.log('\n--verify: ban sao luu doc duoc, kieu du lieu dung, khong ghi gi vao DB.');
    await mongoose.disconnect();
    return;
  }

  if (!confirmed) {
    console.log('\nChua khoi phuc. Them --yes de thuc hien.');
    console.log('CANH BAO: khoi phuc se XOA cac collection tren roi nap lai tu ban sao luu.');
    await mongoose.disconnect();
    return;
  }

  // ---------------- Buoc 4: khoi phuc that ----------------
  console.log('\n--- Dang khoi phuc ---');
  for (const name of names) {
    const docs = parsed[name];
    if (dryRun) {
      console.log(`  (dry-run) ${name}: se xoa ${live[name]} va nap ${docs.length}`);
      continue;
    }
    await db.collection(name).deleteMany({});
    if (docs.length) {
      // chia lo de khong vuot gioi han kich thuoc mot lenh
      for (let i = 0; i < docs.length; i += 500) {
        await db.collection(name).insertMany(docs.slice(i, i + 500), { ordered: false });
      }
    }
    const now = await db.collection(name).countDocuments();
    console.log(`  ${name.padEnd(26)} nap ${String(now).padStart(5)} ban ghi  ${now === docs.length ? 'OK' : 'LECH'}`);
  }

  // Nap lai index (truy van cua SmartTour phu thuoc durationDays, themes, 2dsphere)
  const idxPath = path.join(dir, '_indexes.json');
  if (!dryRun && fs.existsSync(idxPath)) {
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    let created = 0;
    for (const name of names) {
      for (const spec of idx[name] || []) {
        if (spec.name === '_id_') continue;
        const { key, name: idxName, v, ns, ...opts } = spec;
        try {
          await db.collection(name).createIndex(key, { name: idxName, ...opts });
          created++;
        } catch { /* index da co thi bo qua */ }
      }
    }
    console.log(`\nDa tao lai ${created} index.`);
  }

  console.log(dryRun ? '\nDRY-RUN: chua ghi gi.' : '\nKhoi phuc xong.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
