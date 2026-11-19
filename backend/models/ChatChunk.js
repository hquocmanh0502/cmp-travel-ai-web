// Doan van cho chatbot tra cuu (RAG). Sinh boi chat/ingestion_graph tu Tour /
// Poi / Blog / chinh sach trong code - KHONG sua tay. Gia, ghe, ngay khoi hanh
// KHONG nam o day: chatbot lay qua cong cu (chat/shared/tools.js) cho luon dung.
const mongoose = require('mongoose');

const chatChunkSchema = new mongoose.Schema({
  source: { type: String, enum: ['tour', 'itinerary', 'faq', 'poi', 'blog', 'policy'], required: true },
  refId: { type: String, index: true },   // tourId / blogId / ten chinh sach - de danh lai tung tai lieu
  title: String,
  text: { type: String, required: true },
  link: String,
  embedding: { type: [Number], default: undefined } // text-embedding-3-small (1536); trong neu chua co key
}, { timestamps: true });

chatChunkSchema.index({ text: 'text', title: 'text' }); // du phong tim theo tu khoa khi chua co embedding

module.exports = mongoose.model('ChatChunk', chatChunkSchema, 'chat_chunks');
