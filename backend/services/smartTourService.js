// backend/services/smartTourService.js
//
// SmartTour - len ke hoach chuyen di tu form cua khach.
//
//   Level A: mot tour nguyen ven.
//   Level B: ghep 2-3 tour NGUYEN VEN noi tiep nhau (khong cat ngay cua tour).
//
// Moi con so deu lay tu du lieu that da co trong DB, khong doan:
//   - ngay khoi hanh + so cho  : Tour.availability (chuyen co that)
//   - gia                      : pricingService (gia theo mua, khung tuoi)
//   - chang noi tour           : Tour.transportLegs + Tour.logistics (phut ra san bay/ga)
//   - gio tra phong            : Hotel.checkOutTime cua khach san tieu chuan
//   - so thich                 : Poi.themes (diem tham quan that) + Tour.food
//   - thoi tiet                : Tour.seasonality.monthly[].comfort (Open-Meteo)
//
// Luat noi tour (da thong nhat): tra phong o A, di chang A -> B. Neu den khach
// san B truoc Tour.operations.latestArrival (21:00 gio dia phuong B) thi tour B
// bat dau NGAY HOM DO. Den muon hon -> them mot DEM NOI CHUYEN o B, tour B bat
// dau hom sau.

const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');
const Poi = require('../models/Poi');
const { calculateBookingPrice, ageBand } = require('./pricingService');
const { calendarDay, MONTHS } = require('./seasonalPricing');
const { SMARTTOUR_INTERESTS, AUDIENCES } = require('../config/travel-vocabulary');
const { DEFAULT_OPERATIONS, DEFAULT_CHECK_TIMES } = require('../config/city-logistics');

const DAY_MS = 864e5;
const MAX_TOURS_PER_PLAN = 3;
// Tour sau duoc phep bat dau tre toi da 1 ngay so voi ngay som nhat co the
// (khach nghi them 1 dem o thanh pho moi). Tre hon thi ke hoach bi rong ngay.
const MAX_WAIT_DAYS = 1;
// Ke hoach ngan hon so ngay khach co toi da bao nhieu ngay van duoc xet
const MAX_SHORTER_DAYS = 3;
const RESULT_LIMIT = 6;
const MIN_SINGLE_TOUR_DAYS = 3;

// Trong so cham diem. Tong = 1.
// So thich nang nhat vi do la ly do khach chon noi den; thoi tiet va do khop
// so ngay xep sau. Khong co diem "pho bien": du lieu booking hien la du lieu
// mau (225 booking tao trong 1 tuan), cham theo no la hoc lai chinh du lieu gia.
const WEIGHTS = {
  interests: 0.35,
  weather: 0.15,
  duration: 0.15,
  budget: 0.10,
  pace: 0.10,
  group: 0.10,
  connections: 0.05
};

const PACE_ORDER = ['relaxed', 'balanced', 'packed'];

// ---------------------------------------------------------------- mui gio

/** Do lech (phut) cua mui gio IANA tai mot thoi diem UTC. */
function tzOffsetMinutes(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date(utcMs));
  const get = (t) => Number(parts.find(p => p.type === t).value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - utcMs) / 60000);
}

/** "YYYY-MM-DD" + "HH:mm" gio dia phuong -> moc UTC (ms). */
function localToUtc(day, hhmm, timeZone) {
  const [h, m] = hhmm.split(':').map(Number);
  const naive = Date.parse(`${day}T00:00:00Z`) + (h * 60 + m) * 60000;
  // Lap 2 lan de dung ca khi roi dung ngay doi gio mua he
  let utc = naive - tzOffsetMinutes(naive, timeZone) * 60000;
  utc = naive - tzOffsetMinutes(utc, timeZone) * 60000;
  return utc;
}

/** Moc UTC (ms) -> { day: "YYYY-MM-DD", time: "HH:mm" } theo gio dia phuong. */
function utcToLocal(utcMs, timeZone) {
  const local = new Date(utcMs + tzOffsetMinutes(utcMs, timeZone) * 60000).toISOString();
  return { day: local.slice(0, 10), time: local.slice(11, 16) };
}

const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// ---------------------------------------------------------------- dau vao

