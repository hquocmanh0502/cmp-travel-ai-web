// backend/chat/retrieval_graph/graph.js
//
// Tuong ung src/retrieval_graph/graph.ts cua repo mau ai-pdf-chatbot-langchain.
// Repo mau: checkQueryType -> (retrieveDocuments -> generateResponse | directAnswer).
// O day thay router 1 nhanh bang AGENT goi nhieu cong cu trong vong lap (cau hoi
// lai "gia tour Kyoto thang 12 va co gi hay" can ca quote_price lan
// search_knowledge), va them buoc VERIFY: moi so tien trong cau tra loi phai co
// trong ket qua cong cu, neu khong agent viet lai 1 lan.
//
//   START -> agent <-> tools (toi da maxToolRounds) -> verify -> END
//                                                       \-> agent (sai so, 1 lan)

const { StateGraph, START, END, isNodeTimeoutError } = require('@langchain/langgraph');
const memory = require('../shared/memory');
const { SystemMessage, HumanMessage, ToolMessage } = require('@langchain/core/messages');
const { tool } = require('@langchain/core/tools');
const { ChatState } = require('./state');
const { systemPrompt, VERIFY_FEEDBACK } = require('./prompts');
const { TOOLS } = require('../shared/tools');
const config = require('../shared/configuration');

const BY_NAME = Object.fromEntries(TOOLS.map(t => [t.name, t]));
// Chi de khai bao schema cho model; cong cu duoc chay trong node `tools` (co ctx userId)
const TOOL_SPECS = TOOLS.map(t => tool(async () => '', { name: t.name, description: t.description, schema: t.schema }));

let models = null;
function getModels() {
  if (!models) {
    const { ChatOpenAI } = require('@langchain/openai');
    // Thu lai / timeout do retryPolicy + TimeoutPolicy cua node agent lo (1 lop duy
    // nhat, thay duoc trong graph) -> client OpenAI khong tu thu lai them
    const base = new ChatOpenAI({ model: config.chatModel, temperature: 0.2, streaming: true, maxRetries: 0, timeout: config.llmRunTimeoutMs });
    models = { withTools: base.bindTools(TOOL_SPECS), plain: base };
  }
  return models;
}

/** Chi cho test: thay model that bang model kich ban (khong goi OpenAI). */
function setModelsForTest(m) { models = m; }

const textOf = (msg) => (typeof msg?.content === 'string'
  ? msg.content
  : (msg?.content || []).map(p => (typeof p === 'string' ? p : p.text || '')).join(''));

// ---------------------------------------------------------------- doi chieu so tien

/** So tien trong cau tra loi: $5,950 · $5.950 · 5,950 USD · 5950 đô. */
function extractAmounts(text) {
  const out = [];
  const rx = /\$\s?(\d[\d.,]*)|(\d[\d.,]*)\s?(?:USD|usd|đô(?:\s?la)?|\$)/g;
  let m;
  while ((m = rx.exec(text))) {
    let s = (m[1] || m[2]).replace(/[.,]$/, '');
    // 5.950 / 12.340.000 kieu Viet -> bo dau cham; con lai bo dau phay
    s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s.replace(/,/g, '');
    const v = parseFloat(s);
    if (v >= 10) out.push(v); // bo "$1"-"$9" (hiem khi la gia, hay la thu tu)
  }
  return [...new Set(out)];
}

function collectNumbers(value, acc = new Set()) {
  if (typeof value === 'number') acc.add(value);
  else if (Array.isArray(value)) value.forEach(v => collectNumbers(v, acc));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectNumbers(v, acc));
  return acc;
}

