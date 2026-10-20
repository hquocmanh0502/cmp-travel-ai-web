/**
 * Bo sung POI tu OpenStreetMap cho nhung CHU DE tour con thieu bang chung.
 *
 * VAN DE:
 *   Wikidata (scripts/fetch-wikidata-pois.js) gan nhu khong co bai bien, quan
 *   bar, diem ngam canh o cac dao nho: Maldives 0 bai bien, Phuket 0 quan bar,
 *   Santorini 0 diem ngam canh. SmartTour cham diem so thich tu POI that, nen
 *   khach chon "Beach" se thay Maldives diem thap - sai hoan toan.
 *   Da thu ha nguong Wikidata xuong 1 sitelink: chi ra mui dat, dao khong ten.
 *
 * LUAT (giong nhau cho CA 36 tour, khong chon tay thanh pho nao):
 *   Voi moi chu de trong Tour.themes thuoc SMARTTOUR_INTERESTS, neu POI Wikidata
 *   (+ mon dac san voi 'food') the hien chu de do < MIN_SUPPORT, lay them toi da
 *   OSM_PER_GAP diem OSM thuoc dung loai cua chu de do.
 *   Chi lap cho tour TU NHAN chu de do - khong them "beach" cho Berlin chi vi
 *   Berlin co bai tam ven ho.
 *
 * XEP HANG diem OSM (OSM khong co sitelinks): co the wikidata > co bai
 *   wikipedia > co ten tieng Anh > nhieu the mo ta hon > gan trung tam hon.
 *
 * Script KHONG ghi DB, chi doc Tour + file Wikidata roi ghi data/pois/osm-pois.json.
 * Nap vao DB bang scripts/import-pois.js (nap ca hai file).
 *
 * Chay (tu thu muc backend):
 *   node scripts/fetch-osm-pois.js
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const { categoryByKey } = require('../config/poi-categories');
const { SMARTTOUR_INTERESTS } = require('../config/travel-vocabulary');

const WIKIDATA_FILE = path.join(__dirname, '..', '..', 'data', 'pois', 'wikidata-pois.json');
const OUT_FILE = path.join(__dirname, '..', '..', 'data', 'pois', 'osm-pois.json');

const RADIUS_M = 20000;      // cung ban kinh voi Wikidata
const MIN_SUPPORT = 2;       // cung nguong voi verify-data-quality.js
const OSM_PER_GAP = 2;
const MIN_GAP_METERS = 150;  // gan POI cung loai da co hon muc nay = trung
const SAME_SPOT_METERS = 50; // gan POI BAT KY da co hon muc nay = cung mot noi

// Chu de -> loai POI (config/poi-categories.js) + bo loc Overpass.
// Moi lan chi hoi MOT bo loc: Overpass tra loi truy van gop nhieu the bang
// timeout (thu ngay 2026-10-19: 4 noi deu ~110s roi rong).
const THEME_SOURCES = {
  beach:       [{ category: 'beach',     filter: '["natural"="beach"]' }],
  nightlife:   [{ category: 'nightlife', filter: '["amenity"~"^(bar|pub|nightclub)$"]' }],
  photography: [{ category: 'viewpoint', filter: '["tourism"="viewpoint"]' }],
  island:      [{ category: 'island',    filter: '["place"="island"]' }],
  food:        [{ category: 'market',    filter: '["amenity"="marketplace"]' }],
  mountain:    [{ category: 'mountain',  filter: '["natural"="peak"]' }],
  nature:      [{ category: 'nature',    filter: '["leisure"="nature_reserve"]' }],
  shopping:    [{ category: 'shopping',  filter: '["shop"="mall"]' }]
};

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const USER_AGENT = 'CMP-Travel-student-project/1.0 (hoangquocmanh2004@gmail.com)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function overpass(lat, lng, filter, label) {
  const query = `[out:json][timeout:90];nwr(around:${RADIUS_M},${lat},${lng})${filter}["name"];out tags center 400;`;
  for (let round = 1; round <= 4; round++) {
    for (const server of SERVERS) {
      try {
        const res = await fetch(server, {
          method: 'POST',
          signal: AbortSignal.timeout(120000),
          headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = JSON.parse(text);
        // Overpass bao timeout bang truong remark, van tra 200
        if (json.remark && /timed out|runtime error/i.test(json.remark)) throw new Error(json.remark.slice(0, 80));
        return json.elements;
      } catch (err) {
        console.warn(`   ${label} @ ${server.split('/')[2]}: ${err.message}`);
      }
    }
    await sleep(30000 * round);
  }
  throw new Error(`${label}: moi may chu Overpass deu loi`);
}

/** Khoang cach haversine (m). */
function meters([lng1, lat1], [lng2, lat2]) {
  const R = 6371000, rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Trang web tieng Anh: chi nhan ten tieng Anh, hoac ten goc viet bang chu Latin
const englishName = (tags) => tags['name:en'] || (/^[\p{Script=Latin}\d\s'’.,&()\-]+$/u.test(tags.name) ? tags.name : null);
// Bo chinh diem den ("Pulau Langkawi", "Ko Phuket") giong luat cua script Wikidata
const GENERIC = /\b(pulau|ko|koh|island|isle|nisos|the)\b/gi;
const isDestinationItself = (name, city) =>
  name.toLowerCase().replace(GENERIC, '').trim() === city.toLowerCase();

// "The three bells of Fira" va "Three Bells of Fira" la mot (Wikidata xep loai
// religious, OSM xep viewpoint) - so ten da bo "the", dau cau, chu hoa.
const normName = (n) => n.toLowerCase().replace(/the/g, '').replace(/[^p{L}p{N}]+/gu, ' ').trim();

function rankScore(e) {
  const t = e.tags;
  return (t.wikidata ? 8 : 0) + (t.wikipedia ? 4 : 0) + (t['name:en'] ? 2 : 0) + Object.keys(t).length / 20;
}

(async () => {
  const wikidata = JSON.parse(fs.readFileSync(WIKIDATA_FILE, 'utf8'));
  await connectDB();
  const tours = await Tour.find({}, { name: 1, country: 1, themes: 1, food: 1, location: 1 }).lean();
  await mongoose.disconnect();

  // Chay lai duoc: Overpass hay loi 502/504 giua chung, nen ket qua duoc ghi
  // sau MOI chu de, lan sau chi hoi nhung chu de chua lay duoc.
  const previous = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : { cities: [] };
  const cities = previous.cities;
  const save = (complete) => fs.writeFileSync(OUT_FILE, JSON.stringify(buildOutput(cities, complete), null, 2));

  for (const tour of tours) {
    const wd = wikidata.cities.find(c => c.city === tour.name);
    if (!wd) throw new Error(`Thieu ${tour.name} trong ${WIKIDATA_FILE}`);
    const existing = wd.pois.map(p => ({ ...p, themes: categoryByKey[p.category].themes }));

    const gaps = (tour.themes || []).filter(th => SMARTTOUR_INTERESTS.includes(th) && THEME_SOURCES[th])
      .filter(th => {
        let support = existing.filter(p => p.themes.includes(th)).length;
        if (th === 'food') support += (tour.food || []).length;
        return support < MIN_SUPPORT;
      });

    let entry = cities.find(c => c.city === tour.name);
    for (const theme of gaps) {
      if (entry?.fetched?.includes(theme)) continue;
      if (!entry) {
        entry = { city: tour.name, country: tour.country, gaps, fetched: [], pois: [] };
        cities.push(entry);
      }
      const pois = entry.pois;
      for (const { category, filter } of THEME_SOURCES[theme]) {
        const [lng, lat] = tour.location.coordinates;
        const t0 = Date.now();
        const elements = await overpass(lat, lng, filter, `${tour.name}/${category}`);
        const have = existing.filter(p => p.themes.includes(theme)).length;
        const need = OSM_PER_GAP;

        const candidates = elements
          .map(e => {
            const coord = e.type === 'node' ? [e.lon, e.lat] : e.center ? [e.center.lon, e.center.lat] : null;
            const name = englishName(e.tags);
            return coord && name ? { e, coord, name } : null;
          })
          .filter(Boolean)
          .filter(c => !isDestinationItself(c.name, tour.name))
          // Trung voi diem Wikidata da co (cung Q-id, cung ten, hoac sat canh cung loai)
          .filter(c => !existing.some(p =>
            (c.e.tags.wikidata && p.wikidataId === c.e.tags.wikidata) ||
            normName(p.name) === normName(c.name) ||
            meters(p.coordinates, c.coord) < SAME_SPOT_METERS ||
            (p.category === category && meters(p.coordinates, c.coord) < MIN_GAP_METERS)))
          .map(c => ({ ...c, score: rankScore(c.e), distanceKm: Math.round(meters([lng, lat], c.coord) / 100) / 10 }))
          .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

        const seen = new Set(pois.map(p => normName(p.name)));
        const picked = [];
        for (const c of candidates) {
          if (picked.length >= need) break;
          if (seen.has(normName(c.name))) continue;
          seen.add(normName(c.name));
          picked.push({
            osmId: `${c.e.type}/${c.e.id}`,
            wikidataId: c.e.tags.wikidata || null,
            name: c.name,
            description: `${category} in ${tour.name}, ${tour.country}`,
            category,
            coordinates: c.coord,
            distanceKm: c.distanceKm,
            website: c.e.tags.website || null,
            wikipediaUrl: c.e.tags.wikipedia
              ? `https://${c.e.tags.wikipedia.split(':')[0]}.wikipedia.org/wiki/${encodeURIComponent(c.e.tags.wikipedia.split(':').slice(1).join(':').replace(/ /g, '_'))}`
              : null
          });
        }
        pois.push(...picked);
        console.log(`${tour.name.padEnd(14)} ${theme.padEnd(12)} co ${have} -> them ${picked.length} ` +
          `(${elements.length} ket qua OSM, ${((Date.now() - t0) / 1000).toFixed(0)}s): ${picked.map(p => p.name).join(' | ')}`);
        await sleep(3000);
      }
      entry.fetched.push(theme);
      save(false);
    }
  }

  save(true);
  console.log(`\nDa ghi ${OUT_FILE}: ${cities.reduce((s, c) => s + c.pois.length, 0)} POI cho ${cities.length} thanh pho`);
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});

function buildOutput(cities, complete) {
  return {
    source: 'OpenStreetMap',
    license: 'ODbL 1.0 (https://opendatacommons.org/licenses/odbl/) - © OpenStreetMap contributors',
    fetchedAt: new Date().toISOString(),
    method: {
      rule: `chu de tour co < ${MIN_SUPPORT} POI Wikidata the hien -> them toi da ${OSM_PER_GAP} diem OSM cung loai`,
      radiusM: RADIUS_M,
      ranking: 'wikidata > wikipedia > name:en > so the > khoang cach',
      themeSources: THEME_SOURCES
    },
    complete, // false = lan chay bi ngat giua chung, chay lai de lay not
    cities
  };
}