/**
 * Chuan hoa form. Nem loi (status 400) neu thieu truong bat buoc.
 *
 * @param {object} raw {
 *   startFrom, startTo   : khoang ngay co the khoi hanh "YYYY-MM-DD"
 *   days                 : so ngay khach co (tong ca chuyen)
 *   budget               : ngan sach USD / nguoi (ca chuyen, chua gom ve may bay tu Viet Nam)
 *   adults, childAges[]  : so nguoi lon, tuoi tung tre (0-11)
 *   travelParty          : solo | couple | family | friends | seniors | honeymoon | business
 *   interests[]          : trong SMARTTOUR_INTERESTS
 *   pace                 : relaxed | balanced | packed | any
 *   maxPhysical          : 1-5
 *   maxTours             : 1-3 (1 = chi Level A)
 *   mustInclude[]        : id tour bat buoc (toi da 3)
 *   mustMode             : all (co du moi tour) | any (co it nhat 1)
 * }
 */
function normalizeInput(raw = {}) {
  const fail = (msg) => { const e = new Error(msg); e.status = 400; throw e; };
  const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  const notes = [];

  if (!isDay(raw.startFrom)) fail('startFrom must be a date YYYY-MM-DD');
  const startTo = isDay(raw.startTo) ? raw.startTo : addDays(raw.startFrom, 30);
  if (daysBetween(raw.startFrom, startTo) < 0) fail('startTo must be on or after startFrom');
  if (daysBetween(raw.startFrom, startTo) > 120) fail('Departure window can be at most 120 days');

  // Khong goi y chuyen da chay: som nhat la ngay mai (theo lich UTC, cung quy
  // uoc ngay khoi hanh luu 00:00 UTC)
  const tomorrow = addDays(new Date().toISOString().slice(0, 10), 1);
  if (startTo < tomorrow) fail('These dates are in the past. Pick dates from tomorrow on.');
  let startFrom = raw.startFrom;
  if (startFrom < tomorrow) {
    startFrom = tomorrow;
    notes.push(`Start date moved to ${tomorrow} (earlier dates are in the past).`);
  }

  const days = parseInt(raw.days, 10);
  if (!(days >= 2 && days <= 30)) fail('days must be between 2 and 30');

  const budget = Number(raw.budget);
  if (!(budget > 0)) fail('budget must be a positive number (USD per person)');

  let adults = parseInt(raw.adults, 10);
  if (!(adults >= 1 && adults <= 12)) fail('adults must be between 1 and 12');

  const ages = (Array.isArray(raw.childAges) ? raw.childAges : []).map(a => parseInt(a, 10));
  if (ages.some(a => !(a >= 0 && a <= 17))) fail('Each child age must be between 0 and 17');
  // Tu 12 tuoi tra gia nguoi lon (pricingService.AGE_BANDS) - truoc day tre
  // 12+ bi loc bo im lang, doan mat nguoi, khong tinh ghe lan tien
  const teens = ages.filter(a => ageBand(a) === 'adult').length;
  const childAges = ages.filter(a => ageBand(a) !== 'adult');
  if (teens) {
    adults += teens;
    notes.push(`${teens} child(ren) aged 12+ counted as adult(s), as they pay the adult price.`);
  }

  const rawInterests = Array.isArray(raw.interests) ? raw.interests : [];
  const interests = rawInterests.filter(i => SMARTTOUR_INTERESTS.includes(i));
  const ignored = rawInterests.filter(i => !SMARTTOUR_INTERESTS.includes(i));
  if (ignored.length) notes.push(`Ignored unknown interest(s): ${ignored.join(', ')}.`);

  const mustInclude = [...new Set((Array.isArray(raw.mustInclude) ? raw.mustInclude : []).map(String))];
  if (mustInclude.length > MAX_TOURS_PER_PLAN) fail(`mustInclude can list at most ${MAX_TOURS_PER_PLAN} tours`);
  const mustMode = raw.mustMode === 'any' ? 'any' : 'all';

  const pace = PACE_ORDER.includes(raw.pace) ? raw.pace : 'any';
  const maxPhysical = Math.min(5, Math.max(1, parseInt(raw.maxPhysical, 10) || 5));
  const maxTours = Math.min(MAX_TOURS_PER_PLAN, Math.max(1, parseInt(raw.maxTours, 10) || MAX_TOURS_PER_PLAN));
  const travelParty = AUDIENCES.includes(raw.travelParty) ? raw.travelParty
    : (ages.length ? 'family' : adults === 1 ? 'solo' : adults === 2 ? 'couple' : 'friends');

  const children = childAges.filter(a => ageBand(a) === 'child').length;
  const infants = childAges.filter(a => ageBand(a) === 'infant').length;

  return {
    startFrom, startTo, days, budget, adults, childAges, children, infants,
    seats: adults + children, // em be ngoi long, khong chiem ghe (departureService.seatsFor)
    youngest: ages.length ? Math.min(...ages) : null,
    interests, pace, maxPhysical, maxTours, travelParty, mustInclude, mustMode, notes
  };
}

