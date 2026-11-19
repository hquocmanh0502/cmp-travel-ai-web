// Cau hinh chatbot (tuong ung src/shared/configuration.ts cua repo mau
// ai-pdf-chatbot-langchain). Doi model chi can doi bien moi truong.

module.exports = {
  // Model tra loi: gpt-4o goi cong cu va viet tieng Viet tot nhat; doi sang
  // gpt-4o-mini (CHAT_MODEL=gpt-4o-mini) neu muon re hon ~15 lan.
  chatModel: process.env.CHAT_MODEL || 'gpt-4o',
  embeddingModel: process.env.CHAT_EMBEDDING_MODEL || 'text-embedding-3-small',
  // Model re cho viec phu (trich so thich dai han - chat/shared/memory.js)
  memoryModel: process.env.CHAT_MEMORY_MODEL || 'gpt-4o-mini',
  // Do ben (retryPolicy / TimeoutPolicy cua LangGraph - retrieval_graph/graph.js)
  // (doc tu env de bo test chay nhanh: tests/chat/reliability.test.js)
  llmIdleTimeoutMs: Number(process.env.CHAT_LLM_IDLE_TIMEOUT_MS) || 20000, // model im lang qua 20s -> huy, thu lai
  llmRunTimeoutMs: Number(process.env.CHAT_LLM_RUN_TIMEOUT_MS) || 60000,   // tran cung moi lan goi model
  llmMaxAttempts: Number(process.env.CHAT_LLM_MAX_ATTEMPTS) || 3,         // 1 lan + 2 lan thu lai (chi loi tam thoi)
  toolsTimeoutMs: 30000,     // ca buoc chay cong cu
  requestDeadlineMs: Number(process.env.CHAT_REQUEST_DEADLINE_MS) || 90000, // ca cau tra loi (route)
  embeddingDims: 1536,
  // Atlas Vector Search index tren collection chat_chunks (xem scripts/build-chat-index.js)
  vectorIndex: process.env.CHAT_VECTOR_INDEX || 'chat_chunks_vector',
  maxToolRounds: 5,        // so vong agent <-> cong cu toi da cho 1 cau hoi
  historyTurns: 10,        // so tin nhan gan nhat gui kem
  maxMessageChars: 1000,
  chunkChars: 900,
  hasApiKey: () => !!process.env.OPENAI_API_KEY
};
