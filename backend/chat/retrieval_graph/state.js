// State cua graph tra loi (tuong ung src/retrieval_graph/state.ts cua repo mau).
//
// Voi checkpointer (MongoDB) state duoc giu QUA CAC LUOT cua 1 cuoc chat:
//   - messages, toolResults: giu (AI biet chinh xac da tra gi, gia nao da bao)
//   - toolRounds, verifyAttempts, verified, cards: theo TUNG LUOT -> route gui gia
//     tri dau (0 / null) moi luot de reset
const { Annotation, MessagesAnnotation } = require('@langchain/langgraph');

const last = (a, b) => (b === undefined ? a : b);

const ChatState = Annotation.Root({
  ...MessagesAnnotation.spec,           // lich su + cau hoi + tool calls (cong don)
  userId: Annotation({ reducer: last, default: () => null }), // null = khach chua dang nhap
  toolRounds: Annotation({ reducer: last, default: () => 0 }),
  // Ket qua tho cua cong cu - buoc verify doi chieu so tien voi day. Giu qua cac
  // luot ("vay 3 nguoi thi sao?" dung lai gia da bao), toi da 40 ket qua gan nhat.
  toolResults: Annotation({ reducer: (a, b) => a.concat(b || []).slice(-40), default: () => [] }),
  // The tour / chuyen cua luot nay (lay tu ket qua cong cu, khong do LLM viet).
  // null = bat dau luot moi.
  cards: Annotation({ reducer: (a, b) => (b === null ? [] : a.concat(b || [])), default: () => [] }),
  // So thich dai han cua khach (chat/shared/memory.js), nap lai moi luot o node loadMemory
  memories: Annotation({ reducer: last, default: () => [] }),
  verifyAttempts: Annotation({ reducer: last, default: () => 0 }),
  verified: Annotation({ reducer: last, default: () => null }) // { ok, unsupported: [], retry }
});

/** Gia tri dau moi luot (truyen cung cau hoi moi khi dung checkpointer). */
const TURN_RESET = { toolRounds: 0, verifyAttempts: 0, verified: null, cards: null };

module.exports = { ChatState, TURN_RESET };