/** Ke hoach co thoa yeu cau "bat buoc di" khong. */
function meetsMustInclude(plan, input) {
  if (!input.mustInclude.length) return true;
  const ids = new Set(plan.stops.map(s => s.tour.id));
  return input.mustMode === 'any'
    ? input.mustInclude.some(id => ids.has(id))
    : input.mustInclude.every(id => ids.has(id));
}

// ---------------------------------------------------------------- nap du lieu

// Cache 60 giay: form goi lien tuc khi khach doi tieu chi. So cho co the cu toi
// 60 giay nhung khong sao - luc dat tour, departureService giu cho nguyen tu.
const CATALOG_TTL_MS = 60 * 1000;
let catalogCache = null;

/** Moi thu SmartTour can, nap mot lan roi dung lai trong CATALOG_TTL_MS. */
async function loadCatalog() {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.data;
  const data = await fetchCatalog();
  catalogCache = { at: Date.now(), data };
  return data;
}

async function fetchCatalog() {
  const tours = await Tour.find({ status: { $ne: 'inactive' } }, {
    name: 1, country: 1, img: 1, durationDays: 1, pace: 1, physicalLevel: 1, minAge: 1,
    suitableFor: 1, themes: 1, food: 1, pricing: 1, estimatedCost: 1, priceBreakdown: 1,
    hotelTiers: 1, bestTimeToVisit: 1, availability: 1, transportLegs: 1, logistics: 1,
    operations: 1, 'location.timezone': 1, 'seasonality.monthly': 1, rating: 1
  }).lean();

  // Khach san tieu chuan (phu phi thap nhat) cua moi tour -> gio tra phong
  const standardHotelId = (t) => {
    const tiers = t.hotelTiers || [];
    if (!tiers.length) return null;
    return tiers.reduce((min, x) => (x.surcharge < min.surcharge ? x : min), tiers[0]).hotelId;
  };
  const hotelIds = tours.map(standardHotelId).filter(Boolean);
  const hotels = await Hotel.find({ _id: { $in: hotelIds } }, { name: 1, checkInTime: 1, checkOutTime: 1 }).lean();
  const hotelById = Object.fromEntries(hotels.map(h => [String(h._id), h]));

  // So diem tham quan theo chu de cua moi tour
  const poiThemes = {};
  const poiNames = {};
  (await Poi.find({}, { tourId: 1, themes: 1, name: 1, 'popularity.rank': 1 }).sort({ 'popularity.rank': 1 }).lean())
    .forEach(p => {
      const k = String(p.tourId);
      poiThemes[k] = poiThemes[k] || {};
      poiNames[k] = poiNames[k] || {};
      (p.themes || []).forEach(th => {
        poiThemes[k][th] = (poiThemes[k][th] || 0) + 1;
        (poiNames[k][th] = poiNames[k][th] || []).push(p.name);
      });
    });

  const byId = {};
  for (const t of tours) {
    const id = String(t._id);
    const hotel = hotelById[String(standardHotelId(t))];
    byId[id] = {
      ...t,
      id,
      timezone: t.location?.timezone || 'UTC',
      operations: { ...DEFAULT_OPERATIONS, ...(t.operations || {}) },
      standardHotel: hotel ? hotel.name : null,
      checkOutTime: hotel?.checkOutTime || DEFAULT_CHECK_TIMES.checkOutTime,
      poiThemes: poiThemes[id] || {},
      poiNames: poiNames[id] || {},
      legTo: Object.fromEntries((t.transportLegs || []).map(l => [String(l.toTourId), l])),
      departuresByDay: Object.fromEntries((t.availability || []).map(a => [calendarDay(a.startDate), a]))
    };
  }
  return byId;
}

// ---------------------------------------------------------------- dieu kien cung

/** Ly do tour bi loai voi doan khach nay (null = dat). */
function tourBlocked(tour, input) {
  if (input.youngest != null && input.youngest < (tour.minAge || 0)) return `minimum age ${tour.minAge}`;
  if ((tour.physicalLevel || 2) > input.maxPhysical) return `physical level ${tour.physicalLevel}`;
  if (!tour.durationDays) return 'no duration';
  return null;
}

