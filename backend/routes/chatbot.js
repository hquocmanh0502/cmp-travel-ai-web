// backend/routes/chatbot.js
//
// Chatbot CMP Travel (chat/retrieval_graph). Thay ban mock cu + server Flask
// :5000: chatbot chay ngay trong Express, moi so lieu lay tu code web.
//
//   POST /api/chatbot/message          { message, sessionId? }  -> Server-Sent Events
//        event session  { sessionId }
//        event status   { tools: [...] }     dang tra cuu (giao dien hien "dang kiem tra gia...")
//        event reset    {}                   bo phan chu da hien (agent viet lai)
//        event token    { text }             tung manh cau tra loi
//        event done     { answer, cards, verified }
//        event error    { error }
//   GET  /api/chatbot/history/:sessionId   tin nhan cu (chuyen trang van giu cuoc chat)
//   GET  /api/chatbot/status
//   POST /api/chatbot/feedback

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const ChatConversation = require('../models/ChatConversation');
const ChatChunk = require('../models/ChatChunk');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const memory = require('../chat/shared/memory');
const config = require('../chat/shared/configuration');

const router = express.Router();

// 20 tin / 10 phut moi nguoi dung (hoac IP neu chua dang nhap) - chan ton tien API
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || rateLimit.ipKeyGenerator(req.ip),
  message: { error: 'Too many messages. Please wait a few minutes.' }
});

const SESSION_RX = /^[A-Za-z0-9_-]{8,64}$/;

/** Hoi thoai cua sessionId - chi tra ve neu cung chu (khong lo hoi thoai nguoi khac). */
async function loadConversation(sessionId, userId) {
  if (!SESSION_RX.test(String(sessionId || ''))) return null;
  const conv = await ChatConversation.findOne({ sessionId });
  if (!conv) return null;
  if (conv.userId && String(conv.userId) !== String(userId || '')) return null;
  return conv;
}

