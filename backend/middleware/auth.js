// backend/middleware/auth.js
// Tầng xác thực dùng chung cho toàn bộ API.
//
// Thay thế cơ chế cũ: token là Buffer.from(`${id}:${Date.now()}`).toString('base64'),
// tức ai cũng tự tạo được token của bất kỳ user nào. Ở đây dùng JWT có chữ ký HMAC
// nên token không thể giả mạo nếu không biết JWT_SECRET.

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error(
    'Thiếu JWT_SECRET trong .env. Server không thể phát hành token an toàn nếu không có secret.'
  );
}

/**
 * Phát hành JWT cho một user document.
 * Payload chỉ chứa thông tin định danh tối thiểu - không bao giờ nhét password
 * hay dữ liệu nhạy cảm vào JWT, vì phần payload chỉ được base64 chứ không mã hoá.
 */
function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Bắt buộc phải có token hợp lệ. Gắn req.user = { id, role } khi thành công.
 */
async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Chưa đăng nhập',
      code: 'NO_TOKEN'
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role || 'user' };
    return next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Phiên đăng nhập đã hết hạn' : 'Token không hợp lệ',
      code: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    });
  }
}

/**
 * Như requireAuth nhưng không chặn khi thiếu token - dùng cho route có nội dung
 * công khai nhưng muốn cá nhân hoá thêm nếu người dùng đã đăng nhập.
 */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role || 'user' };
  } catch {
    // Token hỏng thì coi như khách vãng lai, không báo lỗi.
  }
  return next();
}

/**
 * Chỉ cho phép admin. Role được đọc lại từ DB thay vì tin vào payload, để khi
 * admin bị hạ quyền thì token cũ mất hiệu lực ngay lập tức.
 */
async function requireAdmin(req, res, next) {
  return requireAuth(req, res, async () => {
    try {
      const user = await User.findById(req.user.id).select('role blocked');

      if (!user || user.blocked) {
        return res.status(403).json({ error: 'Tài khoản không khả dụng', code: 'ACCOUNT_UNAVAILABLE' });
      }
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Yêu cầu quyền quản trị', code: 'NOT_ADMIN' });
      }

      req.user.role = user.role;
      return next();
    } catch (err) {
      console.error('requireAdmin error:', err);
      return res.status(500).json({ error: 'Lỗi kiểm tra quyền truy cập' });
    }
  });
}

/**
 * Chặn IDOR: chỉ chủ sở hữu tài nguyên hoặc admin mới đi tiếp được.
 *
 * Trước đây các route dạng /api/wallet/:userId nhận userId thẳng từ URL mà không
 * kiểm tra gì, nên đổi ID trên thanh địa chỉ là đọc/ghi được dữ liệu người khác.
 *
 * @param {string} paramName tên param chứa userId trong đường dẫn
 */
function requireSelfOrAdmin(paramName = 'userId') {
  return (req, res, next) => {
    return requireAuth(req, res, () => {
      const targetId = req.params[paramName];

      if (req.user.role === 'admin' || req.user.id === targetId) {
        return next();
      }

      return res.status(403).json({
        error: 'Bạn không có quyền truy cập dữ liệu của người dùng khác',
        code: 'FORBIDDEN'
      });
    });
  };
}

module.exports = {
  signToken,
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireSelfOrAdmin,
  JWT_EXPIRES_IN
};