/** Chuyen khoi hanh dung ngay `day`, con du cho cho ca doan. */
function departureOn(tour, day, seats) {
  const dep = tour.departuresByDay[day];
  return dep && (dep.availableSlots || 0) >= seats ? dep : null;
}

// ---------------------------------------------------------------- noi tour

/**
 * Tinh chang noi tu tour A (ket thuc ngay endDay) sang tour B.
 *
 * Thu 2 gio roi khach san A: gio tra phong (mac dinh) va chuyen xe som nhat
 * (operations.departureTransfer.from, vd 06:00). Chon phuong an cho tour B bat
 * dau som nhat; bang nhau thi giu gio tra phong (khach khong phai day som).
 *
 * @returns {object|null} null neu khong co chang A -> B
 */
function planConnection(A, B, endDay) {
  const leg = A.legTo[B.id];
  if (!leg) return null;

  const viaAir = leg.mode === 'flight';
  const transferOut = (viaAir ? A.logistics?.airport : (A.logistics?.ground || A.logistics?.airport))?.transferMinutes || 45;
  const transferIn = (viaAir ? B.logistics?.airport : (B.logistics?.ground || B.logistics?.airport))?.transferMinutes || 45;
  const travelMinutes = transferOut + Math.round((leg.durationHours || 0) * 60) + transferIn;

  const options = [A.checkOutTime, A.operations.departureTransfer?.from].filter(Boolean);
  let best = null;
  for (const leaveAt of [...new Set(options)]) {
    const leaveUtc = localToUtc(endDay, leaveAt, A.timezone);
    const arrive = utcToLocal(leaveUtc + travelMinutes * 60000, B.timezone);
    const t = toMinutes(arrive.time);
    const pickupFrom = toMinutes(B.operations.arrivalPickup?.from || '08:00');
    const latest = toMinutes(B.operations.latestArrival || '21:00');

    // Den trong khung don khach -> bat dau ngay den, khong them dem.
    // Den sau latestArrival -> bat dau hom sau, them 1 dem o B.
    // Den rang sang truoc gio don (bay dem) -> bat dau ngay den, nhung can
    // phong tu dem hom truoc -> them 1 dem.
    let earliestStart, extraNights;
    if (t > latest) { earliestStart = addDays(arrive.day, 1); extraNights = 1; }
    else if (t < pickupFrom) { earliestStart = arrive.day; extraNights = 1; }
    else { earliestStart = arrive.day; extraNights = 0; }

    const option = { leaveAt, arrive, earliestStart, extraNights };
    if (!best || earliestStart < best.earliestStart ||
        (earliestStart === best.earliestStart && extraNights < best.extraNights)) best = option;
  }

  return {
    from: A.name, to: B.name,
    mode: leg.mode, stops: leg.stops || 0, distanceKm: leg.distanceKm,
    legHours: leg.durationHours, travelMinutes,
    costPerPerson: leg.estimatedCost || 0,
    leaveDay: endDay, leaveAt: best.leaveAt,
    arriveDay: best.arrive.day, arriveAt: best.arrive.time,
    earliestStart: best.earliestStart,
    connectionNights: best.extraNights
  };
}

// ---------------------------------------------------------------- tim ke hoach

/** Moi chuoi tour hop le: ngay noi khop, du cho, khong vuot so ngay. */
function buildPlans(catalog, input) {
  const tours = Object.values(catalog).filter(t => !tourBlocked(t, input));
  const plans = [];
  const minDays = Math.max(2, input.days - MAX_SHORTER_DAYS);

  const extend = (stops, connections) => {
    const first = stops[0];
    const last = stops[stops.length - 1];
    const totalDays = daysBetween(first.startDay, last.endDay) + 1;
    // Tour 2 ngay chi co nghia khi ghep (khong ai bay tu Viet Nam sang chau Au
    // de o 2 ngay), nen khong dung mot minh lam ke hoach Level A.
    const usable = stops.length > 1 || first.tour.durationDays >= MIN_SINGLE_TOUR_DAYS;
    if (usable && totalDays >= minDays) plans.push({ stops: [...stops], connections: [...connections], totalDays });
    if (stops.length >= input.maxTours) return;

    for (const B of tours) {
      if (stops.some(s => s.tour.id === B.id)) continue;
      const conn = planConnection(last.tour, B, last.endDay);
      if (!conn) continue;
      for (let wait = 0; wait <= MAX_WAIT_DAYS; wait++) {
        const startDay = addDays(conn.earliestStart, wait);
        const endDay = addDays(startDay, B.durationDays - 1);
        if (daysBetween(first.startDay, endDay) + 1 > input.days) break;
        const dep = departureOn(B, startDay, input.seats);
        if (!dep) continue;
        // Moi ngay cho them truoc khi tour B bat dau = them 1 dem o B
        const c = { ...conn, waitDays: wait, connectionNights: conn.connectionNights + wait, startDay };
        extend([...stops, { tour: B, departure: dep, startDay, endDay }], [...connections, c]);
        break; // ngay som nhat co chuyen la du, khong nhan doi ke hoach
      }
    }
  };

  for (const A of tours) {
    if (A.durationDays > input.days) continue;
    for (const dep of A.availability || []) {
      const startDay = calendarDay(dep.startDate);
      if (startDay < input.startFrom || startDay > input.startTo) continue;
      if ((dep.availableSlots || 0) < input.seats) continue;
      extend([{ tour: A, departure: dep, startDay, endDay: addDays(startDay, A.durationDays - 1) }], []);
    }
  }
  return plans;
}

