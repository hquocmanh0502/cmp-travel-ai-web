// backend/chat/shared/memory.js
//
// Bo nho SO THICH DAI HAN cua khach da dang nhap (dung chung moi cuoc chat).
// Checkpointer chi nho trong 1 cuoc chat; day nho qua cac lan truy cap:
// "di cung con 5 tuoi", "thich bien", "ngan sach ~$9,000/nguoi"...
//
// Cach lam theo TripStar (backend/app/memory), luu bang MongoDBStore cua LangGraph:
//   - TRICH: sau moi luot, model re (gpt-4o-mini) rut so thich ON DINH + diem 0-10
//   - NAP:   diem >= MIN_INIT_WEIGHT moi luu; trung noi dung -> cong diem (x0.4)
//   - QUEN:  diem giam DECAY moi ngay ke tu lan cuoi duoc khang dinh lai;
//            duoi THRESHOLD thi xoa (so thich khong nhac lai se mo dan)
//   - GOI:   TOP-K diem cao nhat -> dua vao prompt
// Khong luu thong tin nhay cam (ten, email, SDT, thanh toan, suc khoe ngoai kha
// nang di lai). Khach xem / xoa duoc (GET / DELETE /api/chatbot/memory).

const crypto = require('crypto');
const { z } = require('zod');
const config = require('./configuration');

const DECAY = 0.97;          // diem x0.97 moi ngay (~23 ngay giam mot nua)
const THRESHOLD = 2;         // duoi nguong -> quen
const MIN_INIT_WEIGHT = 4;   // so thich moi phai du chac moi luu
const MERGE_RATE = 0.4;      // nhac lai -> cong 40% diem moi
const MAX_RECALL = 10;       // toi da dua vao prompt
const MAX_ITEMS = 40;        // toi da luu moi khach
const MAX_LEN = 120;

let store = null;
function getStore() {
  if (!store) {
    const mongoose = require('mongoose');
    const { MongoDBStore } = require('@langchain/langgraph-checkpoint-mongodb');
    store = new MongoDBStore({
      client: mongoose.connection.getClient(),
      dbName: mongoose.connection.name,
      collectionName: 'chat_user_memory'
    });
  }
  return store;
}

const ns = (userId) => ['user_prefs', String(userId)];
const normalize = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
const keyOf = (content) => crypto.createHash('sha1').update(normalize(content).toLowerCase()).digest('hex').slice(0, 16);
const decayed = (v, now = Date.now()) => v.weight * DECAY ** Math.max(0, (now - v.lastAccess) / 864e5);

/** Moi so thich con nho (da tru diem theo thoi gian), xoa cai da phai. */
async function listMemories(userId) {
  if (!userId) return [];
  const s = getStore();
  const items = await s.search(ns(userId), { limit: 100 });
  const now = Date.now();
  const alive = [];
  for (const it of items) {
    const weight = decayed(it.value, now);
    if (weight < THRESHOLD) await s.delete(ns(userId), it.key);
    else alive.push({ key: it.key, content: it.value.content, weight, lastAccess: it.value.lastAccess, source: it.value.source });
  }
  return alive.sort((a, b) => b.weight - a.weight);
}

/** TOP-K de dua vao prompt. Loi -> [] (bo nho khong bao gio duoc lam hong cuoc chat). */
async function recall(userId) {
  if (!userId) return [];
  try {
    return (await listMemories(userId)).slice(0, MAX_RECALL).map(m => ({ content: m.content, weight: Math.round(m.weight * 10) / 10 }));
  } catch (err) {
    console.warn('Chat memory recall failed:', err.message);
    return [];
  }
}

