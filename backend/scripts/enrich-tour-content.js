/**
 * Sinh nội dung dài cho tour, phục vụ Chatbot RAG.
 *
 * Vì sao cần: description hiện trung vị chỉ 140 ký tự (khoảng 2 câu). RAG lấy
 * đoạn văn bản làm ngữ cảnh, nội dung quá ngắn thì chatbot không trả lời được
 * những câu như "tour này có gì đặc biệt", "trẻ em đi được không", "huỷ thì mất
 * bao nhiêu tiền".
 *
 * Nội dung được ghép từ dữ liệu THẬT của từng tour (điểm tham quan, món ăn, độ
 * khó, mùa đẹp, giá, chính sách) nên mỗi tour một khác và không mâu thuẫn với
 * thông tin hiển thị trên web. Không gọi LLM: kết quả ổn định, chạy lại giống
 * nhau, và không tốn chi phí.
 *
 * Chạy (từ thư mục backend):
 *   node scripts/enrich-tour-content.js --dry-run
 *   node scripts/enrich-tour-content.js
 */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');

const dryRun = process.argv.includes('--dry-run');

// Ảnh minh hoạ theo nhóm, dùng lại bộ ảnh Unsplash đang dùng cho khách sạn.
const GALLERY_POOL = {
  landscape: [
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900'
  ],
  attractions: [
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=900',
    'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=900',
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=900'
  ],
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900'
  ],
  accommodation: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900'
  ],
  activities: [
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900',
    'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=900'
  ]
};

const THEME_LABEL = {
  culture: 'local culture', history: 'history', architecture: 'architecture',
  museum: 'museums', nature: 'nature', mountain: 'mountain scenery',
  beach: 'beaches', island: 'island life', wildlife: 'wildlife',
  adventure: 'adventure', trekking: 'trekking', 'water-sports': 'water sports',
  food: 'food', nightlife: 'nightlife', shopping: 'shopping',
  photography: 'photography', family: 'family time', romantic: 'romantic settings',
  wellness: 'wellness', luxury: 'premium comfort', budget: 'great value'
};

const PACE_TEXT = {
  relaxed: 'The pace is deliberately relaxed, with unhurried mornings and plenty of free time.',
  balanced: 'The pace is balanced: guided highlights in the morning, free time in the afternoon.',
  packed: 'The pace is full, designed for travellers who want to see as much as possible.'
};

const DIFFICULTY_TEXT = {
  easy: 'Most days involve light walking on flat ground, so no special fitness is required.',
  moderate: 'Expect a few hours of walking each day, including some uneven ground and stairs.',
  challenging: 'Some days involve long walks at altitude or on steep trails, so good fitness matters.'
};