// ---------------------------------------------------------------- gia

/** Gia ca ke hoach cho ca doan: tour (theo mua) + chang noi + dem noi chuyen. */
function pricePlan(plan, input) {
  const payingGuests = input.adults + input.children;
  const stops = plan.stops.map(s => {
    const quote = calculateBookingPrice(s.tour, {
      adults: input.adults, children: input.children, infants: input.infants, departureDate: s.startDay
    });
    return { ...s, quote, cost: quote.subtotal };
  });

  const connections = plan.connections.map((c, i) => {
    const B = stops[i + 1].tour;
    // Gia 1 dem / nguoi = phan luu tru trong gia tour B chia cho so dem cua tour B
    const nights = Math.max(1, (B.durationDays || 2) - 1);
    const nightPerPerson = Math.round((B.priceBreakdown?.accommodation || 0) / nights);
    const transportCost = c.costPerPerson * payingGuests;
    const nightsCost = c.connectionNights * nightPerPerson * payingGuests;
    return { ...c, transportCost, nightsCost, nightPerPerson, cost: transportCost + nightsCost };
  });

  const total = stops.reduce((s, x) => s + x.cost, 0) + connections.reduce((s, x) => s + x.cost, 0);
  return { ...plan, stops, connections, totalCost: total, costPerPerson: Math.round(total / payingGuests) };
}

// ---------------------------------------------------------------- cham diem

const pct = (v) => Math.round(v * 100);

/** Do phu so thich cua MOT tour: 0..1, kem ten diem lam bang chung. */
function interestCoverage(tour, interests) {
  if (!interests.length) return { score: 1, matched: {} };
  const matched = {};
  let sum = 0;
  for (const th of interests) {
    let support = tour.poiThemes[th] || 0;
    const examples = (tour.poiNames[th] || []).slice(0, 2);
    if (th === 'food') {
      support += (tour.food || []).length;
      examples.push(...(tour.food || []).slice(0, 2 - examples.length));
    }
    // 3 diem tro len cho mot so thich = du de xep vao lich 1 chuyen
    sum += Math.min(support, 3) / 3;
    if (support > 0) matched[th] = examples;
  }
  return { score: sum / interests.length, matched };
}

/** Diem thoi tiet thang khoi hanh (comfort 0..1 tu Open-Meteo). */
function weatherScore(tour, day) {
  const month = MONTHS[new Date(`${day}T00:00:00Z`).getUTCMonth()];
  const row = (tour.seasonality?.monthly || []).find(m => m.month === month);
  return { score: row?.comfort ?? 0.5, month, best: (tour.bestTimeToVisit || []).includes(month), row };
}

function paceScore(tour, pace) {
  if (pace === 'any') return 1;
  const gap = Math.abs(PACE_ORDER.indexOf(tour.pace || 'balanced') - PACE_ORDER.indexOf(pace));
  return gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
}

