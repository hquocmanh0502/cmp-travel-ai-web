// backend/chat/shared/tools.js
//
// Cong cu cua chatbot. Moi con so (gia, ghe, ngay, % hoan tien) deu lay tu
// CHINH code web dang chay - pricingService, smartTourService, refundService,
// Tour.availability - nen chatbot khong bao gio noi khac trang dat tour.
//
// Moi cong cu = { name, description, schema (zod), run(args, ctx) }.
// ctx = { userId } (null neu khach chua dang nhap). run() tra ve object JSON
// gon de dua cho LLM; cards[] (neu co) duoc giao dien hien thanh the tour/chuyen.

const { z } = require('zod');
const Tour = require('../../models/Tour');
const Booking = require('../../models/Booking');
const Blog = require('../../models/Blog');
const { SITE_GUIDE } = require('../../config/site-guide');
const { calculateBookingPrice, ageBand } = require('../../services/pricingService');
const { calendarDay, priceForDeparture } = require('../../services/seasonalPricing');
const { planTrip } = require('../../services/smartTourService');
const { refundRate, REFUND_STEPS } = require('../../services/refundService');
const { searchKnowledge } = require('./retrieval');

const LIVE = { status: { $ne: 'inactive' } };
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tourLink = (id, day) => `detail.html?id=${id}${day ? `&departure=${day}` : ''}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Tim tour theo ten (khong phan biet hoa thuong) hoac id. */
async function findTour(tourRef) {
  const ref = String(tourRef || '').trim();
  if (!ref) return null;
  if (/^[0-9a-f]{24}$/i.test(ref)) return Tour.findOne({ _id: ref, ...LIVE }).lean();
  return (await Tour.findOne({ name: new RegExp(`^${escapeRegex(ref)}$`, 'i'), ...LIVE }).lean())
    || Tour.findOne({ name: new RegExp(escapeRegex(ref), 'i'), ...LIVE }).lean();
}

/** Tuoi tung tre -> so nguoi lon / tre em / em be theo dung khung tuoi cua web. */
function partyFrom(adults, childAges = []) {
  const ages = (childAges || []).map(Number).filter(a => a >= 0 && a <= 17);
  const teens = ages.filter(a => ageBand(a) === 'adult').length;
  return {
    adults: Math.max(1, (parseInt(adults, 10) || 1) + teens),
    children: ages.filter(a => ageBand(a) === 'child').length,
    infants: ages.filter(a => ageBand(a) === 'infant').length
  };
}

/** The tour cho khung chat (anh, danh gia, chu de, diem noi bat). */
const tourCard = (t, extra = {}) => ({
  type: 'tour', tourId: String(t._id), name: t.name, country: t.country, img: t.img,
  days: t.durationDays, fromPrice: t.pricing?.adult || t.estimatedCost, rating: t.rating,
  themes: (t.themes || []).slice(0, 3), highlights: (t.highlights || []).slice(0, 2).map(h => h.replace(/^Guided visit to /, '')),
  link: tourLink(t._id), ...extra
});

const notFound = (ref) => ({ error: `No tour found for "${ref}". Use search_tours to find the right name.` });

// ---------------------------------------------------------------- cong cu

const search_tours = {
  name: 'search_tours',
  description: 'Find tours by free text (city, country, region, activity), theme, budget or length. ' +
    'Returns up to 6 tours with "from" prices (adult, regular season). Use get_departures / quote_price for exact prices.',
  schema: z.object({
    query: z.string().optional().describe('City, country, region or keyword, e.g. "Japan", "beach", "Europe"'),
    theme: z.string().optional().describe('One theme, e.g. beach, culture, food, nature, nightlife, history'),
    maxAdultPrice: z.number().optional().describe('Max adult price in USD'),
    maxDays: z.number().optional(),
    minDays: z.number().optional()
  }),
  async run({ query, theme, maxAdultPrice, maxDays, minDays }) {
    const filter = { ...LIVE };
    if (query) {
      const rx = new RegExp(escapeRegex(query), 'i');
      filter.$or = [{ name: rx }, { country: rx }, { description: rx }, { tags: rx }, { themes: rx }];
    }
    if (theme) filter.themes = new RegExp(`^${escapeRegex(theme)}$`, 'i');
    if (maxAdultPrice) filter['pricing.adult'] = { $lte: maxAdultPrice };
    if (maxDays || minDays) filter.durationDays = { ...(minDays ? { $gte: minDays } : {}), ...(maxDays ? { $lte: maxDays } : {}) };
    const tours = await Tour.find(filter, {
      name: 1, country: 1, durationDays: 1, pricing: 1, estimatedCost: 1, themes: 1, rating: 1, img: 1, bestTimeToVisit: 1, highlights: 1
    }).sort({ rating: -1 }).limit(6).lean();
    return {
      count: tours.length,
      tours: tours.map(t => ({
        tourId: String(t._id), name: t.name, country: t.country, days: t.durationDays,
        fromAdultPrice: t.pricing?.adult || t.estimatedCost, themes: t.themes, rating: t.rating,
        bestMonths: t.bestTimeToVisit, link: tourLink(t._id)
      })),
      cards: tours.map(tourCard)
    };
  }
};

const get_tour = {
  name: 'get_tour',
  description: 'Details of one tour: day-by-day itinerary, hotel, what is included / not included, ' +
    'physical level, minimum age, best months, FAQ. Accepts the tour name (e.g. "Kyoto") or tourId.',
  schema: z.object({ tour: z.string().describe('Tour name or tourId') }),
  async run({ tour }) {
    const t = await findTour(tour);
    if (!t) return notFound(tour);
    return {
      tourId: String(t._id), name: t.name, country: t.country, days: t.durationDays,
      adultPriceRegularSeason: t.pricing?.adult, pace: t.pace, physicalLevel: `${t.physicalLevel || 2}/5`,
      minAge: t.minAge || 0, suitableFor: t.suitableFor, bestMonths: t.bestTimeToVisit,
      highlights: (t.highlights || []).slice(0, 8),
      itinerary: (t.itinerary || []).map(d => ({ day: d.day, title: d.title, activities: (d.activities || []).slice(0, 5), meals: d.meals })),
      included: t.inclusions, notIncluded: t.exclusions, food: t.food,
      faq: (t.faq || []).slice(0, 5).map(f => ({ q: f.question, a: f.answer })),
      link: tourLink(t._id),
      // The lon co dai anh (gallery that cua tour)
      cards: [tourCard(t, {
        gallery: (t.gallery || []).map(g => g.url).filter(Boolean).slice(0, 4),
        minAge: t.minAge || 0, pace: t.pace
      })]
    };
  }
};

const get_departures = {
  name: 'get_departures',
  description: 'Scheduled departures of a tour with real seats left and seasonal adult price. ' +
    'Only these dates can be booked. Optional date range and group size.',
  schema: z.object({
    tour: z.string().describe('Tour name or tourId'),
    from: z.string().optional().describe('YYYY-MM-DD, default today'),
    to: z.string().optional().describe('YYYY-MM-DD'),
    seatsNeeded: z.number().optional().describe('Adults + children (infants do not take seats)')
  }),
  async run({ tour, from, to, seatsNeeded = 1 }) {
    const t = await findTour(tour);
    if (!t) return notFound(tour);
    const start = from && from > today() ? from : today();
    const rows = (t.availability || [])
      .map(a => ({ a, day: calendarDay(a.startDate) }))
      .filter(({ day }) => day > start && (!to || day <= to))
      .sort((x, y) => x.day.localeCompare(y.day));
    const departures = rows.slice(0, 8).map(({ a, day }) => ({
      startDate: day, endDate: calendarDay(a.endDate), adultPrice: a.price,
      season: priceForDeparture(t, a.startDate).season, seatsLeft: a.availableSlots || 0,
      enoughSeats: (a.availableSlots || 0) >= seatsNeeded
    }));
    return {
      tourId: String(t._id), tour: t.name, days: t.durationDays, totalInRange: rows.length, departures,
      cards: departures.filter(d => d.enoughSeats).slice(0, 4).map(d => ({
        type: 'departure', tourId: String(t._id), name: t.name, img: t.img, startDate: d.startDate, endDate: d.endDate,
        adultPrice: d.adultPrice, seatsLeft: d.seatsLeft, link: tourLink(t._id, d.startDate)
      }))
    };
  }
};

const quote_price = {
  name: 'quote_price',
  description: 'Exact price for a group on one departure date, computed by the same code used at booking ' +
    '(season and age bands: under 2 infant, 2-11 child, 12+ adult; any group discount the tour has). ' +
    'Before VIP member discount. Use it also to check whether a group discount applies.',
  schema: z.object({
    tour: z.string().describe('Tour name or tourId'),
    departureDate: z.string().describe('YYYY-MM-DD, must be a scheduled departure (see get_departures)'),
    adults: z.number().describe('Number of adults'),
    childAges: z.array(z.number()).optional().describe('Age of each child, e.g. [5, 1]')
  }),
  async run({ tour, departureDate, adults, childAges }) {
    const t = await findTour(tour);
    if (!t) return notFound(tour);
    const dep = (t.availability || []).find(a => calendarDay(a.startDate) === departureDate);
    if (!dep) return { error: `${t.name} has no departure on ${departureDate}. Call get_departures for valid dates.` };
    const party = partyFrom(adults, childAges);
    const q = calculateBookingPrice(t, { ...party, departureDate });
    const seats = party.adults + party.children;
    return {
      tourId: String(t._id), tour: t.name, departureDate, endDate: calendarDay(dep.endDate), season: q.season,
      guests: party, perPerson: { adult: q.adultPrice, child: q.childPrice, infant: q.infantPrice },
      groupDiscount: q.groupDiscount, total: q.subtotal, currency: 'USD',
      seatsLeft: dep.availableSlots || 0, enoughSeats: (dep.availableSlots || 0) >= seats,
      note: 'Standard hotel included. VIP members get their discount at checkout.',
      cards: [{
        type: 'departure', tourId: String(t._id), name: t.name, img: t.img, startDate: departureDate,
        endDate: calendarDay(dep.endDate), total: q.subtotal, seatsLeft: dep.availableSlots || 0,
        link: tourLink(t._id, departureDate)
      }]
    };
  }
};

const plan_trip = {
  name: 'plan_trip',
  description: 'Smart Tour planner: best trips (one tour or 2-3 connected tours) for a date window, ' +
    'number of days, budget per person and group. Same engine as the Smart Tour page. ' +
    'Use mustInclude for EVERY city the customer said they love or want ("I love Maldives", "Paris then Rome"), also from earlier messages. ' +
    'If budget, dates or days are not given, assume a generous budget (e.g. 15000), a window starting in 2 weeks for 60 days and 10 days, and say so. ' +
    'If the named cities do not fit, the tool adds days or relaxes the rule itself and explains it in "adjusted" - tell the customer.',
  schema: z.object({
    startFrom: z.string().describe('Earliest departure YYYY-MM-DD'),
    startTo: z.string().optional().describe('Latest departure YYYY-MM-DD (default +30 days)'),
    days: z.number().optional().describe('Total trip days (default 10)'),
    budget: z.number().describe('Budget per person in USD'),
    adults: z.number(),
    childAges: z.array(z.number()).optional(),
    interests: z.array(z.string()).optional().describe('e.g. beach, art, nature, food, history, nightlife'),
    maxTours: z.number().optional().describe('1 = single tour only, up to 3'),
    pace: z.enum(['relaxed', 'balanced', 'packed']).optional().describe('relaxed if they dislike rushing, packed if they want to see as much as possible'),
    mustInclude: z.array(z.string()).optional().describe('Tour/city names that must be in the trip, max 3'),
    mustMode: z.enum(['all', 'any']).optional().describe('all = every named city, any = at least one')
  }),
  async run(args) {
    // Ten thanh pho -> tourId (Smart Tour nhan id)
    const mustTours = [];
    for (const name of (args.mustInclude || []).slice(0, 3)) {
      const t = await findTour(name);
      if (!t) return { error: `CMP Travel has no tour for "${name}". Use search_tours to see available cities.` };
      mustTours.push(t);
    }
    const input = { ...args, days: args.days || 10, mustInclude: mustTours.map(t => String(t._id)) };
    let r;
    let adjusted = null;
    try {
      r = await planTrip(input);
      // Thanh pho khach chon khong vua: KHONG bo noi khach yeu thich.
      //   1. giu du ca cac noi, them ngay (Maldives + Paris can ~12 ngay: chang bay
      //      dai -> them dem noi chuyen)
      //   2. van khong duoc: bot dan cac noi PHIA SAU, luon giu noi nhac DAU TIEN
      //      (truoc day noi thanh "it nhat 1 noi" -> co chuyen giu Paris bo Maldives)
      if (!r.plans.length && mustTours.length) {
        const names = mustTours.map(t => t.name).join(' and ');
        for (let extra = 1; extra <= 5 && input.days + extra <= 30 && !adjusted; extra++) {
          const longer = await planTrip({ ...input, days: input.days + extra });
          if (longer.plans.length) {
            adjusted = `${names} do not fit in ${input.days} days; showing ${input.days + extra}-day trips that include them.`;
            r = longer;
          }
        }
        for (let keep = mustTours.length - 1; keep >= 1 && !adjusted; keep--) {
          const kept = mustTours.slice(0, keep);
          const fewer = await planTrip({ ...input, mustInclude: kept.map(t => String(t._id)), mustMode: 'all' });
          if (fewer.plans.length) {
            adjusted = `${names} cannot all fit together in these dates; showing trips with ${kept.map(t => t.name).join(' and ')}.`;
            r = fewer;
          }
        }
      }
    } catch (err) {
      if (err.status === 400) return { error: err.message };
      throw err;
    }

    // Link mo trang Smart Tour da dien san dung cac thong tin nay va tu chay (so sanh day du)
    const q = new URLSearchParams({ from: r.input.startFrom, to: r.input.startTo, days: r.input.days, budget: r.input.budget, adults: args.adults, run: '1' });
    if (args.childAges?.length) q.set('kids', args.childAges.join(','));
    if (r.input.interests.length) q.set('interests', r.input.interests.join(','));
    // r.input: dieu kien THAT da dung (sau khi them ngay / bot noi) -> trang Smart Tour ra cung ket qua
    if (r.input.mustInclude?.length) { q.set('must', r.input.mustInclude.join(',')); q.set('mode', r.input.mustMode); }
    if (args.maxTours) q.set('maxTours', String(r.input.maxTours));
    if (r.input.pace && r.input.pace !== 'any') q.set('pace', r.input.pace);
    const smartTourLink = `smart-tour.html?${q}`;
    const party = { adults: r.input.adults, children: r.input.children, infants: r.input.infants };

    const top = (r.plans.length ? r.plans : r.closest || []).slice(0, 3);
    return {
      plans: top.map(p => ({
        score: p.score, route: p.stops.map(s => s.name).join(' → '), startDay: p.startDay, endDay: p.endDay,
        totalDays: p.totalDays, costPerPerson: p.costPerPerson, totalCost: p.totalCost,
        reasons: p.reasons.slice(0, 3), warnings: p.warnings.slice(0, 3),
        stops: p.stops.map(s => ({ name: s.name, startDay: s.startDay, endDay: s.endDay }))
      })),
      adjusted, mustInclude: mustTours.map(t => t.name),
      totalCandidatesChecked: r.counts?.candidates, notes: r.notes, tips: r.tips,
      smartTourLink, isClosestOnly: !r.plans.length,
      // The day du: tung chang + chang noi + doan khach -> nut "Dat ca chuyen" (trip-booking.js)
      cards: top.map(p => ({
        type: 'plan', route: p.stops.map(s => s.name).join(' → '), score: p.score, level: p.level,
        startDay: p.startDay, endDay: p.endDay, totalDays: p.totalDays, totalCost: p.totalCost, costPerPerson: p.costPerPerson,
        reasons: p.reasons.slice(0, 2),
        stops: p.stops.map(s => ({ tourId: s.tourId, name: s.name, country: s.country, img: s.img, startDay: s.startDay, endDay: s.endDay, cost: s.cost, hotel: s.hotel, link: tourLink(s.tourId, s.startDay) })),
        connections: p.connections.map(c => ({ mode: c.mode, to: c.to, arriveDay: c.arriveDay, arriveAt: c.arriveAt, connectionNights: c.connectionNights, cost: c.cost })),
        party, smartTourLink,
        link: p.stops.length === 1 ? tourLink(p.stops[0].tourId, p.stops[0].startDay) : smartTourLink
      }))
    };
  }
};

const refund_policy = {
  name: 'refund_policy',
  description: 'Cancellation and refund rules for bookings paid with the CMP wallet. Call it for ANY cancellation ' +
    'or refund question, even without a date. Give daysBeforeDeparture ("cancel 20 days before") or departureDate ' +
    '(cancel today) to get the exact refund percentage.',
  schema: z.object({
    departureDate: z.string().optional().describe('YYYY-MM-DD'),
    daysBeforeDeparture: z.number().optional().describe('How many days before departure the customer cancels')
  }),
  async run({ departureDate, daysBeforeDeparture }) {
    const rules = REFUND_STEPS.map(([days, rate]) => ({ daysBeforeDepartureAtLeast: days, refundPercent: rate * 100 }));
    const out = { rules, adminCancellation: '100% refund when CMP Travel cancels', paidOutsideWallet: 'handled manually by support' };
    if (daysBeforeDeparture != null) {
      const rate = REFUND_STEPS.find(([min]) => daysBeforeDeparture >= min)?.[1] ?? 0;
      out.forDaysBefore = { daysBeforeDeparture, refundPercent: rate * 100 };
    }
    if (departureDate) {
      const daysLeft = Math.floor((new Date(`${departureDate}T00:00:00Z`) - new Date()) / 864e5);
      out.ifCancelledToday = { daysLeft, refundPercent: refundRate(`${departureDate}T00:00:00Z`) * 100 };
    }
    return out;
  }
};

const my_bookings = {
  name: 'my_bookings',
  description: "The signed-in customer's own bookings (tour, dates, status, payment, amount). Read only.",
  schema: z.object({}),
  async run(_args, ctx) {
    if (!ctx?.userId) return { error: 'The customer is not signed in. Ask them to sign in to see their bookings.' };
    const rows = await Booking.find({ userId: ctx.userId }).sort({ createdAt: -1 }).limit(10).lean();
    return {
      count: rows.length,
      bookings: rows.map(b => ({
        tour: b.tourName, departureDate: calendarDay(b.departureDate), endDate: calendarDay(b.checkoutDate),
        guests: { adults: b.adults, children: b.children, infants: b.infants },
        status: b.status, payment: b.paymentStatus, totalAmount: b.totalAmount,
        smartTourTrip: b.tripId ? `tour ${b.tripOrder} of a combined trip` : null
      })),
      link: 'my-bookings.html'
    };
  }
};

const search_knowledge = {
  name: 'search_knowledge',
  description: 'Search tour descriptions, itineraries, attractions, food, FAQ, policies and travel blog posts. ' +
    'Use for descriptive questions (what to see/eat, when to go, what to bring). Never for prices or seats.',
  schema: z.object({ query: z.string() }),
  async run({ query }) {
    const hits = await searchKnowledge(query, 5);
    // Doan van noi ve tour cu the -> kem the tour (anh, nut View tour) nhu get_tour
    const ids = [...new Set(hits
      .filter(h => ['tour', 'itinerary', 'faq', 'poi'].includes(h.source))
      .map(h => /[?&]id=([0-9a-f]{24})/i.exec(h.link || '')?.[1])
      .filter(Boolean))].slice(0, 2);
    const tours = ids.length ? await Tour.find({ _id: { $in: ids }, ...LIVE }).lean() : [];
    return {
      results: hits.map(h => ({ source: h.source, title: h.title, text: h.text, link: h.link })),
      cards: ids.map(id => tours.find(t => String(t._id) === id)).filter(Boolean).map(t => tourCard(t))
    };
  }
};

const site_help = {
  name: 'site_help',
  description: 'How to use the CMP Travel website: wallet top-up, paying, booking, cancelling, Smart Tour, '
    + 'my bookings, compare, wishlist, gallery, blog page, contact details (address, phone, email), about, account/login, VIP. '
    + 'Use for "how do I...", "where is...", "how to get to ... page", contact questions.',
  schema: z.object({ topic: z.string().describe('What the customer wants to do or find, in their words') }),
  async run({ topic }) {
    const q = String(topic || '').toLowerCase();
    const scored = SITE_GUIDE
      .map(g => ({ g, hits: g.keywords.filter(k => q.includes(k)).length }))
      .filter(x => x.hits)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3)
      .map(x => x.g);
    if (!scored.length) {
      // Khong khop -> dua muc luc de AI chon / noi khong co, khong bia trang
      return { matched: 0, pages: SITE_GUIDE.map(g => ({ title: g.title, link: g.link })) };
    }
    return {
      matched: scored.length,
      guides: scored.map(g => ({ title: g.title, steps: g.steps, link: g.link })),
      cards: scored.map(g => ({ type: 'link', title: g.title, text: g.steps[0], link: g.link, cta: 'Open page' }))
    };
  }
};

const search_blog = {
  name: 'search_blog',
  description: 'Find articles on the CMP Travel blog by place or topic (e.g. "Maldives", "Swiss Alps"). '
    + 'Returns article links, or found: 0 plus the list of existing articles when there is none. '
    + 'Use whenever the customer asks to READ about something / asks for blog posts.',
  schema: z.object({ query: z.string().optional().describe('Place or topic; empty = latest articles') }),
  async run({ query }) {
    const filter = { status: { $ne: 'draft' } };
    const q = String(query || '').trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { tags: rx }, { category: rx }, { excerpt: rx }];
    }
    const posts = await Blog.find(filter, { title: 1, excerpt: 1, category: 1, image: 1, thumbnail: 1, publishedDate: 1 })
      .sort({ publishedDate: -1 }).limit(5).lean();
    if (!posts.length) {
      const all = await Blog.find({ status: { $ne: 'draft' } }, { title: 1 }).sort({ publishedDate: -1 }).lean();
      return { found: 0, note: `No blog article about "${q}".`, existingArticles: all.map(b => b.title), blogPage: 'blog.html' };
    }
    const link = (b) => `blog-detail.html?id=${b._id}`;
    return {
      found: posts.length,
      articles: posts.map(b => ({ title: b.title, category: b.category, excerpt: (b.excerpt || '').slice(0, 200), link: link(b) })),
      cards: posts.map(b => ({ type: 'link', title: b.title, text: b.category || '', img: b.thumbnail || b.image, link: link(b), cta: 'Read article' }))
    };
  }
};

const TOOLS = [search_tours, get_tour, get_departures, quote_price, plan_trip, refund_policy, my_bookings, search_knowledge, site_help, search_blog];

module.exports = { TOOLS, partyFrom, findTour };
