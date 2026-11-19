// backend/chat/ingestion_graph/graph.js
//
// Tuong ung src/ingestion_graph/graph.ts cua repo mau ai-pdf-chatbot-langchain:
// nap tai lieu -> cat doan -> embedding -> luu. Khac repo mau: nguon la DU LIEU
// CMP Travel (Tour, Poi, Blog, hang so chinh sach trong code) thay vi PDF, va
// luu vao MongoDB (collection chat_chunks) thay vi Supabase.
//
// Gia / ngay khoi hanh / so ghe KHONG dua vao day - chung thay doi lien tuc,
// chatbot lay qua cong cu. O day chi co noi dung it doi.
//
// Chay: node scripts/build-chat-index.js [--tour <id>] [--no-embed]

const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const Tour = require('../../models/Tour');
const Poi = require('../../models/Poi');
const Blog = require('../../models/Blog');
const ChatChunk = require('../../models/ChatChunk');
const { AGE_BANDS, CHILD_RATE, INFANT_RATE, GROUP_MIN_GUESTS } = require('../../services/pricingService');
const { REFUND_STEPS } = require('../../services/refundService');
const { VIP_TIERS } = require('../../services/vipService');
const config = require('../shared/configuration');
const { getEmbedder } = require('../shared/retrieval');

const IngestState = Annotation.Root({
  tourId: Annotation(),          // chi danh lai 1 tour (admin vua luu); trong = danh lai tat ca
  embed: Annotation(),           // false = bo qua embedding (chua co key)
  docs: Annotation(),            // [{ source, refId, title, text, link }]
  chunks: Annotation(),
  stats: Annotation()
});

const tourLink = (id) => `detail.html?id=${id}`;
const lines = (arr) => (arr || []).filter(Boolean).join('; ');

/** Tai lieu tu 1 tour: tong quan, lich trinh, FAQ/chinh sach, diem tham quan. */
function tourDocs(t, pois) {
  const id = String(t._id);
  const docs = [{
    source: 'tour', refId: id, title: `${t.name}, ${t.country} - overview`, link: tourLink(id),
    text: [
      `${t.name} (${t.country}) is a ${t.durationDays}-day tour.`,
      t.description, t.longDescription,
      t.highlights?.length && `Highlights: ${lines(t.highlights)}.`,
      `Best months to visit: ${lines(t.bestTimeToVisit) || 'all year'}.`,
      `Pace: ${t.pace || 'balanced'}. Physical level ${t.physicalLevel || 2}/5. Minimum age ${t.minAge || 0}.`,
      t.suitableFor?.length && `Suitable for: ${lines(t.suitableFor)}.`,
      t.themes?.length && `Themes: ${lines(t.themes)}.`,
      t.food?.length && `Local food to try: ${lines(t.food)}.`,
      t.inclusions?.length && `Included: ${lines(t.inclusions)}.`,
      t.exclusions?.length && `Not included: ${lines(t.exclusions)}.`,
      t.whatToBring?.length && `What to bring: ${lines(t.whatToBring)}.`
    ].filter(Boolean).join('\n')
  }];

  if (t.itinerary?.length) {
    docs.push({
      source: 'itinerary', refId: id, title: `${t.name} - day-by-day itinerary`, link: tourLink(id),
      text: t.itinerary.map(d => `Day ${d.day}: ${d.title}. ${d.description || ''} Activities: ${lines(d.activities)}. Meals: ${lines(d.meals)}.`).join('\n')
    });
  }
  const faq = (t.faq || []).map(f => `Q: ${f.question}\nA: ${f.answer}`);
  const policies = t.policies && typeof t.policies === 'object'
    ? Object.entries(t.policies).filter(([, v]) => typeof v === 'string' && v).map(([k, v]) => `${k}: ${v}`) : [];
  if (faq.length || policies.length) {
    docs.push({ source: 'faq', refId: id, title: `${t.name} - FAQ`, link: tourLink(id), text: [...faq, ...policies].join('\n') });
  }
  if (pois.length) {
    docs.push({
      source: 'poi', refId: id, title: `${t.name} - attractions`, link: tourLink(id),
      text: pois.map(p => `${p.name} (${p.category}${p.unesco ? ', UNESCO' : ''}): ${p.description || ''} Typical visit ${p.visitMinutes} min.`).join('\n')
    });
  }
  return docs;
}