function scorePlan(plan, input) {
  const reasons = [];
  const warnings = [];
  const daysOf = plan.stops.map(s => s.tour.durationDays);
  const totalTourDays = daysOf.reduce((a, b) => a + b, 0);
  // Trung binh co trong so theo SO NGAY o moi thanh pho: 5 ngay o noi hop so
  // thich quan trong hon 2 ngay o noi khong hop.
  const weighted = (fn) => plan.stops.reduce((s, x, i) => s + fn(x) * daysOf[i], 0) / totalTourDays;

  // Tour bat buoc (da loc o planTrip, o day chi ghi ly do)
  const mustHit = plan.stops.filter(s => input.mustInclude.includes(s.tour.id)).map(s => s.tour.name);
  if (mustHit.length) reasons.push(`Includes your must-visit: ${mustHit.join(', ')}`);

  // So thich
  const coverage = plan.stops.map(s => interestCoverage(s.tour, input.interests));
  const interests = weighted(s => coverage[plan.stops.indexOf(s)].score);
  if (input.interests.length) {
    const covered = input.interests.filter(th => coverage.some(c => c.matched[th]));
    const missing = input.interests.filter(th => !covered.includes(th));
    if (covered.length) {
      const ex = covered.slice(0, 3).map(th => {
        const where = plan.stops.find((s, i) => coverage[i].matched[th]);
        const names = coverage[plan.stops.indexOf(where)].matched[th];
        return `${th} (${names.join(', ')})`;
      });
      reasons.push(`Matches ${covered.length}/${input.interests.length} interests: ${ex.join('; ')}`);
    }
    if (missing.length) warnings.push(`No places for: ${missing.join(', ')}`);
  }

  // Thoi tiet
  const weatherRows = plan.stops.map(s => weatherScore(s.tour, s.startDay));
  const weather = weighted(s => weatherRows[plan.stops.indexOf(s)].score);
  const goodMonths = plan.stops.filter((s, i) => weatherRows[i].best).map(s => s.tour.name);
  if (goodMonths.length) reasons.push(`Best season in ${goodMonths.join(', ')}`);
  weatherRows.forEach((w, i) => {
    // Thang dep la TUONG DOI trong nam (vung nhiet doi thang nao cung mua), nen
    // khong canh bao thoi tiet o thang da duoc tinh la mua dep.
    if (w.score < 0.4 && w.row && !w.best) {
      warnings.push(`${plan.stops[i].tour.name} in ${w.month}: ~${w.row.tmaxC}°C, ${w.row.rainyDays} rainy days`);
    }
  });

  // So ngay
  const duration = Math.max(0, 1 - (input.days - plan.totalDays) / input.days * 2);
  if (plan.totalDays === input.days) reasons.push(`Uses exactly your ${input.days} days`);
  else warnings.push(`${input.days - plan.totalDays} of your ${input.days} days left free`);

  // Ngan sach: duoi ngan sach la dat; cang du dia cang tot mot chut
  const ratio = plan.costPerPerson / input.budget;
  const budget = ratio <= 1 ? 0.6 + 0.4 * (1 - ratio) : 0;
  reasons.push(`$${plan.costPerPerson.toLocaleString('en-US')}/person (${pct(ratio)}% of budget)`);

  // Nhip do + nhom khach
  const pace = weighted(s => paceScore(s.tour, input.pace));
  if (input.pace !== 'any' && pace < 1) {
    const off = plan.stops.filter(s => paceScore(s.tour, input.pace) < 1).map(s => `${s.tour.name} is ${s.tour.pace}`);
    warnings.push(`Pace: ${off.join(', ')}`);
  }
  const group = weighted(s => (s.tour.suitableFor || []).includes(input.travelParty) ? 1 : 0);
  if (group === 1) reasons.push(`Suited to ${input.travelParty} travellers`);

  // Chang noi: moi dem noi chuyen va moi gio ngoi xe/bay deu tru diem
  const travelHours = plan.connections.reduce((s, c) => s + c.travelMinutes / 60, 0);
  const extraNights = plan.connections.reduce((s, c) => s + c.connectionNights, 0);
  const connections = plan.connections.length
    ? Math.max(0, 1 - 0.25 * extraNights - travelHours / 40)
    : 1;
  plan.connections.forEach(c => {
    if (c.connectionNights) warnings.push(`${c.connectionNights} connection night(s) in ${c.to}`);
  });

  const breakdown = { interests, weather, duration, budget, pace, group, connections };
  const score = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + w * breakdown[k], 0);
  return {
    ...plan,
    score: pct(score),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, pct(v)])),
    reasons, warnings, travelHours: Math.round(travelHours * 10) / 10, extraNights
  };
}

// ---------------------------------------------------------------- dau ra

