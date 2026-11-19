/**
 * Danh chi muc kien thuc cho chatbot (chat/ingestion_graph).
 *
 *   node scripts/build-chat-index.js              # toan bo: 36 tour + POI + blog + chinh sach
 *   node scripts/build-chat-index.js --tour <id>  # chi 1 tour (vd sau khi admin sua)
 *   node scripts/build-chat-index.js --no-embed   # chua co OPENAI_API_KEY: chi luu van ban (tim theo tu khoa)
 *
 * Atlas Vector Search (tuy chon, nhanh hon): Atlas -> Search -> Create Index ->
 * JSON editor, collection chat_chunks, ten "chat_chunks_vector":
 *   { "fields": [{ "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" }] }
 * Khong tao index thi chatbot tu tinh do giong trong Node (van chay dung).
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { graph } = require('../chat/ingestion_graph/graph');
const config = require('../chat/shared/configuration');

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };

(async () => {
  await connectDB();
  const embed = !process.argv.includes('--no-embed') && config.hasApiKey();
  if (!embed) console.log('Khong tao embedding (chua co OPENAI_API_KEY hoac --no-embed): chatbot se tim theo tu khoa.');
  const t0 = Date.now();
  const out = await graph.invoke({ tourId: arg('--tour'), embed, stats: {} });
  console.log(`Tai lieu: ${out.stats.documents}, doan: ${out.stats.chunks} (xoa ${out.stats.removed} doan cu), embedding: ${out.stats.embedded || 0}`);
  console.log('Theo nguon:', out.stats.bySource);
  console.log(`Xong trong ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('That bai:', err);
  await mongoose.disconnect();
  process.exit(1);
});