const dedupeCards = (cards) => {
  const seen = new Set();
  let plans = 0;
  return cards.filter(c => {
    // The chuyen ghep cung 1 lan tim chung link Smart Tour -> phan biet bang lo trinh + ngay
    // (truoc day loc theo link -> 3 chuyen chi con 1 the)
    const key = c.type === 'plan' ? `plan:${c.route}:${c.startDay}` : `${c.type}:${c.link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    // Toi da 3 chuyen ghep, theo thu tu lan goi dau tien (dung dieu kien khach dat ra)
    return !(c.type === 'plan' && ++plans > 3);
  }).slice(0, 6);
};

router.post('/message', optionalAuth, limiter, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message is required' });
  if (message.length > config.maxMessageChars) {
    return res.status(400).json({ error: `Message is too long (max ${config.maxMessageChars} characters)` });
  }
  if (!config.hasApiKey()) {
    return res.status(503).json({ error: 'The assistant is not configured yet (OPENAI_API_KEY missing on the server).' });
  }

  const userId = req.user?.id || null;
  let conv = await loadConversation(req.body?.sessionId, userId);
  const sessionId = conv?.sessionId || crypto.randomUUID();
  const history = (conv?.messages || []).slice(-config.historyTurns)
    .map(m => (m.sender === 'user' ? new HumanMessage(m.content?.text || '') : new AIMessage(m.content?.text || '')));

  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('session', { sessionId });

  // Khach dong tab -> dung goi model (khong ton tien cho cau tra loi khong ai doc).
  // Han chot ca cau tra loi: qua requestDeadlineMs (vd OpenAI treo ca khi da thu lai)
  // thi dung va bao loi lich su thay vi de khach cho mai.
  const abort = new AbortController();
  res.on('close', () => { if (!res.writableEnded) abort.abort(); });
  const deadline = AbortSignal.timeout(config.requestDeadlineMs);
  const signal = AbortSignal.any([abort.signal, deadline]);

  // nap tre: server van chay khi chua cai/cau hinh
  const { getChatGraph, textOf } = require('../chat/retrieval_graph/graph');
  const { TURN_RESET } = require('../chat/retrieval_graph/state');
  let answer = '';      // phan da stream cho khach
  let finalText = '';   // cau tra loi cuoi cua agent (nguon chinh, khong phu thuoc stream)
  let cards = [];
  let verified = null;
  const toolCalls = []; // tham so cong cu cua luot nay -> tin hieu cho bo nho so thich
  try {
    // Checkpointer giu nguyen state cua cuoc chat (thread = sessionId): chi gui cau
    // hoi MOI + reset bo dem cua luot. Cuoc chat cu chua co checkpoint (truoc ban
    // nay) -> nap lich su chu 1 lan de khong mat ngu canh.
    const graph = await getChatGraph();
    const threadConfig = { configurable: { thread_id: sessionId } };
    const snapshot = await graph.getState(threadConfig);
    const seed = snapshot.values?.messages?.length ? [] : history;
    const stream = await graph.stream(
      { messages: [...seed, new HumanMessage(message)], userId, ...TURN_RESET },
      { ...threadConfig, streamMode: ['messages', 'updates'], recursionLimit: 30, signal }
    );
    for await (const [mode, chunk] of stream) {
      if (mode === 'messages') {
        const [msg, meta] = chunk;
        const text = typeof msg.content === 'string' ? msg.content : '';
        if (meta?.langgraph_node === 'agent' && text && !msg.tool_call_chunks?.length) {
          answer += text;
          send('token', { text });
        }
      } else if (mode === 'updates') {
        if (chunk.agent) {
          const ai = chunk.agent.messages?.[0];
          if (ai?.tool_calls?.length) {
            // Chu viet truoc khi goi cong cu ("de minh kiem tra...") -> bo, cho cau tra loi that
            if (answer) send('reset', {});
            answer = '';
            send('status', { tools: ai.tool_calls.map(t => t.name) });
            toolCalls.push(...ai.tool_calls.map(t => ({ name: t.name, args: t.args })));
          } else if (ai) {
            finalText = textOf(ai);
          }
        }
        if (chunk.tools) cards = cards.concat(chunk.tools.cards || []);
        if (chunk.verify) {
          verified = chunk.verify.verified;
          if (verified?.retry) { send('reset', {}); answer = ''; }
        }
      }
    }

    cards = dedupeCards(cards);
    answer = finalText || answer;

    // Luu TRUOC khi bao xong: khach bam goi y ngay sau do thi cau tiep theo van
    // thay hoi thoai nay (truoc day luu sau res.end() -> mat ngu canh)
    if (!conv) conv = new ChatConversation({ sessionId, userId, messages: [] });
    if (userId && !conv.userId) conv.userId = userId;
    conv.messages.push(
      { messageId: crypto.randomUUID(), sender: 'user', content: { text: message } },
      { messageId: crypto.randomUUID(), sender: 'bot', content: { text: answer, cards } }
    );
    conv.sessionInfo = { ...(conv.sessionInfo?.toObject?.() || {}), lastActivity: new Date(), messageCount: conv.messages.length };
    await conv.save().catch(err => console.error('Chat history save failed:', err.message));

    send('done', { answer, cards, verified: verified ? { ok: verified.ok } : null });
    res.end();

    // Hoc so thich dai han (chi khach da dang nhap) - chay nen, khach khong phai cho
    if (userId) memory.learnFromTurn(userId, { message, toolCalls });
  } catch (error) {
    if (abort.signal.aborted) return; // khach da dong tab
    const timedOut = deadline.aborted;
    console.error(timedOut ? 'Chatbot deadline exceeded' : 'Chatbot error:', timedOut ? '' : error);
    send('error', {
      error: timedOut
        ? 'Sorry, this is taking too long right now. Please try again in a moment.'
        : 'Sorry, I could not answer right now. Please try again.'
    });
    res.end();
  }
});

// ---------------------------------------------------------------- bo nho so thich
// Khach da dang nhap xem / xoa nhung gi tro ly nho ve minh (minh bach, quyen rieng tu)

router.get('/memory', requireAuth, async (req, res) => {
  try {
    const items = await memory.listMemories(req.user.id);
    res.json({ memories: items.map(m => ({ key: m.key, content: m.content, strength: Math.round(m.weight * 10) / 10 })) });
  } catch (err) {
    console.error('Chat memory list failed:', err);
    res.status(500).json({ error: 'Could not load memories' });
  }
});

// DELETE /memory = quen het; DELETE /memory/:key = quen 1 dieu (Express 5 khong co ":key?")
async function forgetHandler(req, res) {
  try {
    const removed = await memory.forget(req.user.id, req.params.key);
    res.json({ success: true, removed });
  } catch (err) {
    console.error('Chat memory delete failed:', err);
    res.status(500).json({ error: 'Could not delete memories' });
  }
}
router.delete('/memory', requireAuth, forgetHandler);
router.delete('/memory/:key', requireAuth, forgetHandler);

router.get('/history/:sessionId', optionalAuth, async (req, res) => {
  const conv = await loadConversation(req.params.sessionId, req.user?.id);
  res.json({
    sessionId: conv?.sessionId || null,
    messages: (conv?.messages || []).slice(-30).map(m => ({ sender: m.sender, text: m.content?.text || '', cards: m.content?.cards || [] }))
  });
});

router.get('/status', async (req, res) => {
  res.json({
    status: config.hasApiKey() ? 'active' : 'not_configured',
    service: 'CMP Travel Assistant',
    model: config.chatModel,
    knowledgeChunks: await ChatChunk.estimatedDocumentCount(),
    timestamp: new Date().toISOString()
  });
});

router.post('/feedback', async (req, res) => {
  const { sessionId, rating, feedback } = req.body || {};
  console.log('Chatbot feedback received:', { sessionId, rating, feedback, timestamp: new Date() });
  res.json({ success: true, message: 'Thank you for your feedback!' });
});

module.exports = router;
