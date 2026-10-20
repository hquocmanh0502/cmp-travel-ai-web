/**
 * Dat lai so ngay cua 36 tour theo MOT luat chung, de SmartTour ghep duoc
 * nhieu do dai chuyen di.
 *
 * VAN DE TRUOC KHI CHAY:
 *   - So ngay do scripts/enrich-tour-core.js gan theo "gia cao -> tour dai hon",
 *     khong dua tren noi dung thanh pho. London 10 ngay, Amsterdam 3 ngay.
 *   - Chi co 4 muc 3/5/7/10 ngay, 21/36 tour la 5 ngay. Noi tour cung ngay thi
 *     ngay cuoi tour A = ngay dau tour B, nen 3 + 5 = 7: khach co 8 ngay hau nhu
 *     chi nhan ke hoach 7 ngay; khach co 4 ngay khong co gi.
 *
 * LUAT (giong nhau cho ca 36 tour):
 *   notable = so POI Wikidata co >= NOTABLE_SITELINKS sitelinks (diem du noi
 *             tieng de khach muon xem - du lieu that, data/pois/wikidata-pois.json)
 *     notable >= 25 -> 7 ngay
 *     notable >= 15 -> 5 ngay
 *     notable >= 8  -> 4 ngay
 *     notable >= 3  -> 3 ngay
 *     con lai       -> 2 ngay
 *   Tour co chu de 'beach' hoac 'island' toi thieu 4 ngay: khach den de nghi,
 *   khong phai de xem nhieu diem (Maldives chi co 0 diem >= 30 sitelinks).
 *
 * KEO THEO (cung trong script nay):
 *   - gia: GIU NGUYEN GIA MOI NGAY -> pricing, priceBreakdown, estimatedCost
 *     nhan theo ti le ngay; phu phi khach san nhan theo ti le so dem
 *   - itinerary: rut ngan thi bo ngay o giua (giu ngay den, ngay ve); keo dai
 *     thi them ngay "Discover <POI>" lay tu POI that chua co trong lich
 *   - availability: endDate = startDate + so ngay - 1, gia = cong thuc mua
 *   - chuoi "N days" / "N-day" trong duration, mo ta, chu thich anh
 *
 * Sau khi chay: node scripts/build-guide-schedule.js --no-stagger (lich HDV
 * phu thuoc endDate) roi node scripts/verify-data-quality.js.
 *
 * Nen sao luu truoc:  node scripts/backup-db.js --label truoc-doi-so-ngay
 *
 * Chay (tu thu muc backend):
 *   node scripts/apply-duration-rule.js --dry-run
 *   node scripts/apply-duration-rule.js
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const Poi = require('../models/Poi');
const { buildSeasonFactors, calendarMonth, round10 } = require('../services/seasonalPricing');

const dryRun = process.argv.includes('--dry-run');
const WIKIDATA_FILE = path.join(__dirname, '..', '..', 'data', 'pois', 'wikidata-pois.json');
const DAY_MS = 864e5;

const NOTABLE_SITELINKS = 30;
const STEPS = [[25, 7], [15, 5], [8, 4], [3, 3], [0, 2]];
const RESORT_THEMES = ['beach', 'island'];
const RESORT_MIN_DAYS = 4;

function ruleDays(notable, themes) {
  const byPoi = STEPS.find(([min]) => notable >= min)[1];
  const resort = (themes || []).some(t => RESORT_THEMES.includes(t));
  return resort ? Math.max(byPoi, RESORT_MIN_DAYS) : byPoi;
}

const round100 = (v) => Math.round(v / 100) * 100;

/** Nhan cac khoan theo ti le, khoan luu tru nhan phan lam tron de tong khop dung. */
function scaleBreakdown(breakdown, ratio, total) {
  const out = {};
  for (const [k, v] of Object.entries(breakdown || {})) out[k] = Math.round((v || 0) * ratio / 5) * 5;
  const diff = total - Object.values(out).reduce((a, b) => a + b, 0);
  out.accommodation = (out.accommodation || 0) + diff;
  return out;
}

/** Lich trinh moi dai `days` ngay. */
function rebuildItinerary(tour, days, pois) {
  const old = (tour.itinerary || []).map(d => ({ ...d }));
  const first = old[0];
  const last = old[old.length - 1];
  let middle = old.slice(1, -1);
  const hotel = first?.accommodation || null;
  const food = tour.food || [];

  if (middle.length > days - 2) {
    middle = middle.slice(0, Math.max(0, days - 2));
  } else {
    // Them ngay tu POI that chua xuat hien trong lich, theo do noi tieng
    const used = old.map(d => `${d.title} ${(d.activities || []).join(' ')}`).join(' ').toLowerCase();
    const fresh = pois.filter(p => !used.includes(p.name.toLowerCase()));
    let i = 0;
    while (middle.length < days - 2 && i < fresh.length) {
      const p = fresh[i++];
      const dish = food[(middle.length) % Math.max(1, food.length)];
      middle.push({
        title: `Discover ${p.name}`,
        description: `Guided visit to ${p.name} and free time to explore ${tour.name}.`,
        activities: [`Guided visit to ${p.name}`, 'City sightseeing', ...(dish ? [`Taste ${dish}`] : [])],
        meals: ['Breakfast', 'Lunch'],
        accommodation: hotel
      });
    }
  }

  let daysOut;
  if (days === 2) {
    // 2 ngay: khong con ngay giua -> gop diem tham quan noi tieng nhat vao
    // ngay den va sang ngay ve, de chuyen di van co noi dung.
    const top = old.slice(1, -1).concat(middle)[0];
    const sight = top ? (top.activities || []).find(a => /^Guided visit/.test(a)) : null;
    daysOut = [
      { ...first, activities: [...(first.activities || []).filter(a => !/^Evening/.test(a)), ...(sight ? [sight] : [])] },
      { ...last, activities: ['Breakfast at hotel', 'Morning city sightseeing', 'Hotel check-out', 'Transfer to airport'] }
    ];
  } else {
    daysOut = [first, ...middle, last];
  }
  return daysOut.map((d, i) => {
    const { _id, ...rest } = d;
    return { ...rest, day: i + 1, accommodation: i === daysOut.length - 1 ? null : (rest.accommodation || hotel) };
  });
}