/** Gop danh sach { content, score } vao bo nho cua khach. */
async function remember(userId, prefs, source = 'chat') {
  if (!userId || !prefs?.length) return { added: 0, merged: 0 };
  const s = getStore();
  const existing = Object.fromEntries((await listMemories(userId)).map(m => [m.key, m]));
  const now = Date.now();
  let added = 0;
  let merged = 0;
  for (const p of prefs) {
    const content = normalize(p.content);
    const score = Math.max(0, Math.min(10, Number(p.score) || 0));
    if (!content) continue;
    const key = keyOf(content);
    const old = existing[key];
    if (old) {
      existing[key] = { ...old, weight: Math.min(10, old.weight + score * MERGE_RATE), lastAccess: now };
      merged++;
    } else if (score >= MIN_INIT_WEIGHT) {
      existing[key] = { key, content, weight: score, lastAccess: now, source };
      added++;
    } else continue;
    const { key: k, ...value } = existing[key];
    await s.put(ns(userId), k, value);
  }
  // Qua nhieu -> bo nhung cai yeu nhat
  const all = Object.values(existing).sort((a, b) => b.weight - a.weight);
  for (const weak of all.slice(MAX_ITEMS)) await s.delete(ns(userId), weak.key);
  return { added, merged };
}

async function forget(userId, key) {
  if (!userId) return 0;
  const s = getStore();
  if (key) { await s.delete(ns(userId), key); return 1; }
  const items = await s.search(ns(userId), { limit: 200 });
  for (const it of items) await s.delete(ns(userId), it.key);
  return items.length;
}

// ---------------------------------------------------------------- trich so thich

const ExtractSchema = z.object({
  preferences: z.array(z.object({
    content: z.string().describe('Short English phrase in THIRD person, max 12 words, e.g. "Travels with spouse and a 5-year-old son"'),
    score: z.number().describe('0-10: how stable / long-term this preference is')
  }))
});

const EXTRACT_PROMPT = `You extract a travel customer's STABLE, long-term preferences from their latest chat turn, to personalise future trips.
Extract only things likely to stay true next time: who they travel with (and children's ages), interests, preferred pace, budget range per person,
typical trip length, places or regions they love or dislike, physical limitations for walking, accommodation style.
Do NOT extract: one-off details (a specific date, a single price check), anything the assistant said, names, emails, phone numbers,
payment details, health conditions beyond mobility, religion, politics.
Score 0-10: 8-10 explicitly stated as a habit ("we always", "I love"), 5-7 clearly stated for this trip and likely to repeat, below 4 a guess.
Write each one in the third person about the customer ("Loves beach destinations", "Dislikes rushed itineraries"), never "I"/"we"/"my".
If a preference matches one already known, reuse EXACTLY the known wording so it is merged instead of duplicated.
Return an empty list when there is nothing stable.`;

let extractor = null;
function getExtractor() {
  if (!extractor) {
    const { ChatOpenAI } = require('@langchain/openai');
    extractor = new ChatOpenAI({ model: config.memoryModel, temperature: 0, timeout: 20000, maxRetries: 1 })
      .withStructuredOutput(ExtractSchema, { name: 'save_preferences' });
  }
  return extractor;
}
/** Chi cho test: thay model trich bang ham kich ban. */
function setExtractorForTest(fn) { extractor = { invoke: fn }; }

/**
 * Hoc tu 1 luot chat (chay nen sau khi da tra loi, khong lam cham khach).
 * @param {string} userId
 * @param {{ message: string, toolCalls: Array<{name,args}> }} turn
 */
async function learnFromTurn(userId, { message, toolCalls = [] }) {
  if (!userId || !config.hasApiKey()) return { added: 0, merged: 0 };
  try {
    const known = (await listMemories(userId)).map(m => `- ${m.content}`).join('\n') || '(none)';
    // Tham so cong cu la tin hieu manh (plan_trip: interests, budget, childAges...)
    const signals = toolCalls
      .filter(c => ['plan_trip', 'quote_price', 'search_tours'].includes(c.name))
      .map(c => `${c.name}(${JSON.stringify(c.args)})`).join('\n') || '(none)';
    const out = await getExtractor().invoke([
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: `Known preferences:\n${known}\n\nCustomer message:\n${message}\n\nSearch parameters used for this request:\n${signals}` }
    ]);
    return await remember(userId, out?.preferences || []);
  } catch (err) {
    console.warn('Chat memory learning failed:', err.message);
    return { added: 0, merged: 0 };
  }
}

module.exports = {
  recall, remember, forget, listMemories, learnFromTurn, setExtractorForTest, keyOf,
  DECAY, THRESHOLD, MIN_INIT_WEIGHT
};