function presentPlan(p) {
  return {
    level: p.stops.length === 1 ? 'A' : 'B',
    score: p.score,
    breakdown: p.breakdown,
    totalDays: p.totalDays,
    startDay: p.stops[0].startDay,
    endDay: p.stops[p.stops.length - 1].endDay,
    totalCost: p.totalCost,
    costPerPerson: p.costPerPerson,
    currency: 'USD',
    reasons: p.reasons,
    warnings: p.warnings,
    stops: p.stops.map(s => ({
      tourId: s.tour.id,
      name: s.tour.name,
      country: s.tour.country,
      img: s.tour.img,
      durationDays: s.tour.durationDays,
      pace: s.tour.pace,
      physicalLevel: s.tour.physicalLevel,
      startDay: s.startDay,
      endDay: s.endDay,
      season: s.quote.season,
      adultPrice: s.quote.adultPrice,
      cost: s.cost,
      availableSlots: s.departure.availableSlots,
      hotel: s.tour.standardHotel
    })),
    connections: p.connections.map(c => ({
      from: c.from, to: c.to, mode: c.mode, stops: c.stops, distanceKm: c.distanceKm,
      leaveDay: c.leaveDay, leaveAt: c.leaveAt, arriveDay: c.arriveDay, arriveAt: c.arriveAt,
      travelMinutes: c.travelMinutes, connectionNights: c.connectionNights,
      transportCost: c.transportCost, nightsCost: c.nightsCost, cost: c.cost
    }))
  };
}

/**
 * Giu ke hoach tot nhat cho moi TAP tour (Paris+Amsterdam chi hien 1 lan du co
 * nhieu ngay khoi hanh), va khong de mot tour chiem het danh sach.
 */
