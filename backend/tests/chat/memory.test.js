/**
 * Bo nho so thich dai han (chat/shared/memory.js): luu, gop, quen dan, nguong,
 * xoa, dua vao prompt. Can MongoDB (doc/ghi collection chat_user_memory voi 1
 * userId test ngau nhien, xoa sach khi xong). Khong goi OpenAI.
 *
 *   node tests/chat/memory.test.js      (hoac: npm run test:chat)
 */
require('dotenv').config({ quiet: true });
require('../../config/db'); // DNS fallback cho mongodb+srv tren Windows
const mongoose = require('mongoose');
const assert = require('assert');
const crypto = require('crypto');
const memory = require('../../chat/shared/memory');
const { systemPrompt } = require('../../chat/retrieval_graph/prompts');

const userId = `test-${crypto.randomUUID()}`;
const DAY = 864e5;

const cases = [
  ['new preference below the minimum score is ignored, above is stored', async () => {
    const r = await memory.remember(userId, [
      { content: 'Travels with a 5-year-old child', score: 8 },
      { content: 'Maybe likes museums', score: 2 }
    ]);
    assert.deepStrictEqual(r, { added: 1, merged: 0 });
    const list = await memory.listMemories(userId);
    assert.deepStrictEqual(list.map(m => m.content), ['Travels with a 5-year-old child']);
  }],

  ['same preference again (any case/spacing) is merged: weight goes up, no duplicate', async () => {
    const r = await memory.remember(userId, [{ content: '  travels with a 5-year-old  child ', score: 5 }]);
    assert.deepStrictEqual(r, { added: 0, merged: 1 });
    const [m] = await memory.listMemories(userId);
    assert(Math.abs(m.weight - 10) < 0.01, `8 + 5*0.4 = 10 (capped), got ${m.weight}`);
  }],

  ['old preferences fade: 100 days without mention -> forgotten and deleted', async () => {
    // Ghi thang 1 so thich cu (lastAccess 100 ngay truoc): 6 * 0.97^100 = 0.29 < nguong 2
    const store = require('@langchain/langgraph-checkpoint-mongodb');
    const s = new store.MongoDBStore({ client: mongoose.connection.getClient(), dbName: mongoose.connection.name, collectionName: 'chat_user_memory' });
    await s.put(['user_prefs', userId], memory.keyOf('Loves skiing'), { content: 'Loves skiing', weight: 6, lastAccess: Date.now() - 100 * DAY, source: 'test' });
    await s.put(['user_prefs', userId], memory.keyOf('Prefers relaxed pace'), { content: 'Prefers relaxed pace', weight: 6, lastAccess: Date.now() - 10 * DAY, source: 'test' });
    const list = await memory.listMemories(userId);
    assert(!list.some(m => m.content === 'Loves skiing'), 'faded preference forgotten');
    const relaxed = list.find(m => m.content === 'Prefers relaxed pace');
    assert(relaxed && Math.abs(relaxed.weight - 6 * 0.97 ** 10) < 0.01, '10 days: 6 * 0.97^10 = 4.43');
    const raw = await s.search(['user_prefs', userId], { limit: 50 });
    assert(!raw.some(i => i.value.content === 'Loves skiing'), 'deleted from the database too');
  }],

  ['recall returns strongest first; prompt gets a "what you remember" section', async () => {
    const top = await memory.recall(userId);
    assert.strictEqual(top[0].content, 'Travels with a 5-year-old child');
    const prompt = systemPrompt({ today: '2026-11-19', signedIn: true, language: 'English', memories: top });
    assert(/WHAT YOU REMEMBER ABOUT THIS CUSTOMER/.test(prompt) && prompt.includes('- Travels with a 5-year-old child'));
    assert(!/WHAT YOU REMEMBER/.test(systemPrompt({ today: '2026-11-19', signedIn: false, language: 'English', memories: [] })));
  }],

  ['learnFromTurn passes known memories + tool parameters to the extractor and stores the result', async () => {
    let seen = null;
    memory.setExtractorForTest(async (msgs) => {
      seen = msgs[1].content;
      return { preferences: [{ content: 'Loves beach destinations', score: 7 }, { content: 'Prefers relaxed pace', score: 6 }] };
    });
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test';
    const r = await memory.learnFromTurn(userId, {
      message: 'we love beaches, plan 10 days',
      toolCalls: [{ name: 'plan_trip', args: { days: 10, interests: ['beach'] } }, { name: 'refund_policy', args: {} }]
    });
    assert.deepStrictEqual(r, { added: 1, merged: 1 });
    assert(/Known preferences:[\s\S]*Travels with a 5-year-old child/.test(seen), 'known memories sent (for consistent wording)');
    assert(/plan_trip\(\{"days":10,"interests":\["beach"\]\}\)/.test(seen) && !/refund_policy/.test(seen), 'only planning tool params sent');
  }],

  ['anonymous visitors have no memory', async () => {
    assert.deepStrictEqual(await memory.recall(null), []);
    assert.deepStrictEqual(await memory.learnFromTurn(null, { message: 'I love Paris' }), { added: 0, merged: 0 });
  }],

  ['forget one, then forget everything', async () => {
    const [first] = await memory.listMemories(userId);
    await memory.forget(userId, first.key);
    assert(!(await memory.listMemories(userId)).some(m => m.key === first.key));
    await memory.forget(userId);
    assert.strictEqual((await memory.listMemories(userId)).length, 0);
  }]
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  let failed = 0;
  for (const [name, fn] of cases) {
    try { await fn(); console.log(`  ok    ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
  }
  await memory.forget(userId).catch(() => {});
  await mongoose.disconnect();
  console.log(failed ? `\n${failed} failed` : '\nmemory: all passed');
  process.exit(failed ? 1 : 0);
})();
