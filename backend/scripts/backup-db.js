/**
 * Sao luu cac collection ra file, dung EJSON de GIU NGUYEN kieu du lieu.
 *
 * Vi sao khong dung JSON.stringify thuong:
 *   ObjectId va Date se bi bien thanh chuoi, nen khi khoi phuc thi
 *   Booking.tourId khong con tro dung vao Tour._id nua - toan bo 1.954 tham
 *   chieu giua cac collection se vo. EJSON (Extended JSON cua MongoDB) ghi kem
 *   kieu: {"$oid":"..."} va {"$date":"..."}.
 *
 * Vi sao khong dung mongodump:
 *   May nay khong co MongoDB Database Tools (da kiem tra).
 *
 * LUU Y: scripts/restore-tours.js (da co san trong repo) KHONG phai backup -
 * no nap lai tu data/data.json goc, tuc xoa sach phan lam giau. Dung lan.
 * File can dung de khoi phuc la scripts/restore-db.js.
 *
 * Chay (tu thu muc backend):
 *   node scripts/backup-db.js                  # sao luu tat ca collection
 *   node scripts/backup-db.js --only tours     # chi mot vai collection
 *   node scripts/backup-db.js --label truoc-khi-nhap-poi
 *
 * Ket qua nam trong  backend/backups/<thoi-diem>[-<label>]/
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const connectDB = require('../config/db');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const onlyArg = getArg('--only');
const label = getArg('--label');
const only = onlyArg ? onlyArg.split(',').map(s => s.trim()) : null;

const BACKUP_ROOT = path.join(__dirname, '..', 'backups');

/** Ten thu muc theo thoi diem: 2026-10-09T14-32-05 */
function stamp() {
  return new Date().toISOString().replace(/\.\d+Z$/, '').replace(/:/g, '-');
}

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

(async () => {
  await connectDB();
  const db = mongoose.connection.db;

  const all = (await db.listCollections().toArray()).map(c => c.name).sort();
  const targets = only ? all.filter(n => only.includes(n)) : all;

  if (only) {
    const missing = only.filter(n => !all.includes(n));
    if (missing.length) {
      console.error('Khong tim thay collection:', missing.join(', '));
      process.exit(1);
    }
  }

  const dir = path.join(BACKUP_ROOT, stamp() + (label ? `-${label}` : ''));
  fs.mkdirSync(dir, { recursive: true });

  console.log(`Database : ${db.databaseName}`);
  console.log(`Luu vao  : ${dir}\n`);

  const manifest = {
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    label: label || null,
    format: 'EJSON (relaxed=false, giu nguyen ObjectId va Date)',
    collections: {}
  };

  let totalDocs = 0;
  let totalBytes = 0;

  for (const name of targets) {
    const docs = await db.collection(name).find({}).toArray();

    // relaxed: false -> ObjectId thanh {"$oid":...}, Date thanh {"$date":...}
    const text = EJSON.stringify(docs, { relaxed: false });
    const file = path.join(dir, `${name}.json`);
    fs.writeFileSync(file, text, 'utf8');

    const bytes = Buffer.byteLength(text, 'utf8');
    manifest.collections[name] = {
      count: docs.length,
      bytes,
      sha256: sha256(text)
    };

    totalDocs += docs.length;
    totalBytes += bytes;

    const kb = (bytes / 1024).toFixed(0);
    console.log(`  ${name.padEnd(26)} ${String(docs.length).padStart(5)} ban ghi  ${kb.padStart(7)} KB`);
  }

  // Luu ca danh sach index, vi khoi phuc du lieu ma thieu index thi truy van
  // cua SmartTour se cham han (vi du durationDays, themes, 2dsphere).
  const indexes = {};
  for (const name of targets) {
    try {
      indexes[name] = await db.collection(name).indexes();
    } catch { /* collection rong thi bo qua */ }
  }
  fs.writeFileSync(path.join(dir, '_indexes.json'),
    JSON.stringify(indexes, null, 2), 'utf8');

  manifest.totalDocs = totalDocs;
  manifest.totalBytes = totalBytes;
  fs.writeFileSync(path.join(dir, '_manifest.json'),
    JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\nTong: ${totalDocs} ban ghi, ${(totalBytes / 1024 / 1024).toFixed(2)} MB, ${targets.length} collection`);
  console.log(`Da ghi _manifest.json (co sha256 tung file) va _indexes.json`);
  console.log(`\nKiem tra lai  : node scripts/restore-db.js --from "${path.basename(dir)}" --verify`);
  console.log(`Khoi phuc     : node scripts/restore-db.js --from "${path.basename(dir)}" --yes`);

  await mongoose.disconnect();
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
