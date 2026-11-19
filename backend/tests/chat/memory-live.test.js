/**
 * Bo nho so thich voi MODEL THAT, qua 2 lan truy cap (2 cuoc chat khac nhau).
 * Can OPENAI_API_KEY + MongoDB; ton ~1-2 cent. Xoa sach du lieu test khi xong.
 *
 *   node tests/chat/memory-live.test.js
 */
require('dotenv').config({ quiet: true });
require('../../config/db');
const mongoose = require('mongoose');
const assert = require('assert');
const crypto = require('crypto');
const { HumanMessage } = require('@langchain/core/messages');
const { getChatGraph, textOf } = require('../../chat/retrieval_graph/graph');
const { TURN_RESET } = require('../../chat/retrieval_graph/state');
const memory = require('../../chat/shared/memory');

const userId = `test-${crypto.randomUUID()}`;
const threads = [];

async function chat(q) {
  const graph = await getChatGraph();
  const thread = `test-${crypto.randomUUID()}`; // moi lan truy cap = cuoc chat moi (khung chat trang)
  threads.push(thread);
  const s = await graph.invoke({ messages: [new HumanMessage(q)], userId, ...TURN_RESET },
    { configurable: { thread_id: thread }, recursionLimit: 30 });
  const toolCalls = s.messages.flatMap(m => m.tool_calls || []).map(t => ({ name: t.name, args: t.args }));
  return { answer: textOf(s.messages[s.messages.length - 1]), toolCalls };
}

(async () => {
  if (!process.env.OPENAI_API_KEY) { console.log('skip: no OPENAI_API_KEY'); process.exit(0); }
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    // Lan truy cap 1: khach ke ve thoi quen
    const q1 = "I always travel with my wife and our 5-year-old son. We love beaches and we don't like rushing.";
    const t1 = await chat(q1);
    console.log(`visit 1 tools: ${t1.toolCalls.map(c => c.name).join(', ') || '-'}`);
    const learned = await memory.learnFromTurn(userId, { message: q1, toolCalls: t1.toolCalls });
    const mems = await memory.listMemories(userId);
    console.log(`learned ${learned.added} new:\n${mems.map(m => `  - ${m.content} (${m.weight.toFixed(1)})`).join('\n')}`);
    assert(mems.some(m => /5[- ]year|child|son/i.test(m.content)), 'remembers the child');
    assert(mems.some(m => /beach/i.test(m.content)), 'remembers beaches');

    // Lan truy cap 2: cuoc chat MOI, khach khong nhac lai gi
    const t2 = await chat('Plan a 7-day trip for us please');
    const plan = t2.toolCalls.find(c => c.name === 'plan_trip');
    console.log(`visit 2 plan_trip args: ${JSON.stringify(plan?.args)}`);
    console.log(`visit 2 answer: ${t2.answer.replace(/\s+/g, ' ').slice(0, 300)}`);
    assert(plan, 'plans a trip');
    assert.strictEqual(plan.args.adults, 2, 'two adults from memory');
    assert.deepStrictEqual(plan.args.childAges, [5], 'child age 5 from memory');
    assert((plan.args.interests || []).some(i => /beach/i.test(i)), 'beach interest from memory');
    assert.strictEqual(plan.args.pace, 'relaxed', '"dislikes rushing" -> relaxed pace from memory');
    console.log('\nmemory-live: passed');
  } catch (e) {
    console.log(`\nFAIL ${e.message}`);
    process.exitCode = 1;
  } finally {
    await memory.forget(userId).catch(() => {});
    for (const c of ['chat_checkpoints', 'chat_checkpoint_writes']) await mongoose.connection.db.collection(c).deleteMany({ thread_id: { $in: threads } });
    await mongoose.disconnect();
  }
})();