/** "5 days" -> "4 days", "5-day" -> "4-day" (chi so ngay cu, khong dong vao "15 days"). */
function replaceDays(text, oldDays, newDays) {
  if (typeof text !== 'string') return text;
  return text
    .replace(new RegExp(`\\b${oldDays}([- ])day(s?)\\b`, 'g'), (_, sep, s) => `${newDays}${sep}day${sep === ' ' ? 's' : s}`)
    .replace(new RegExp(`\\b${oldDays - 1}([- ])night(s?)\\b`, 'g'), (_, sep) => `${newDays - 1}${sep}night${sep === ' ' && newDays - 1 !== 1 ? 's' : ''}`);
}

(async () => {
  const wikidata = JSON.parse(fs.readFileSync(WIKIDATA_FILE, 'utf8'));
  await connectDB();
  const tours = await Tour.find({}).lean();

  const plan = tours.map(t => {
    const wd = wikidata.cities.find(c => c.city === t.name);
    const notable = (wd?.pois || []).filter(p => p.sitelinks >= NOTABLE_SITELINKS).length;
    return { t, notable, from: t.durationDays, to: ruleDays(notable, t.themes) };
  }).sort((a, b) => b.notable - a.notable);

  console.log('Tour           notable  ngay cu -> moi   gia cu -> moi');
  for (const p of plan) {
    const newCost = round100(p.t.estimatedCost / p.from * p.to);
    console.log(`${p.t.name.padEnd(14)} ${String(p.notable).padStart(5)}    ${String(p.from).padStart(4)} -> ${String(p.to).padEnd(4)}  ` +
      `$${p.t.estimatedCost} -> $${newCost}${p.from === p.to ? '' : '  *'}`);
  }
  const dist = {};
  plan.forEach(p => { dist[p.to] = (dist[p.to] || 0) + 1; });
  console.log('\nPhan bo moi:', Object.entries(dist).map(([d, n]) => `${d} ngay x${n}`).join(', '));
  console.log(`Doi ${plan.filter(p => p.from !== p.to).length}/36 tour`);

  if (dryRun) { await mongoose.disconnect(); return; }

  for (const { t, from, to } of plan) {
    if (from === to) continue;
    const ratio = to / from;
    const adult = round100(t.estimatedCost * ratio);
    const keepRatio = (v) => (v != null ? round10(v / t.pricing.adult * adult) : v);
    const nightsRatio = Math.max(1, to - 1) / Math.max(1, from - 1);
    const pois = await Poi.find({ tourId: t._id }).sort({ 'popularity.rank': 1 }).lean();
    const factors = buildSeasonFactors(t);

    const update = {
      durationDays: to,
      duration: `${to} days`,
      estimatedCost: adult,
      'pricing.adult': adult,
      'pricing.child': keepRatio(t.pricing.child),
      'pricing.infant': keepRatio(t.pricing.infant),
      priceBreakdown: scaleBreakdown(t.priceBreakdown, ratio, adult),
      hotelTiers: (t.hotelTiers || []).map(h => ({ ...h, surcharge: round10((h.surcharge || 0) * nightsRatio) })),
      itinerary: rebuildItinerary(t, to, pois).map(d => ({ ...d, description: replaceDays(d.description, from, to) })),
      availability: (t.availability || []).map(a => ({
        ...a,
        endDate: new Date(new Date(a.startDate).getTime() + (to - 1) * DAY_MS),
        price: round10(adult * factors[calendarMonth(a.startDate)])
      })),
      longDescription: replaceDays(t.longDescription, from, to),
      highlights: (t.highlights || []).map(h => replaceDays(h, from, to)),
      gallery: (t.gallery || []).map(g => ({ ...g, caption: replaceDays(g.caption, from, to) })),
      updatedAt: new Date()
    };
    await Tour.updateOne({ _id: t._id }, { $set: update });
    console.log(`  ${t.name}: ${from} -> ${to} ngay, $${t.estimatedCost} -> $${adult}, ${update.itinerary.length} ngay lich trinh`);
  }
  await mongoose.disconnect();
  console.log('\nXong. Tiep theo: node scripts/build-guide-schedule.js --no-stagger && node scripts/verify-data-quality.js');
})().catch(async err => {
  console.error('That bai:', err);
  await mongoose.disconnect();
  process.exit(1);
});