/** Co trong ket qua cong cu, hoac = so do chia / nhan cho so nguoi (gia moi nguoi, x2 nguoi lon). */
function isSupported(amount, numbers) {
  for (const n of numbers) {
    if (Math.abs(n - amount) <= 1) return true;
    for (let k = 2; k <= 12; k++) {
      if (Math.abs(n / k - amount) <= 1 || Math.abs(n * k - amount) <= 1) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- node

const VERIFIER = 'verifier'; // ten tin nhac viet lai cua buoc verify - KHONG phai loi khach
const VI_CHARS = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
/** Tin nhan that cua khach (bo tin nhac cua verify). */
const customerMessages = (messages) => messages.filter(m => m._getType?.() === 'human' && m.name !== VERIFIER);

/**
 * Chi gui cho model config.historyTurns luot gan nhat (checkpoint giu ca cuoc chat).
 * Cat tai tin nhan cua KHACH -> khong bao gio tach cap "goi cong cu / ket qua"
 * (model loi neu thay ToolMessage ma khong co tool call truoc no).
 */
function recentTurns(messages) {
  const starts = [];
  messages.forEach((m, i) => { if (m._getType?.() === 'human' && m.name !== VERIFIER) starts.push(i); });
  const from = starts.length > config.historyTurns ? starts[starts.length - config.historyTurns] : 0;
  return messages.slice(from);
}

async function agent(state) {
  const { withTools, plain } = getModels();
  // Het luot cong cu -> model khong co cong cu, buoc phai tra loi
  const model = state.toolRounds >= config.maxToolRounds ? plain : withTools;
  // Ngon ngu theo tin nhan MOI NHAT cua khach - ghi thang vao prompt (sau khi doc ket
  // qua cong cu tieng Anh, model hay tra loi tieng Anh cho cau hoi tieng Viet)
  const latest = customerMessages(state.messages).pop();
  const language = VI_CHARS.test(textOf(latest)) ? 'Vietnamese' : 'the same language as the customer\'s latest message';
  const ai = await model.invoke([
    new SystemMessage(systemPrompt({ today: new Date().toISOString().slice(0, 10), signedIn: !!state.userId, language, memories: state.memories })),
    ...recentTurns(state.messages)
  ]);
  return { messages: [ai] };
}

async function tools(state) {
  const calls = state.messages[state.messages.length - 1].tool_calls || [];
  const results = await Promise.all(calls.map(async (tc) => {
    const t = BY_NAME[tc.name];
    let out;
    try {
      out = t ? await t.run(t.schema.parse(tc.args || {}), { userId: state.userId }) : { error: `Unknown tool ${tc.name}` };
    } catch (err) {
      console.error(`Chat tool ${tc.name} failed:`, err.message);
      out = { error: `Tool failed: ${err.message.slice(0, 200)}` };
    }
    const { cards = [], ...forModel } = out;
    return { msg: new ToolMessage({ content: JSON.stringify(forModel), tool_call_id: tc.id, name: tc.name }), cards, raw: forModel };
  }));
  return {
    messages: results.map(r => r.msg),
    cards: results.flatMap(r => r.cards),
    toolResults: results.map(r => r.raw),
    toolRounds: state.toolRounds + 1
  };
}

function verify(state) {
  const answer = textOf(state.messages[state.messages.length - 1]);
  const numbers = collectNumbers(state.toolResults);
  // So khach tu noi (ngan sach "6000 đô") duoc nhac lai - khong phai so bia.
  // Bo tin nhac cua verify: no chua chinh so bia -> neu tinh vao se cho qua so bia.
  // + so trong so thich da nho ("ngan sach ~$9,000/nguoi" tu lan truoc)
  [...customerMessages(state.messages).map(textOf), ...(state.memories || []).map(m => m.content)].forEach(text => {
    (text.match(/\d[\d.,]*/g) || []).forEach(s => {
      numbers.add(parseFloat(/^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s.replace(/,/g, '')));
    });
  });
  const unsupported = extractAmounts(answer).filter(a => !isSupported(a, numbers));
  if (unsupported.length && state.verifyAttempts < 1) {
    return {
      verifyAttempts: 1,
      verified: { ok: false, unsupported, retry: true },
      messages: [new HumanMessage({ content: VERIFY_FEEDBACK(unsupported.map(a => `$${a.toLocaleString('en-US')}`)), name: VERIFIER })]
    };
  }
  return { verified: { ok: !unsupported.length, unsupported, retry: false } };
}

const afterAgent = (state) => (state.messages[state.messages.length - 1].tool_calls?.length ? 'tools' : 'verify');
const afterVerify = (state) => (state.verified?.retry ? 'agent' : END);

/** So thich dai han cua khach da dang nhap -> prompt (loi bo nho -> [] trong memory.recall). */
async function loadMemory(state) {
  return { memories: await memory.recall(state.userId) };
}

/**
 * Loi TAM THOI nen thu lai: OpenAI qua tai (429), loi may chu (5xx), timeout cua
 * node / request, dut mang. Loi 4xx khac (sai key, sai tham so) thu lai vo ich.
 */
function isTransient(err) {
  if (isNodeTimeoutError(err)) return true;
  const status = err?.status ?? err?.response?.status;
  if ([408, 409, 429, 500, 502, 503, 504].includes(status)) return true;
  if (typeof status === 'number') return false;
  return /timeout|timed out|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|socket hang up|network/i
    .test(`${err?.code || ''} ${err?.name || ''} ${err?.message || ''}`);
}

const AGENT_POLICY = {
  retryPolicy: { maxAttempts: config.llmMaxAttempts, initialInterval: 500, backoffFactor: 2, maxInterval: 4000, jitter: true, retryOn: isTransient },
  // idleTimeout duoc lam moi moi khi model stream ra chu -> cau tra loi dai van chay,
  // model treo (khong ra gi) 20s thi huy va thu lai
  timeout: { idleTimeout: config.llmIdleTimeoutMs, runTimeout: config.llmRunTimeoutMs }
};

const builder = new StateGraph(ChatState)
  .addNode('loadMemory', loadMemory)
  .addNode('agent', agent, AGENT_POLICY)
  .addNode('tools', tools, { timeout: { runTimeout: config.toolsTimeoutMs } })
  .addNode('verify', verify)
  .addEdge(START, 'loadMemory')
  .addEdge('loadMemory', 'agent')
  .addConditionalEdges('agent', afterAgent, ['tools', 'verify'])
  .addEdge('tools', 'agent')
  .addConditionalEdges('verify', afterVerify, ['agent', END]);

// Graph khong bo nho - cho bo test (tests/chat/eval-live.test.js), moi cau doc lap
const graph = builder.compile();

// Graph cho khung chat: checkpointer MongoDB luu NGUYEN state theo thread_id =
// sessionId (ca ket qua cong cu, khong chi chu) -> hoi tiep "vay 3 nguoi?" AI biet
// chinh xac chuyen/gia da bao. Checkpoint la bo nho lam viec, tu xoa sau
// CHECKPOINT_TTL; log de phan tich van o ChatConversation.
const CHECKPOINT_TTL = 7 * 24 * 3600;
let chatGraph = null;
async function getChatGraph() {
  if (!chatGraph) {
    const mongoose = require('mongoose');
    const { MongoDBSaver } = require('@langchain/langgraph-checkpoint-mongodb');
    const saver = new MongoDBSaver({
      client: mongoose.connection.getClient(),
      dbName: mongoose.connection.name,
      checkpointCollectionName: 'chat_checkpoints',
      checkpointWritesCollectionName: 'chat_checkpoint_writes',
      ttl: CHECKPOINT_TTL
    });
    const errors = await saver.setup(); // index + TTL, idempotent
    if (errors.length) console.warn('Chat checkpointer index setup:', errors.map(e => e.message).join('; '));
    chatGraph = builder.compile({ checkpointer: saver });
  }
  return chatGraph;
}

module.exports = { graph, getChatGraph, verify, isTransient, AGENT_POLICY, extractAmounts, collectNumbers, isSupported, textOf, setModelsForTest };