function pickDiverse(scored, limit) {
  const seenSets = new Set();
  const tourUses = {};
  const out = [];
  for (const p of scored) {
    const key = p.stops.map(s => s.tour.id).sort().join('+');
    if (seenSets.has(key)) continue;
    if (p.stops.some(s => (tourUses[s.tour.id] || 0) >= 2)) continue;
    seenSets.add(key);
    p.stops.forEach(s => { tourUses[s.tour.id] = (tourUses[s.tour.id] || 0) + 1; });
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/** Khi khong co ke hoach nao: noi ro rang buoc nao chan, kem ke hoach gan nhat. */
function explainEmpty(allPriced, input, catalog) {
  const tips = [];
  const blocked = Object.values(catalog).map(t => tourBlocked(t, input)).filter(Boolean);
  if (blocked.length === Object.keys(catalog).length) {
    tips.push('No tour fits your group (minimum age or physical level). Try a higher physical level.');
    return { tips, closest: [] };
  }
  if (!allPriced.length) {
    // Noi DUNG rang buoc dang chan, theo thu tu tu ro rang nhat - tranh khuyen
    // "them ngay" cho khach da xin 30 ngay.
    const tours = Object.values(catalog);
    const departures = tours.flatMap(t => (t.availability || []).map(a => ({ day: calendarDay(a.startDate), slots: a.availableSlots || 0 })));
    const lastDeparture = departures.map(d => d.day).sort().pop();
    const inWindow = departures.filter(d => d.day >= input.startFrom && d.day <= input.startTo);
    const longest = tours.map(t => t.durationDays || 0).sort((a, b) => b - a).slice(0, input.maxTours);
    // Noi cung ngay: ngay cuoi tour truoc = ngay dau tour sau
    const maxDays = longest.reduce((a, b) => a + b, 0) - (longest.length - 1);
    const maxSlots = Math.max(0, ...inWindow.map(d => d.slots));

    if (input.startFrom > lastDeparture) {
      tips.push(`Departures are scheduled only until ${lastDeparture}. Pick an earlier date.`);
    } else if (input.days < MIN_SINGLE_TOUR_DAYS) {
      tips.push(`The shortest trip is ${MIN_SINGLE_TOUR_DAYS} days.`);
    } else if (input.days > maxDays + MAX_WAIT_DAYS * (input.maxTours - 1)) {
      tips.push(`With up to ${input.maxTours} tour(s) a trip lasts at most about ${maxDays} days. Try fewer days` +
        (input.maxTours < MAX_TOURS_PER_PLAN ? ' or allow more cities.' : '.'));
    } else if (inWindow.length && maxSlots < input.seats) {
      tips.push(`Your group needs ${input.seats} seats but departures in these dates have at most ${maxSlots}. ` +
        'Try other dates or split the group.');
    } else {
      tips.push(`No departures fit ${input.days} days between ${input.startFrom} and ${input.startTo}. ` +
        'Try a wider date range, a different number of days, or allow more cities.');
    }
    return { tips, closest: [] };
  }
  const cheapest = [...allPriced].sort((a, b) => a.costPerPerson - b.costPerPerson)[0];
  tips.push(`Nothing fits $${input.budget.toLocaleString('en-US')}/person. ` +
    `The cheapest plan in your dates is $${cheapest.costPerPerson.toLocaleString('en-US')}/person.`);
  return { tips, closest: [presentPlan(scorePlan(cheapest, input))] };
}

/**
 * Co ke hoach hop le nhung khong cai nao chua tour bat buoc: noi ro vi sao,
 * theo thu tu tu ly do chac chan nhat.
 */
function explainMustInclude(input, catalog) {
  const must = input.mustInclude.map(id => catalog[id]);
  const names = must.map(t => t.name).join(input.mustMode === 'any' ? ' or ' : ' and ');
  const tips = [];

  const blocked = must.map(t => [t, tourBlocked(t, input)]).filter(([, why]) => why);
  if (input.mustMode === 'all' && blocked.length) {
    blocked.forEach(([t, why]) => tips.push(`${t.name} does not fit your group (${why}).`));
    return tips;
  }
  if (input.mustMode === 'any' && blocked.length === must.length) {
    tips.push(`None of ${names} fits your group (${blocked.map(([t, why]) => `${t.name}: ${why}`).join('; ')}).`);
    return tips;
  }
  if (input.mustMode === 'all' && must.length > input.maxTours) {
    tips.push(`You picked ${must.length} must-visit tours but allowed up to ${input.maxTours} per trip.`);
    return tips;
  }
  // Noi cung ngay: ngay cuoi tour truoc = ngay dau tour sau
  const minDays = input.mustMode === 'all'
    ? must.reduce((s, t) => s + t.durationDays, 0) - (must.length - 1)
    : Math.min(...must.map(t => t.durationDays));
  if (minDays > input.days) {
    const verb = must.length === 1 || input.mustMode === 'any' ? 'needs' : 'need';
    tips.push(`${names} ${verb} at least ${minDays} days; you have ${input.days}.`);
    return tips;
  }
  // Con lai: lich khoi hanh khong khop - goi y vai ngay gan nhat cua tung tour
  const near = must.map(t => {
    const days = (t.availability || [])
      .filter(a => (a.availableSlots || 0) >= input.seats)
      .map(a => calendarDay(a.startDate))
      .filter(d => d >= addDays(input.startFrom, -30) && d <= addDays(input.startTo, 60))
      .sort().slice(0, 3);
    return `${t.name}: ${days.length ? days.join(', ') : 'no departures nearby'}`;
  });
  tips.push(`No trip with ${names} fits ${input.days} days between ${input.startFrom} and ${input.startTo}. ` +
    `Nearby departures - ${near.join(' · ')}.`);
  return tips;
}

/**
 * Diem vao chinh.
 * @returns {{ input, plans, counts, notes, tips?, closest? }}
 */
async function planTrip(rawInput) {
  const input = normalizeInput(rawInput);
  const catalog = await loadCatalog();

  const unknown = input.mustInclude.filter(id => !catalog[id]);
  if (unknown.length) {
    const e = new Error(`Unknown tour id(s) in mustInclude: ${unknown.join(', ')}`);
    e.status = 400;
    throw e;
  }

  const all = buildPlans(catalog, input);
  const raw = all.filter(p => meetsMustInclude(p, input));
  if (all.length && !raw.length) {
    return {
      input,
      notes: input.notes,
      counts: { candidates: all.length, withMustInclude: 0, withinBudget: 0, levelA: 0, levelB: 0 },
      plans: [],
      tips: explainMustInclude(input, catalog),
      closest: []
    };
  }
  const priced = raw.map(p => pricePlan(p, input));
  const affordable = priced.filter(p => p.costPerPerson <= input.budget);
  const scored = affordable.map(p => scorePlan(p, input)).sort((a, b) => b.score - a.score);

  const result = {
    input,
    notes: input.notes,
    counts: {
      candidates: all.length,
      withMustInclude: input.mustInclude.length ? raw.length : undefined,
      withinBudget: affordable.length,
      levelA: scored.filter(p => p.stops.length === 1).length,
      levelB: scored.filter(p => p.stops.length > 1).length
    },
    plans: pickDiverse(scored, RESULT_LIMIT).map(presentPlan)
  };
  if (!result.plans.length) Object.assign(result, explainEmpty(priced, input, catalog));
  return result;
}

module.exports = {
  planTrip,
  // xuat de test
  normalizeInput, planConnection, localToUtc, utcToLocal, interestCoverage, WEIGHTS
};
