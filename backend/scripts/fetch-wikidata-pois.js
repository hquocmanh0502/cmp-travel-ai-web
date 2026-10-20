/**
 * Tai diem tham quan (POI) cho 36 thanh pho tu Wikidata.
 *
 * VAN DE TRUOC KHI CHAY:
 *   Moi tour chi co dung 3 attractions. Tour London 10 ngay phai di
 *   Buckingham Palace 3 lan vi khong con gi khac de xep. SmartTour khong the
 *   tu len lich trinh khi khong co diem nao de chon.
 *
 * VI SAO WIKIDATA:
 *   - Phu du CA 36 thanh pho voi cung mot bo truong. Tourpedia chi co 6 thanh
 *     pho - neu lay 6 noi tu Tourpedia con 30 noi tu nguon khac thi du lieu
 *     lech chat luong, SmartTour se thien vi tour tinh co co nguon tot hon.
 *   - Giay phep CC0 - duoc luu va phan phoi lai tu do.
 *   - Co san tin hieu do noi tieng dong nhat cho moi noi: so sitelinks (so
 *     phien ban Wikipedia/Wikivoyage... co bai ve dia diem do). British Museum
 *     co 109, mot nha tho nho chi co 5.
 *   - Da thu Overpass (OpenStreetMap) nhung 4 may chu deu tra loi 406/500/
 *     timeout trong ngay 2026-10-09.
 *
 * CACH LAM (cung mot quy trinh cho moi thanh pho):
 *   1. Lay moi dia diem trong ban kinh RADIUS_KM quanh toa do tour, cung quoc
 *      gia, con hoat dong, co >= MIN_SITELINKS sitelinks.
 *   2. Phan loai theo config/poi-categories.js (P31 -> P279* -> lop goc).
 *      Bo nhung gi khong phai diem tham quan: quan hanh chinh, truong dai hoc,
 *      cong ty, su kien...
 *   3. Moi loai giu cho 2 diem noi tieng nhat, roi lap theo sitelinks giam dan,
 *      ap tran so luong moi loai, giu MAX_PER_CITY.
 *   4. Lay chi tiet: mo ta, toa do, anh, website, bai Wikipedia, di san UNESCO.
 *
 * Script nay KHONG ghi vao DB - chi doc toa do tour roi ghi ra file.
 * Nap vao DB bang scripts/import-pois.js.
 *
 * Chay (tu thu muc backend):
 *   node scripts/fetch-wikidata-pois.js                 # ca 36 thanh pho
 *   node scripts/fetch-wikidata-pois.js --only London   # thu mot thanh pho
 *
 * Ket qua: data/pois/wikidata-pois.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const {
  POI_CATEGORIES, EXCLUDED_ROOTS, ALL_ROOTS, COUNTRY_QIDS, categoryFromRoots,
  ADMIN_ROOT, CONSTRUCTION_ROOT, isPurelyAdministrative
} = require('../config/poi-categories');

// 20km du phu ca thanh pho lon (Hampton Court cach trung tam London 18.6km) va
// diem den dang vung/dao (Santorini, Langkawi, thung lung Lauterbrunnen).
// Thanh pho lon co nhieu ung vien hon thi da co xep hang sitelinks lo.
const RADIUS_KM = 20;
// Nguong thap vi diem den nho (Langkawi, Phuket) co diem tham quan that nhung
// it bai Wikipedia: Langkawi Cable Car chi co 5, bai Cenang 3. Nguong 5 tung
// lam Langkawi chi con 1 diem. Thanh pho lon khong bi anh huong vi van lay top
// theo sitelinks giam dan.
const MIN_SITELINKS = 2;
// 2500 ung vien: voi 800, thanh pho lon (Barcelona, London) cat mat bai bien,
// cho, quan bar vi chung it sitelinks hon hang tram bao tang / nha tho.
const CANDIDATE_LIMIT = 2500;
const MAX_PER_CITY = 40;
// Moi loai diem duoc GIU CHO toi da 2 diem noi tieng nhat cua loai do truoc,
// roi moi lap phan con lai theo sitelinks. Neu chi xep theo sitelinks, 40 cho
// bi bao tang va nha tho chiem het va khach chon "Beach" / "Food" khong co gi.
const RESERVED_PER_CATEGORY = 2;
// So ung vien du dieu kien lay chi tiet (ten tieng Anh, toa do...)
const DETAIL_POOL = 400;

const OUT_FILE = path.join(__dirname, '..', '..', 'data', 'pois', 'wikidata-pois.json');
const SPARQL_URL = 'https://query.wikidata.org/sparql';
const API_URL = 'https://www.wikidata.org/w/api.php';
// Wikidata yeu cau User-Agent co thong tin lien he, neu khong se bi chan.
const USER_AGENT = 'CMP-Travel-student-project/1.0 (hoangquocmanh2004@gmail.com)';

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const qid = (uri) => uri.split('/').pop();

/** Goi co thu lai: Wikidata hay tra 429/503 khi tai cao. */
async function fetchWithRetry(url, options, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`${label}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      }
      console.warn(`   ${label}: HTTP ${res.status}, thu lai lan ${attempt}`);
    } catch (err) {
      if (attempt === 4 || /HTTP 4\d\d/.test(err.message)) throw err;
      console.warn(`   ${label}: ${err.message.slice(0, 120)}, thu lai lan ${attempt}`);
    }
    await sleep(5000 * attempt);
  }
  throw new Error(`${label}: that bai sau 4 lan`);
}

async function sparql(query, label) {
  const json = await fetchWithRetry(SPARQL_URL, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'query=' + encodeURIComponent(query)
  }, label);
  return json.results.bindings;
}

/** Buoc 1: ung vien quanh toa do tour, kem danh sach P31. */
async function fetchCandidates([lng, lat], countryQid, city) {
  const rows = await sparql(`
    SELECT ?item ?sl ?dist (GROUP_CONCAT(DISTINCT ?t; separator=",") AS ?types) WHERE {
      SERVICE wikibase:around {
        ?item wdt:P625 ?loc .
        bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "${RADIUS_KM}" .
        bd:serviceParam wikibase:distance ?dist .
      }
      ?item wikibase:sitelinks ?sl . FILTER(?sl >= ${MIN_SITELINKS})
      ?item wdt:P17 wd:${countryQid} .
      ?item wdt:P31 ?t .
      FILTER NOT EXISTS { ?item wdt:P576 [] }
      FILTER NOT EXISTS { ?item wdt:P5816 wd:Q56556915 }
      FILTER NOT EXISTS { ?item wdt:P195 [] }
    }
    GROUP BY ?item ?sl ?dist ORDER BY DESC(?sl) LIMIT ${CANDIDATE_LIMIT}`, `${city} ung vien`);

  return rows.map(r => ({
    wikidataId: qid(r.item.value),
    sitelinks: Number(r.sl.value),
    distanceKm: Math.round(Number(r.dist.value) * 10) / 10,
    types: r.types.value.split(',').map(qid)
  }));
}

/** Buoc 2: lop P31 nao la lop con cua lop goc nao. Cache dung chung moi thanh pho. */
const rootsOfType = new Map();
async function resolveTypes(types) {
  const unknown = [...new Set(types)].filter(t => !rootsOfType.has(t));
  const roots = [...ALL_ROOTS, ...EXCLUDED_ROOTS, ADMIN_ROOT, CONSTRUCTION_ROOT]
    .map(r => 'wd:' + r).join(' ');
  for (let i = 0; i < unknown.length; i += 150) {
    const batch = unknown.slice(i, i + 150);
    batch.forEach(t => rootsOfType.set(t, []));
    const rows = await sparql(`
      SELECT ?t ?root WHERE {
        VALUES ?t { ${batch.map(t => 'wd:' + t).join(' ')} }
        VALUES ?root { ${roots} }
        ?t wdt:P279* ?root .
      }`, `phan loai ${i}`);
    rows.forEach(r => rootsOfType.get(qid(r.t.value)).push(qid(r.root.value)));
    await sleep(1000);
  }
}

/** Buoc 4: chi tiet tung dia diem, 50 cai mot lan qua wbgetentities. */
async function fetchDetails(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({
      action: 'wbgetentities', format: 'json', ids: ids.slice(i, i + 50).join('|'),
      props: 'labels|descriptions|claims|sitelinks/urls', languages: 'en',
      sitefilter: 'enwiki|enwikivoyage'
    });
    const json = await fetchWithRetry(`${API_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT }
    }, 'chi tiet');
    Object.assign(out, json.entities);
    await sleep(500);
  }
  return out;
}

