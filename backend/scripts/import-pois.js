/**
 * Nap diem tham quan tu data/pois/wikidata-pois.json vao collection `pois`,
 * kem phan bo sung data/pois/osm-pois.json (neu co) xep SAU diem Wikidata.
 *
 * Chay lai bao nhieu lan cung duoc (idempotent):
 *   - upsert theo (tourId, wikidataId) - hoac (tourId, osmId) voi diem OSM
 *     khong co the wikidata - nen khong tao trung
 *   - diem cua tour khong con trong file thi bi xoa, de DB luon khop dung file
 *
 * Chi ghi vao collection `pois`, KHONG dung den `tours`.
 *
 * Nen sao luu truoc:  node scripts/backup-db.js --label truoc-khi-nhap-poi
 *
 * Chay (tu thu muc backend):
 *   node scripts/import-pois.js --dry-run
 *   node scripts/import-pois.js
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const Poi = require('../models/Poi');
const { categoryByKey } = require('../config/poi-categories');

const dryRun = process.argv.includes('--dry-run');
const IN_FILE = path.join(__dirname, '..', '..', 'data', 'pois', 'wikidata-pois.json');
const OSM_FILE = path.join(__dirname, '..', '..', 'data', 'pois', 'osm-pois.json');

(async () => {
  const data = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  const osm = fs.existsSync(OSM_FILE) ? JSON.parse(fs.readFileSync(OSM_FILE, 'utf8')) : { cities: [] };
  const osmByCity = Object.fromEntries(osm.cities.map(c => [c.city, c.pois]));
  await connectDB();

  const tours = await Tour.find({}, { name: 1 }).lean();
  const tourByName = Object.fromEntries(tours.map(t => [t.name, t]));
  const missing = tours.filter(t => !data.cities.some(c => c.city === t.name));
  if (missing.length) {
    // Khong nap mot phan: thieu thanh pho nao thi du lieu lai lech giua cac tour
    throw new Error(`File thieu POI cho: ${missing.map(t => t.name).join(', ')}. Chay lai fetch-wikidata-pois.js`);
  }

  // Dong bo index TRUOC khi ghi: index unique cu (tourId, wikidataId) khong co
  // partialFilterExpression, se coi 2 diem OSM khong co wikidata (null) la trung.
  if (!dryRun) await Poi.syncIndexes();

  let upserted = 0, removed = 0;
  for (const city of data.cities) {
    // Khop theo ten thay vi tourId trong file, phong khi DB duoc khoi phuc lai
    const tour = tourByName[city.city];
    if (!tour) {
      console.warn(`Bo qua ${city.city}: khong con tour nay trong DB`);
      continue;
    }

    // Diem Wikidata truoc (theo sitelinks), diem OSM sau -> rank van la do noi tieng
    const all = [
      ...city.pois.map(p => ({ ...p, fromOsm: false })),
      ...(osmByCity[city.city] || []).map(p => ({ ...p, sitelinks: 0, unesco: false, image: null, wikivoyageUrl: null, fromOsm: true }))
    ];
    const ops = all.map((p, i) => {
      const cat = categoryByKey[p.category];
      const source = p.fromOsm
        ? { name: 'OpenStreetMap', license: 'ODbL 1.0', fetchedAt: new Date(osm.fetchedAt) }
        : { name: data.source, license: 'CC0 1.0', fetchedAt: new Date(data.fetchedAt) };
      return {
        updateOne: {
          filter: p.wikidataId ? { tourId: tour._id, wikidataId: p.wikidataId } : { tourId: tour._id, osmId: p.osmId },
          update: {
            $set: {
              wikidataId: p.wikidataId || null,
              osmId: p.osmId || null,
              city: city.city,
              country: city.country,
              name: p.name,
              description: p.description,
              category: p.category,
              themes: cat.themes,
              visitMinutes: cat.visitMinutes,
              location: { type: 'Point', coordinates: p.coordinates },
              distanceFromCenterKm: p.distanceKm,
              popularity: { sitelinks: p.sitelinks, rank: i + 1 },
              unesco: p.unesco,
              image: p.image,
              website: p.website,
              wikipediaUrl: p.wikipediaUrl,
              wikivoyageUrl: p.wikivoyageUrl,
              source
            }
          },
          upsert: true
        }
      };
    });

    const keepWd = all.map(p => p.wikidataId).filter(Boolean);
    const keepOsm = all.filter(p => !p.wikidataId).map(p => p.osmId);
    const staleFilter = {
      tourId: tour._id,
      $nor: [{ wikidataId: { $in: keepWd } }, { osmId: { $in: keepOsm } }]
    };
    if (dryRun) {
      const stale = await Poi.countDocuments(staleFilter);
      upserted += ops.length;
      removed += stale;
      continue;
    }
    if (ops.length) await Poi.bulkWrite(ops, { ordered: false });
    const del = await Poi.deleteMany(staleFilter);
    upserted += ops.length;
    removed += del.deletedCount;
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}${upserted} POI cho ${data.cities.length} thanh pho, xoa ${removed} POI cu`);
  await mongoose.disconnect();
})().catch(async err => {
  console.error('That bai:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
