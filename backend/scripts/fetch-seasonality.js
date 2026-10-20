/**
 * Thang dep cua 36 thanh pho tu THOI TIET THAT.
 *
 * VAN DE TRUOC KHI CHAY:
 *   Tour.bestTimeToVisit ghi tay, va gia theo mua (+20% / -15%) suy ra tu do.
 *   Cau "thang 12 Paris re vi thap diem" vi the dua tren con so tu dat.
 *
 * NGUON (cung mot nguon, cung mot cach tinh cho ca 36 thanh pho):
 *   Open-Meteo Historical Weather API (ERA5), giay phep CC BY 4.0.
 *   10 nam du lieu ngay (2016-2025) tai toa do tour. Trung binh theo thang:
 *     tmaxC     : nhiet do cao nhat trung binh
 *     rainyDays : so ngay mua >= 1mm trung binh
 *   Diem de chiu (comfort, 0-1):
 *     nhiet   = 1 - |tmaxC - 24| / 12   (24°C de chiu nhat, cat ve [0,1])
 *     mua     = 1 - rainyDays / 20       (cat ve [0,1])
 *     comfort = 0.6 * nhiet + 0.4 * mua
 *   Thang dep (bestTimeToVisit) = cac thang co comfort >= (cao nhat - 0.10),
 *   it nhat 3, nhieu nhat 6 thang (theo comfort giam dan).
 *   Gia theo mua lay thang dep lam cao diem (services/seasonalPricing.js) - chay
 *   lai scripts/fix-availability-seasonality.js sau script nay de cap nhat gia.
 *
 * DA THU VA KHONG DUNG: luot xem Wikipedia lam chi so nhu cau (2026-10-19).
 *   Ke ca sau khi chia cho nen chung cua 36 thanh pho va lay trung vi 3 nam,
 *   no dung o vai noi (Kyoto cao diem thang 4 + 11, Santorini thang 5-7) nhung
 *   sai o thanh pho lon (London, Barcelona cao nhat thang 1) va bi tin tuc keo
 *   lech (Kazan thang 10/2024 - hoi nghi BRICS; Santorini 2/2025 - dong dat).
 *   Dung no se cho chat luong khac nhau giua cac tour.
 *
 * Ghi ra data/seasonality/seasonality.json sau MOI thanh pho (bi gioi han luot
 * goi thi chay lai la tiep tuc), roi ghi Tour.seasonality + Tour.bestTimeToVisit.
 *
 * Chay (tu thu muc backend):
 *   node scripts/fetch-seasonality.js --dry-run        # tai + in ket qua, khong ghi DB
 *   node scripts/fetch-seasonality.js                  # tai + ghi DB
 *   node scripts/fetch-seasonality.js --from-file      # dung file da tai, ghi DB
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { MONTHS } = require('../services/seasonalPricing');

const dryRun = process.argv.includes('--dry-run');
const fromFile = process.argv.includes('--from-file');

const OUT_FILE = path.join(__dirname, '..', '..', 'data', 'seasonality', 'seasonality.json');
const USER_AGENT = 'CMP-Travel-student-project/1.0 (hoangquocmanh2004@gmail.com)';
const CLIMATE_YEARS = { start: '2016-01-01', end: '2025-12-31' };
const RAINY_DAY_MM = 1;
const SOURCE = `Open-Meteo Historical Weather API (ERA5), ${CLIMATE_YEARS.start}..${CLIMATE_YEARS.end}, CC BY 4.0 - https://open-meteo.com`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

async function getJson(url, label) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw new Error(`${label}: HTTP ${res.status}`);
      console.warn(`   ${label}: HTTP ${res.status}, thu lai lan ${attempt}`);
      // Open-Meteo gioi han theo PHUT (10 nam du lieu ngay tinh bang nhieu luot goi)
      if (res.status === 429) { await sleep(65000); continue; }
    } catch (err) {
      if (attempt === 6 || /HTTP 4\d\d/.test(err.message)) throw err;
      console.warn(`   ${label}: ${err.message.slice(0, 100)}, thu lai lan ${attempt}`);
    }
    await sleep(4000 * attempt);
  }
  throw new Error(`${label}: that bai`);
}

async function fetchClimate([lng, lat], city) {
  const url = 'https://archive-api.open-meteo.com/v1/archive?' + new URLSearchParams({
    latitude: lat, longitude: lng, start_date: CLIMATE_YEARS.start, end_date: CLIMATE_YEARS.end,
    daily: 'temperature_2m_max,precipitation_sum', timezone: 'auto'
  });
  const json = await getJson(url, `${city} thoi tiet`);
  const sums = MONTHS.map(() => ({ tmax: 0, days: 0, rainy: 0 }));
  const years = new Set();
  json.daily.time.forEach((day, i) => {
    const m = Number(day.slice(5, 7)) - 1;
    const tmax = json.daily.temperature_2m_max[i];
    const rain = json.daily.precipitation_sum[i];
    if (tmax == null || rain == null) return;
    years.add(day.slice(0, 4));
    sums[m].tmax += tmax;
    sums[m].days += 1;
    if (rain >= RAINY_DAY_MM) sums[m].rainy += 1;
  });
  return sums.map(s => ({
    tmaxC: round(s.tmax / s.days, 1),
    rainyDays: round(s.rainy / years.size, 1)
  }));
}

/** Diem de chiu va cac thang dep, theo cong thuc o dau file. */
function bestMonths(climate) {
  const comfort = climate.map(c => round(
    0.6 * clamp01(1 - Math.abs(c.tmaxC - 24) / 12) + 0.4 * clamp01(1 - c.rainyDays / 20)
  ));
  const max = Math.max(...comfort);
  const ranked = comfort.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  let picked = ranked.filter(x => x.v >= max - 0.10);
  if (picked.length < 3) picked = ranked.slice(0, 3);
  if (picked.length > 6) picked = picked.slice(0, 6);
  return { comfort, best: picked.map(x => x.i).sort((a, b) => a - b) };
}