const claimValue = (entity, prop) => entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
const claimIds = (entity, prop) =>
  (entity.claims?.[prop] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

const UNESCO_WORLD_HERITAGE = 'Q9259';

async function processCity(tour) {
  const city = tour.name;
  const countryQid = COUNTRY_QIDS[tour.country];
  if (!countryQid) throw new Error(`Chua co ma Wikidata cho quoc gia ${tour.country}`);

  const candidates = await fetchCandidates(tour.location.coordinates, countryQid, city);
  await sleep(1000);
  await resolveTypes(candidates.flatMap(c => c.types));

  // 1. Phan loai, giu thu tu sitelinks giam dan
  const eligible = [];
  for (const c of candidates) {
    const roots = [...new Set(c.types.flatMap(t => rootsOfType.get(t) || []))];
    if (roots.some(r => EXCLUDED_ROOTS.includes(r))) continue;
    if (isPurelyAdministrative(c.types.map(t => rootsOfType.get(t) || []))) continue;
    const category = categoryFromRoots(roots);
    if (!category) continue;
    eligible.push({ ...c, category: category.key });
    if (eligible.length >= DETAIL_POOL) break;
  }

  // 2. Lay chi tiet, bo diem khong co ten tieng Anh / trung ten / chinh diem den
  const details = await fetchDetails(eligible.map(p => p.wikidataId));
  const named = [];
  const seenNames = new Set();
  for (const p of eligible) {
    const e = details[p.wikidataId];
    const name = e?.labels?.en?.value;
    // Trang web tieng Anh - diem khong co ten tieng Anh thi khach khong doc duoc
    if (!name) continue;
    // Bo chinh diem den: "Phuket" (ca hon dao), "Langkawi" (ca quan dao)
    if (name.toLowerCase() === city.toLowerCase()) continue;
    // Wikidata doi khi co 2 muc cho cung mot noi (Santorini: 2 "Therasia",
    // 2 "Red Beach"). Danh sach da xep sitelinks giam dan nen giu muc dau.
    if (seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());
    const coord = claimValue(e, 'P625');
    const image = claimValue(e, 'P18');
    named.push({
      wikidataId: p.wikidataId,
      name,
      description: e.descriptions?.en?.value || null,
      category: p.category,
      coordinates: [coord.longitude, coord.latitude],
      distanceKm: p.distanceKm,
      sitelinks: p.sitelinks,
      unesco: claimIds(e, 'P1435').includes(UNESCO_WORLD_HERITAGE),
      image: image ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image)}` : null,
      website: claimValue(e, 'P856') || null,
      wikipediaUrl: e.sitelinks?.enwiki?.url || null,
      wikivoyageUrl: e.sitelinks?.enwikivoyage?.url || null
    });
  }

  // 3. Chon 2 luot: giu cho cho moi loai, roi lap theo sitelinks (ap tran moi loai)
  const capOf = Object.fromEntries(POI_CATEGORIES.map(c => [c.key, c.cap]));
  const chosen = new Set();
  const perCategory = {};
  const take = (p) => {
    chosen.add(p.wikidataId);
    perCategory[p.category] = (perCategory[p.category] || 0) + 1;
  };
  for (const p of named) {
    if (chosen.size >= MAX_PER_CITY) break;
    if ((perCategory[p.category] || 0) < Math.min(RESERVED_PER_CATEGORY, capOf[p.category])) take(p);
  }
  for (const p of named) {
    if (chosen.size >= MAX_PER_CITY) break;
    if (!chosen.has(p.wikidataId) && (perCategory[p.category] || 0) < capOf[p.category]) take(p);
  }
  // Giu thu tu sitelinks giam dan -> hang (rank) van la do noi tieng
  const pois = named.filter(p => chosen.has(p.wikidataId));

  return { city, country: tour.country, tourId: String(tour._id), candidates: candidates.length, pois };
}

(async () => {
  await connectDB();
  const filter = only ? { name: only } : {};
  const tours = await Tour.find(filter, { name: 1, country: 1, location: 1 }).lean();
  await mongoose.disconnect();
  if (!tours.length) throw new Error(`Khong tim thay tour ${only || ''}`);

  // Giu ket qua cu cua cac thanh pho khong chay lai (khi dung --only)
  const previous = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : null;
  const cities = Object.fromEntries((previous?.cities || []).map(c => [c.city, c]));

  for (const [i, tour] of tours.entries()) {
    const t0 = Date.now();
    const result = await processCity(tour);
    cities[result.city] = result;
    const cats = {};
    result.pois.forEach(p => (cats[p.category] = (cats[p.category] || 0) + 1));
    console.log(`[${i + 1}/${tours.length}] ${result.city.padEnd(14)} ${String(result.pois.length).padStart(2)} POI ` +
      `(tu ${result.candidates} ung vien, ${((Date.now() - t0) / 1000).toFixed(0)}s)  ` +
      Object.entries(cats).map(([k, v]) => `${k}:${v}`).join(' '));
    await sleep(1500);
  }

  const output = {
    source: 'Wikidata',
    license: 'CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)',
    fetchedAt: new Date().toISOString(),
    method: {
      radiusKm: RADIUS_KM, minSitelinks: MIN_SITELINKS, maxPerCity: MAX_PER_CITY,
      ranking: 'giu cho 2 diem moi loai, roi sitelinks giam dan, ap tran so luong moi loai',
      categories: POI_CATEGORIES.map(({ key, roots, cap }) => ({ key, roots, cap }))
    },
    cities: Object.values(cities).sort((a, b) => a.city.localeCompare(b.city))
  };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nDa ghi ${OUT_FILE}`);
})().catch(err => {
  console.error('That bai:', err);
  process.exit(1);
});
