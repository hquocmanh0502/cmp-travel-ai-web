// backend/services/seasonalPricing.js
//
// Cong thuc gia theo mua - NOI DUY NHAT dinh nghia no.
//
// Dung chung cho:
//   - scripts/fix-availability-seasonality.js : sinh availability[].price
//   - services/pricingService.js             : tinh tien khi dat tour
//   - SmartTour                               : hien gia theo ngay khoi hanh
//
// Truoc day cong thuc chi nam trong script sinh lich, con luc tinh tien lai dung
// gia co ban (pricing.adult). Ket qua: SmartTour hien "Paris khoi hanh 3/12 gia
// $5,950" nhung khach bi tru $7,000.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

// He so gia theo mua. Thang dep (bestTimeToVisit) = cao diem. Tu 2026-10-19
// thang dep suy tu THOI TIET THAT (Open-Meteo), xem scripts/fetch-seasonality.js.
const PEAK = 1.20;      // thang dep
const SHOULDER = 1.08;  // ke ngay thang dep
const LOW = 0.85;       // con lai

// QUY UOC NGAY (xem models/Tour.js): ngay khoi hanh la ngay theo lich dia phuong
// cua thanh pho, luu dang 00:00 UTC. Vi vay doc ngay/thang bang cac ham UTC -
// ket qua giong nhau du server chay o Viet Nam hay o UTC (Vercel).
//
// Truoc 2026-10-19 ngay duoc luu la nua dem gio Viet Nam (17:00Z hom truoc).
// scripts/normalize-departure-dates.js da doi het sang quy uoc moi.

/** Chi so thang (0-11) tu ten thang trong bestTimeToVisit. */
function monthIndex(name) {
  return MONTHS.indexOf(String(name).trim());
}

/** Thang (0-11) theo lich cua mot ngay khoi hanh. */
function calendarMonth(date) {
  return new Date(date).getUTCMonth();
}

/** Ngay "YYYY-MM-DD" theo lich, de so khop ngay khoi hanh voi ngay khach chon. */
function calendarDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/** Doi "YYYY-MM-DD" (hoac Date) sang Date 00:00 UTC theo quy uoc. */
function toCalendarDate(value) {
  const day = typeof value === 'string' ? value.slice(0, 10) : calendarDay(value);
  return new Date(`${day}T00:00:00.000Z`);
}

/**
 * Mang 12 he so gia, moi thang mot he so: thang dep = cao diem, ke ben = giap
 * mua, con lai thap diem. Nhan tour hoac mang bestTimeToVisit.
 */
function buildSeasonFactors(tourOrBestMonths = []) {
  const bestTimeToVisit = Array.isArray(tourOrBestMonths)
    ? tourOrBestMonths
    : (tourOrBestMonths?.bestTimeToVisit || []);
  const peak = new Set(bestTimeToVisit.map(monthIndex).filter(i => i >= 0));

  const shoulder = new Set();
  for (const m of peak) {
    shoulder.add((m + 11) % 12);
    shoulder.add((m + 1) % 12);
  }

  return MONTHS.map((_, i) => {
    if (peak.has(i)) return PEAK;
    if (shoulder.has(i)) return SHOULDER;
    // Khong phai mua dep va cung khong giap mua -> thap diem
    return peak.size ? LOW : 1.0;
  });
}

/** Lam tron den boi so 10 cho giong bang gia that. */
const round10 = (v) => Math.round(v / 10) * 10;

/** Ten mua de hien cho khach. */
function seasonLabel(factor) {
  if (factor === PEAK) return 'peak';
  if (factor === SHOULDER) return 'shoulder';
  if (factor === LOW) return 'low';
  return 'regular';
}

/**
 * Gia nguoi lon cho mot ngay khoi hanh.
 *
 * Uu tien chuyen co san trong lich (availability) trung ngay - do la gia khach
 * da thay tren man hinh. Ngay khong co trong lich (trang dat tour hien cho chon
 * ngay tu do) thi tinh theo thang bang dung cong thuc da sinh ra lich, nen hai
 * cach cho cung mot ket qua.
 *
 * @returns {{ adultPrice, factor, season, departure }} departure = chuyen trong
 *          lich neu trung ngay, nguoc lai null
 */
function priceForDeparture(tour, departureDate) {
  const base = tour.pricing?.adult || tour.estimatedCost || 0;
  if (!departureDate || Number.isNaN(new Date(departureDate).getTime())) {
    return { adultPrice: base, factor: 1, season: 'regular', departure: null };
  }

  const factor = buildSeasonFactors(tour)[calendarMonth(departureDate)];
  const day = calendarDay(departureDate);
  const departure = (tour.availability || []).find(a => calendarDay(a.startDate) === day) || null;

  const adultPrice = departure?.price || round10(base * factor);
  return { adultPrice, factor, season: seasonLabel(factor), departure };
}

module.exports = {
  MONTHS, PEAK, SHOULDER, LOW,
  monthIndex, calendarMonth, calendarDay, toCalendarDate, buildSeasonFactors, round10, seasonLabel,
  priceForDeparture
};