(async () => {
  await connectDB();
  const db = mongoose.connection.db;
  const tours = await db.collection('tours').find({}, { projection: { name: 1, 'location.coordinates': 1 } }).toArray();

  const previous = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : null;
  const data = {
    fetchedAt: previous?.fetchedAt || new Date().toISOString(),
    source: SOURCE,
    // Chi giu phan thoi tiet (ban tai truoc co them luot xem Wikipedia - khong dung)
    cities: (previous?.cities || []).map(({ city, climate }) => ({ city, climate }))
  };

  if (!fromFile) {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    for (const [i, t] of tours.entries()) {
      if (data.cities.some(c => c.city === t.name)) continue;
      const climate = await fetchClimate(t.location.coordinates, t.name);
      data.cities.push({ city: t.name, climate });
      data.fetchedAt = new Date().toISOString();
      fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
      console.log(`[${i + 1}/${tours.length}] ${t.name}`);
      await sleep(8000);
    }
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));

  const missing = tours.filter(t => !data.cities.some(c => c.city === t.name)).map(t => t.name);
  if (missing.length) throw new Error(`Thieu du lieu thoi tiet cho: ${missing.join(', ')}`);

  console.log('\nthanh pho      thang dep          (nhiet do cao nhat TB / so ngay mua cua thang dep dau tien)');
  for (const t of tours) {
    const c = data.cities.find(x => x.city === t.name);
    const { comfort, best } = bestMonths(c.climate);
    const monthly = MONTHS.map((month, i) => ({
      month, tmaxC: c.climate[i].tmaxC, rainyDays: c.climate[i].rainyDays, comfort: comfort[i]
    }));
    const first = c.climate[best[0]];
    console.log(`${t.name.padEnd(14)} ${best.map(i => MONTHS[i].slice(0, 3)).join(' ').padEnd(26)} ` +
      `${first.tmaxC}°C / ${first.rainyDays} ngay mua`);

    if (!dryRun) {
      await db.collection('tours').updateOne({ _id: t._id }, {
        $set: {
          bestTimeToVisit: best.map(i => MONTHS[i]),
          seasonality: { monthly, sources: { climate: data.source }, fetchedAt: new Date(data.fetchedAt) }
        }
      });
    }
  }
  console.log(dryRun ? '\nDRY-RUN: chua ghi DB.' : `\nDa ghi thang dep + thoi tiet 12 thang cho ${tours.length} tour.`);
  await mongoose.disconnect();
})().catch(async err => {
  console.error('That bai:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
