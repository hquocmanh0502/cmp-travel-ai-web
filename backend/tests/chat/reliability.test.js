/**
 * Do ben cua chatbot (retryPolicy + TimeoutPolicy cua node agent).
 * Khong goi OpenAI, khong can DB: model kich ban + graph khong bo nho.
 *
 *   node tests/chat/reliability.test.js      (hoac: npm run test:chat)
 */
// Timeout ngan de test chay nhanh - phai dat TRUOC khi nap graph
process.env.CHAT_LLM_IDLE_TIMEOUT_MS = '300';
process.env.CHAT_LLM_RUN_TIMEOUT_MS = '600';
process.env.CHAT_LLM_MAX_ATTEMPTS = '3';

const assert = require('assert');
const { BaseChatModel } = require('@langchain/core/language_models/chat_models');
const { AIMessage, HumanMessage } = require('@langchain/core/messages');
const { graph, setModelsForTest, isTransient, textOf } = require('../../chat/retrieval_graph/graph');

/** Model kich ban: moi lan goi chay buoc tiep theo (tra AIMessage, nem loi, hoac treo). */
class ScriptedModel extends BaseChatModel {
  constructor(steps) { super({}); this.steps = steps; this.calls = 0; }
  _llmType() { return 'scripted'; }
  bindTools() { return this; }
  async _generate() {
    const step = this.steps[Math.min(this.calls++, this.steps.length - 1)];
    const msg = await step();
    return { generations: [{ text: msg.content, message: msg }] };
  }
}
const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const ask = (q) => graph.invoke({ messages: [new HumanMessage(q)], userId: null }, { recursionLimit: 20 });

const cases = [
  ['isTransient: 429 / 5xx / timeout / network -> retry; 400 / 401 -> no retry', async () => {
    for (const s of [429, 500, 503, 504]) assert(isTransient(httpError(s)), String(s));
    for (const s of [400, 401, 403, 404]) assert(!isTransient(httpError(s)), String(s));
    assert(isTransient(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' })));
    assert(isTransient(new Error('Request timed out.')));
    assert(!isTransient(new Error('Invalid tool schema')));
  }],

  ['OpenAI 503 once -> retried, customer still gets the answer', async () => {
    const m = new ScriptedModel([async () => { throw httpError(503); }, async () => new AIMessage('Hello! How can I help?')]);
    setModelsForTest({ withTools: m, plain: m });
    const s = await ask('hi');
    assert.strictEqual(textOf(s.messages[s.messages.length - 1]), 'Hello! How can I help?');
    assert.strictEqual(m.calls, 2);
  }],

  ['Wrong API key (401) -> fails at once, no pointless retries', async () => {
    const m = new ScriptedModel([async () => { throw httpError(401); }]);
    setModelsForTest({ withTools: m, plain: m });
    await assert.rejects(ask('hi'), (e) => e.status === 401);
    assert.strictEqual(m.calls, 1);
  }],

  ['Model hangs -> idle timeout, retried, gives up after max attempts (does not hang the server)', async () => {
    const m = new ScriptedModel([() => new Promise(() => {})]); // khong bao gio tra loi
    setModelsForTest({ withTools: m, plain: m });
    const t0 = Date.now();
    await assert.rejects(ask('hi'));
    const ms = Date.now() - t0;
    assert.strictEqual(m.calls, 3, `attempts ${m.calls}`);
    assert(ms < 5000, `took ${ms}ms`);
  }],

  ['Model hangs once then recovers -> answer arrives', async () => {
    const m = new ScriptedModel([() => new Promise(() => {}), async () => new AIMessage('Recovered answer')]);
    setModelsForTest({ withTools: m, plain: m });
    const s = await ask('hi');
    assert.strictEqual(textOf(s.messages[s.messages.length - 1]), 'Recovered answer');
  }]
];

(async () => {
  let failed = 0;
  for (const [name, fn] of cases) {
    try { await fn(); console.log(`  ok    ${name}`); } catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
  }
  console.log(failed ? `\n${failed} failed` : '\nreliability: all passed');
  process.exit(failed ? 1 : 0);
})();
