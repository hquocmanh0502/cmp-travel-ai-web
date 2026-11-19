/**
 * Bo cau hoi kiem tra chatbot voi MODEL THAT (can OPENAI_API_KEY, ton vai cent).
 *
 *   node tests/chat/eval-live.test.js            # tat ca  (hoac: npm run test:chat:live)
 *   node tests/chat/eval-live.test.js 3 7        # chi cau so 3 va 7
 *
 * Moi cau kiem tra:
 *   - cong cu PHAI duoc goi (vd hoi gia -> quote_price)
 *   - buoc verify: moi so tien trong cau tra loi co trong ket qua cong cu
 *   - dung ngon ngu (hoi tieng Viet -> tra loi tieng Viet)
 *   - dieu kien rieng (expect)
 * Chay lai moi khi sua prompt, cong cu hoac du lieu.
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../../config/db');
const { HumanMessage } = require('@langchain/core/messages');
const { graph, textOf } = require('../../chat/retrieval_graph/graph');

const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const VI = /[ăâđêôơưàảãạáằẳẵặắầẩẫậấèẻẽẹéềểễệếìỉĩịíòỏõọóồổỗộốờởỡợớùủũụúừửữựứỳỷỹỵý]/i;

const CASES = [
  { q: 'How much is the Paris tour for 2 adults and a 5-year-old on the first available date?', tools: ['quote_price'] },
  { q: 'Tour Kyoto cho 2 người lớn giá bao nhiêu?', tools: ['quote_price'], vi: true },
  { q: 'Which dates can I join the Barcelona tour next month, we are 4 people?', tools: ['get_departures'] },
  { q: 'Tháng sau tour Santorini còn chỗ cho 3 người không?', tools: ['get_departures'], vi: true },
  { q: 'I have 10 days and $9,000 per person for 2 people, we love beaches. Where should we go?', tools: ['plan_trip'] },
  { q: 'Gợi ý chuyến đi 7 ngày, ngân sách 6000 đô mỗi người, thích văn hoá và ẩm thực, đi 2 người', tools: ['plan_trip'], vi: true },
  { q: 'Do you have tours in Japan?', tools: ['search_tours'], expect: (a) => /Tokyo|Kyoto|Osaka/.test(a) },
  { q: 'Có tour biển nào dưới 5 ngày không?', tools: ['search_tours'], vi: true },
  { q: 'What is included in the Venice tour?', tools: ['get_tour'] },
  { q: 'Lịch trình tour Lauterbrunnen từng ngày như thế nào?', tools: ['get_tour'], vi: true },
  { q: 'What food should I try in Bangkok?', toolsAny: ['search_knowledge', 'get_tour'] },
  { q: 'When is the best time to visit Maldives?', toolsAny: ['search_knowledge', 'get_tour'] },
  { q: 'If I cancel 20 days before departure, how much do I get back?', tools: ['refund_policy'], expect: (a) => /50\s?%/.test(a) },
  { q: 'Huỷ tour trước 40 ngày thì được hoàn bao nhiêu?', tools: ['refund_policy'], vi: true, expect: (a) => /100\s?%/.test(a) },
  // Chua dang nhap: tra loi "can dang nhap" la dung, goi cong cu hay khong deu duoc
  { q: 'Show me my bookings', expect: (a) => /sign|log ?in|đăng nhập/i.test(a) },
  // Hien ca 36 tour giam nhom 0% -> khong duoc noi la co giam
  { q: 'Is there a discount for a group of 12 people on the Paris tour?', toolsAny: ['quote_price', 'search_knowledge', 'get_tour'], expect: (a) => !/\b(yes|get) (a |an )?\d+\s?% (group )?discount/i.test(a) },
  { q: 'Do you have a tour to Hanoi?', tools: ['search_tours'], expect: (a) => !/Hanoi tour (costs|is)/i.test(a) },
  { q: 'Write me a Python script to sort a list.', tools: [], expect: (a) => !/def |sorted\(/.test(a) },
  { q: 'Paris tour on 2099-01-01 price?', toolsAny: ['quote_price', 'get_departures'], expect: (a) => !/2099[^.\n]*\$\s?\d/.test(a) }, // khong duoc bao gia cho ngay 2099 (khong co chuyen)
  { q: `Tour Rome khởi hành sớm nhất sau ${day(30)}, 2 người lớn 1 bé 1 tuổi, tổng bao nhiêu tiền?`, tools: ['quote_price'], vi: true },
  // Loi nguoi dung bao 2026-11-19: ghep tour lam mat Maldives (noi khach yeu thich)
  { q: 'i love maldives so much, but i also want to visit other place like paris', tools: ['plan_trip'],
    cards: (cs) => { const p = cs.filter(c => c.type === 'plan'); return p.length > 0 && p.every(c => /Maldives/.test(c.route)) && /Paris/.test(p[0].route); } },
  { q: 'tell me detail of maldives tour', tools: ['get_tour'], cards: (cs) => cs.some(c => c.type === 'tour' && c.name === 'Maldives' && c.gallery?.length) },
  { q: 'help me i want to book the maldives tour', tools: ['get_departures'], cards: (cs) => cs.some(c => c.type === 'departure') },
  // Cau nguoi dung bao 2026-11-19: huong dan dung web, blog, lien he
  { q: 'how to add money to this account', tools: ['site_help'], cards: (cs) => cs.some(c => c.link === 'profile.html#wallet') },
  { q: 'how to get to gallery', tools: ['site_help'], cards: (cs) => cs.some(c => c.link === 'gallery.html') },
  { q: 'how to use smart tour', tools: ['site_help'], cards: (cs) => cs.some(c => c.link === 'smart-tour.html') },
  { q: 'where i can read more about maldives in blog', tools: ['search_blog'], cards: (cs) => cs.some(c => c.type === 'link' && /blog-detail\.html\?id=/.test(c.link) && /Maldives/.test(c.title)) },
  { q: 'is there a blog post about Tokyo?', tools: ['search_blog'], expect: (a) => /no (blog )?(article|post)|(isn't|is not|aren't|are not) (a |any )?(blog )?(article|post)|don't have|do not have|haven't/i.test(a) },
  { q: 'tell me about contact', tools: ['site_help'], expect: (a) => /\+84 123 456 789|eee@phenikaa-uni\.edu\.vn/.test(a) },
  { q: 'Làm sao để thanh toán đơn đặt tour?', tools: ['site_help'], vi: true }
];

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Can OPENAI_API_KEY trong backend/.env');
    process.exit(1);
  }
  await connectDB();
  const pick = process.argv.slice(2).map(Number).filter(Boolean);
  const cases = CASES.map((c, i) => ({ ...c, n: i + 1 })).filter(c => !pick.length || pick.includes(c.n));
  let pass = 0;

  for (const c of cases) {
    const t0 = Date.now();
    const state = await graph.invoke({ messages: [new HumanMessage(c.q)], userId: null }, { recursionLimit: 30 });
    const called = state.messages.flatMap(m => (m.tool_calls || []).map(t => t.name));
    const answer = textOf(state.messages[state.messages.length - 1]);
    const problems = [];
    (c.tools || []).forEach(t => { if (!called.includes(t)) problems.push(`did not call ${t}`); });
    if (c.toolsAny && !c.toolsAny.some(t => called.includes(t))) problems.push(`called none of ${c.toolsAny.join('/')}`);
    if (c.tools && !c.tools.length && called.length) problems.push(`should not call tools (${called.join(',')})`);
    if (state.verified && !state.verified.ok) problems.push(`unsupported amounts ${state.verified.unsupported.join(', ')}`);
    if (c.vi && !VI.test(answer)) problems.push('not answered in Vietnamese');
    if (c.expect && !c.expect(answer)) problems.push('expectation failed');
    if (c.cards && !c.cards(state.cards || [])) problems.push(`cards check failed (${(state.cards || []).map(x => x.route || x.name).join(', ')})`);
    if (!problems.length) pass++;

    console.log(`\n#${c.n} ${problems.length ? 'FAIL' : 'ok  '} (${((Date.now() - t0) / 1000).toFixed(1)}s) ${c.q}`);
    console.log(`   tools: ${called.join(' -> ') || '-'}`);
    console.log(`   answer: ${answer.replace(/\s+/g, ' ').slice(0, 220)}${answer.length > 220 ? '…' : ''}`);
    problems.forEach(p => console.log(`   !! ${p}`));
  }
  console.log(`\n${pass}/${cases.length} passed`);
  await mongoose.disconnect();
  process.exit(pass === cases.length ? 0 : 1);
})().catch(async (err) => {
  console.error('That bai:', err);
  await mongoose.disconnect();
  process.exit(1);
});