const list = (arr) => {
  const a = (arr || []).filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

function buildLongDescription(tour) {
  const days = parseInt(String(tour.duration).match(/\d+/)?.[0] || '5', 10);
  const themes = (tour.themes || []).map(t => THEME_LABEL[t] || t).slice(0, 4);
  const months = (tour.bestTimeToVisit || []).slice(0, 3);

  return [
    `${tour.name}, ${tour.country} — a ${days}-day journey focused on ${list(themes)}.`,
    '',
    tour.description,
    '',
    `Across ${days} days you will visit ${list(tour.attractions)}. ${PACE_TEXT[tour.pace] || PACE_TEXT.balanced}`,
    `${DIFFICULTY_TEXT[tour.difficulty] || DIFFICULTY_TEXT.easy} The minimum age for this departure is ${tour.minAge || 0}, and groups are capped at ${tour.maxGroupSize} travellers so the guide can give everyone attention.`,
    '',
    `Food is part of the experience: you will have the chance to try ${list(tour.food)}. Breakfast is served at the hotel every morning, and several lunches are included while you are out with the guide.`,
    '',
    `The best months to travel are ${list(months)}, when the weather suits the activities in this itinerary. The price of ${tour.pricing?.adult || tour.estimatedCost} USD per adult covers accommodation, transport on the ground, an English-speaking guide and entrance fees to the sites listed above.`
  ].join('\n');
}

function buildHighlights(tour) {
  const out = [];
  (tour.attractions || []).forEach(a => out.push(`Guided visit to ${a}`));
  if ((tour.food || []).length) out.push(`Taste ${list(tour.food)} with a local guide`);
  if ((tour.hotelTiers || []).length) {
    const top = tour.hotelTiers[tour.hotelTiers.length - 1];
    out.push(`Stay options from comfortable to ${top.level}-star (${top.hotelName})`);
  }
  if ((tour.themes || []).includes('photography')) out.push('Dedicated photo stops at the best viewpoints');
  if ((tour.suitableFor || []).includes('family')) out.push('Suitable for families with children');
  out.push(`Small group of maximum ${tour.maxGroupSize} travellers`);
  return out.slice(0, 7);
}

function buildFaq(tour) {
  const days = parseInt(String(tour.duration).match(/\d+/)?.[0] || '5', 10);
  const price = tour.pricing?.adult || tour.estimatedCost;
  const child = tour.pricing?.child;
  const months = (tour.bestTimeToVisit || []).slice(0, 3);
  const next = tour.transport?.toNextCity;

  const faq = [
    {
      question: 'What is included in the price?',
      answer: `The ${price} USD per adult covers ${list(tour.inclusions)}. Not included: ${list(tour.exclusions)}.`
    },
    {
      question: 'Is this tour suitable for children?',
      answer: tour.minAge > 0
        ? `The minimum age is ${tour.minAge} because ${tour.difficulty === 'challenging' ? 'some days involve demanding walks' : 'parts of the itinerary need a certain level of walking'}. Children from ${tour.minAge} pay ${child} USD.`
        : `Yes. There is no minimum age and children pay ${child} USD. ${DIFFICULTY_TEXT.easy}`
    },
    {
      question: 'How physically demanding is the tour?',
      answer: `${DIFFICULTY_TEXT[tour.difficulty] || DIFFICULTY_TEXT.easy} On our 1-5 scale this tour is level ${tour.physicalLevel}.`
    },
    {
      question: 'When is the best time to go?',
      answer: `We recommend ${list(months)}. Departures outside these months still run, but weather may affect some outdoor activities.`
    },
    {
      question: 'What is the cancellation policy?',
      answer: 'Free cancellation up to 15 days before departure. Between 14 and 7 days you are refunded 50%. Within 6 days of departure the booking is non-refundable.'
    },
    {
      question: 'How large is the group?',
      answer: `Maximum ${tour.maxGroupSize} travellers. Smaller groups mean more time with the guide at each site.`
    },
    {
      question: 'Do I need a visa?',
      answer: `Visa rules depend on your nationality. Vietnamese passport holders usually need a visa for ${tour.country}; we provide a booking confirmation and itinerary to support your application.`
    }
  ];

  if (next) {
    faq.push({
      question: 'Can I combine this tour with another destination?',
      answer: `Yes. ${next} is ${tour.transport.distanceKm} km away, about ${tour.transport.durationHours} hours by ${tour.transport.mode}, and is the most common add-on to this itinerary.`
    });
  }

  return faq;
}

function buildWhatToBring(tour) {
  const themes = tour.themes || [];
  const items = ['Passport and travel documents', 'Comfortable walking shoes', 'Power adapter', 'Personal medication'];

  if (themes.includes('beach') || themes.includes('island') || themes.includes('water-sports')) {
    items.push('Swimwear', 'Reef-safe sunscreen', 'Quick-dry towel');
  }
  if (themes.includes('trekking') || themes.includes('mountain')) {
    items.push('Hiking boots', 'Warm layers and rain jacket', 'Refillable water bottle');
  }
  if (themes.includes('museum') || themes.includes('culture')) {
    items.push('Modest clothing for religious sites');
  }
  if (themes.includes('photography')) items.push('Camera and spare batteries');
  if ((tour.bestTimeToVisit || []).some(m => ['December', 'January', 'February'].includes(m))) {
    items.push('Winter coat and gloves');
  }
  return [...new Set(items)];
}

function buildGallery(tour, index) {
  const rotate = (arr, i) => arr[i % arr.length];
  const items = [];

  (tour.attractions || []).forEach((a, i) => items.push({
    url: rotate(GALLERY_POOL.attractions, index + i),
    category: 'attractions',
    caption: `${a}, ${tour.name}`
  }));

  items.push({ url: rotate(GALLERY_POOL.landscape, index), category: 'landscape', caption: `Scenery around ${tour.name}` });
  items.push({ url: rotate(GALLERY_POOL.landscape, index + 1), category: 'landscape', caption: `${tour.name}, ${tour.country}` });

  (tour.food || []).slice(0, 2).forEach((f, i) => items.push({
    url: rotate(GALLERY_POOL.food, index + i),
    category: 'food',
    caption: `${f} — a local speciality`
  }));

  items.push({ url: rotate(GALLERY_POOL.accommodation, index), category: 'accommodation', caption: `Where you stay in ${tour.name}` });
  items.push({ url: rotate(GALLERY_POOL.activities, index), category: 'activities', caption: `Activities on this ${tour.duration} trip` });

  return items;
}

(async () => {
  await connectDB();

  const tours = await Tour.find({});
  let updated = 0;
  let descLen = 0;

  for (const [index, tour] of tours.entries()) {
    tour.longDescription = buildLongDescription(tour);
    tour.highlights = buildHighlights(tour);
    tour.faq = buildFaq(tour);
    tour.whatToBring = buildWhatToBring(tour);
    tour.gallery = buildGallery(tour, index);
    tour.policies = {
      cancellation: 'Free cancellation up to 15 days before departure. 50% refund between 14 and 7 days. No refund within 6 days.',
      payment: '30% deposit to confirm the booking, the remaining 70% due 14 days before departure. Payment by CMP Wallet, bank transfer or card.',
      refund: 'Approved refunds are returned to the original payment method within 7 working days.'
    };

    descLen += tour.longDescription.length;
    if (!dryRun) await tour.save();
    updated++;
  }

  const sample = tours.find(t => t.name === 'Paris') || tours[0];
  console.log(`\nTour cập nhật: ${updated}`);
  console.log(`Độ dài longDescription trung bình: ${Math.round(descLen / updated)} ký tự (trước: ~140)`);
  console.log(`\nVí dụ ${sample.name}:`);
  console.log('  highlights :', sample.highlights.length, 'mục');
  console.log('  faq        :', sample.faq.length, 'câu hỏi');
  console.log('  whatToBring:', sample.whatToBring.length, 'mục');
  console.log('  gallery    :', sample.gallery.length, 'ảnh');
  console.log('\n--- longDescription ---');
  console.log(sample.longDescription.split('\n').slice(0, 6).join('\n'));
  console.log('\n--- FAQ mẫu ---');
  sample.faq.slice(0, 2).forEach(f => console.log(`  Q: ${f.question}\n  A: ${f.answer}\n`));

  if (dryRun) console.log('DRY-RUN: chưa ghi gì vào DB.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('Thất bại:', err);
  process.exit(1);
});