/** Chinh sach chung, sinh tu HANG SO trong code (khong go tay -> khong lech). */
function policyDocs() {
  const pct = (r) => `${Math.round(r * 100)}%`;
  const refund = REFUND_STEPS.map(([days, rate], i) => {
    const upper = i ? REFUND_STEPS[i - 1][0] - 1 : null;
    return `${upper ? `${days}-${upper}` : `${days}+`} days before departure: ${pct(rate)} refund`;
  });
  return [
    {
      source: 'policy', refId: 'policy:refund', title: 'Cancellation and refund policy', link: 'my-bookings.html',
      text: `Customers can cancel upcoming bookings in My Bookings. Bookings paid with the CMP wallet are refunded to the wallet: ${refund.join('; ')}. ` +
        'If CMP Travel cancels, the refund is 100%. Payments made outside the wallet are refunded by support. ' +
        'In a Smart Tour combined trip each tour is cancelled separately.'
    },
    {
      source: 'policy', refId: 'policy:pricing', title: 'Prices, age bands and group discount', link: 'destination.html',
      text: `Tour prices depend on the departure season. Age bands: infant ${AGE_BANDS.infant.minAge}-${AGE_BANDS.infant.maxAge} years pays ${pct(INFANT_RATE)} ` +
        `of the adult price and does not take a seat; child ${AGE_BANDS.child.minAge}-${AGE_BANDS.child.maxAge} years pays ${pct(CHILD_RATE)}; ` +
        `from ${AGE_BANDS.child.maxAge + 1} years pays the adult price. Groups of ${GROUP_MIN_GUESTS}+ paying guests (adults + children) ` +
        'get the group discount set for that tour. The price includes the standard hotel; a higher hotel tier costs extra.'
    },
    {
      source: 'policy', refId: 'policy:vip', title: 'VIP membership', link: 'profile.html',
      text: 'VIP level depends on total amount paid: ' + Object.values(VIP_TIERS).map(t => `${t.name} from $${t.minSpent.toLocaleString('en-US')} (${t.discount}% off tours)`).join('; ') +
        '. The VIP discount is applied automatically when booking.'
    },
    {
      source: 'policy', refId: 'policy:smart-tour', title: 'Smart Tour and combined trips', link: 'smart-tour.html',
      text: 'Smart Tour suggests one tour or 2-3 connected tours for your dates, days, budget and interests. A combined trip is booked and paid ' +
        'in one go; the flight/train between cities and any connection night are included in the price. Tours can only start on scheduled departures.'
    }
  ];
}

// ---------------------------------------------------------------- cac buoc (node)

async function loadDocuments(state) {
  const filter = state.tourId ? { _id: state.tourId } : { status: { $ne: 'inactive' } };
  const tours = await Tour.find(filter).lean();
  const pois = await Poi.find({ tourId: { $in: tours.map(t => t._id) } }).sort({ 'popularity.rank': 1 }).lean();
  const poisByTour = {};
  pois.forEach(p => { (poisByTour[String(p.tourId)] = poisByTour[String(p.tourId)] || []).push(p); });

  const docs = tours.flatMap(t => tourDocs(t, (poisByTour[String(t._id)] || []).slice(0, 25)));
  if (!state.tourId) {
    const blogs = await Blog.find({ status: { $ne: 'draft' } }).lean();
    blogs.forEach(b => docs.push({
      source: 'blog', refId: String(b._id), title: b.title, link: `blog-detail.html?id=${b._id}`,
      text: `${b.title}\n${b.excerpt || ''}\n${String(b.content || '').replace(/<[^>]+>/g, ' ').replace(/[#*_>`]/g, '')}`
    }));
    docs.push(...policyDocs());
  }
  return { docs };
}

/** Cat theo doan / cau, toi da config.chunkChars ky tu, giu tieu de o moi doan. */
function splitChunks(state) {
  const max = config.chunkChars;
  const chunks = [];
  for (const d of state.docs) {
    const parts = d.text.split(/\n+/).flatMap(p => (p.length > max ? p.match(new RegExp(`[^.!?]{1,${max}}[.!?]?`, 'g')) : [p]));
    let buf = '';
    const flush = () => { if (buf.trim()) chunks.push({ ...d, text: `${d.title}\n${buf.trim()}` }); buf = ''; };
    for (const p of parts) {
      if (buf.length + p.length > max) flush();
      buf += `${p}\n`;
    }
    flush();
  }
  return { chunks };
}

async function embedChunks(state) {
  const emb = state.embed === false ? null : getEmbedder();
  if (!emb) return { stats: { embedded: 0 } };
  const vectors = await emb.embedDocuments(state.chunks.map(c => c.text));
  return { chunks: state.chunks.map((c, i) => ({ ...c, embedding: vectors[i] })), stats: { embedded: vectors.length } };
}

async function storeChunks(state) {
  // Thay het doan cu cua pham vi nay (1 tour hoac toan bo) -> khong con doan mo coi
  const refIds = [...new Set(state.docs.map(d => d.refId))];
  const scope = state.tourId ? { refId: { $in: refIds } } : {};
  const removed = await ChatChunk.deleteMany(scope);
  if (state.chunks.length) await ChatChunk.insertMany(state.chunks);
  return {
    stats: {
      ...state.stats, documents: state.docs.length, chunks: state.chunks.length, removed: removed.deletedCount,
      bySource: state.chunks.reduce((m, c) => ({ ...m, [c.source]: (m[c.source] || 0) + 1 }), {})
    }
  };
}

const graph = new StateGraph(IngestState)
  .addNode('loadDocuments', loadDocuments)
  .addNode('splitChunks', splitChunks)
  .addNode('embedChunks', embedChunks)
  .addNode('storeChunks', storeChunks)
  .addEdge(START, 'loadDocuments')
  .addEdge('loadDocuments', 'splitChunks')
  .addEdge('splitChunks', 'embedChunks')
  .addEdge('embedChunks', 'storeChunks')
  .addEdge('storeChunks', END)
  .compile();

module.exports = { graph, tourDocs, policyDocs };
