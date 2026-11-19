// backend/chat/shared/retrieval.js (tuong ung src/shared/retrieval.ts cua repo mau,
// thay Supabase bang MongoDB - cung DB voi web, khong them dich vu).
//
// Tim doan van lien quan, 3 tang du phong de chatbot luon tra loi duoc:
//   1. Atlas Vector Search ($vectorSearch) neu cum co index
//   2. cosine trong Node tren moi embedding (vai nghin doan - van nhanh)
//   3. tim theo tu khoa ($text) neu chua co OPENAI_API_KEY / chua co embedding

const ChatChunk = require('../../models/ChatChunk');
const config = require('./configuration');

let embedder = null;
let atlasVectorOk = null; // null = chua thu; false = cum khong co index -> khong thu lai

function getEmbedder() {
  if (!config.hasApiKey()) return null;
  if (!embedder) {
    const { OpenAIEmbeddings } = require('@langchain/openai');
    embedder = new OpenAIEmbeddings({ model: config.embeddingModel, timeout: 15000, maxRetries: 2 });
  }
  return embedder;
}

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na * nb) || 1);
};

const shape = (c, score) => ({ source: c.source, title: c.title, text: c.text, link: c.link, score });

/**
 * @param {string} query
 * @param {number} k so doan tra ve
 * @returns {Promise<Array<{source,title,text,link,score}>>}
 */
async function searchKnowledge(query, k = 5) {
  const emb = getEmbedder();
  const hasVectors = emb && await ChatChunk.exists({ embedding: { $exists: true } });

  // OpenAI embedding loi / qua thoi gian -> roi xuong tim theo tu khoa thay vi hong cau tra loi
  let vector = null;
  if (hasVectors) {
    try {
      vector = await emb.embedQuery(query);
    } catch (err) {
      console.warn('Embedding failed, falling back to keyword search:', err.message);
    }
  }
  if (vector) {
    if (atlasVectorOk !== false) {
      try {
        const rows = await ChatChunk.aggregate([
          { $vectorSearch: { index: config.vectorIndex, path: 'embedding', queryVector: vector, numCandidates: k * 20, limit: k } },
          { $project: { source: 1, title: 1, text: 1, link: 1, score: { $meta: 'vectorSearchScore' } } }
        ]);
        atlasVectorOk = true;
        if (rows.length) return rows.map(r => shape(r, r.score));
      } catch (err) {
        atlasVectorOk = false; // cum chua co index / khong ho tro -> dung cosine trong Node
        console.warn('Atlas Vector Search unavailable, using in-process similarity:', err.message);
      }
    }
    const all = await ChatChunk.find({ embedding: { $exists: true } }, { source: 1, title: 1, text: 1, link: 1, embedding: 1 }).lean();
    return all
      .map(c => ({ c, s: cosine(vector, c.embedding) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, k)
      .map(({ c, s }) => shape(c, s));
  }

  const rows = await ChatChunk.find({ $text: { $search: query } }, { score: { $meta: 'textScore' }, source: 1, title: 1, text: 1, link: 1 })
    .sort({ score: { $meta: 'textScore' } })
    .limit(k)
    .lean();
  return rows.map(r => shape(r, r.score));
}

module.exports = { searchKnowledge, getEmbedder };
