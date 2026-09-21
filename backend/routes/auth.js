const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const User = require('../models/User');
const { signToken, requireAuth, JWT_EXPIRES_IN } = require('../middleware/auth');

// Chống dò mật khẩu bằng vét cạn. Giới hạn theo IP, chỉ đếm request thất bại
// để người gõ nhầm rồi đăng nhập đúng không bị khoá oan.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều tài khoản được tạo từ địa chỉ này. Vui lòng thử lại sau.' }
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/** Chỉ trả ra những field an toàn để hiển thị cho client. */
function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    membershipLevel: user.membershipLevel
  };
}

/**
 * POST /api/auth/login
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
    }

    // password có select: false nên phải xin thêm rõ ràng.
    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
      .select('+password');

    // Thông báo lỗi giống hệt nhau cho "email không tồn tại" và "sai mật khẩu".
    // Nếu tách riêng, kẻ tấn công có thể dò xem email nào đã đăng ký.
    const invalidCredentials = () =>
      res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });

    if (!user) return invalidCredentials();

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) return invalidCredentials();

    if (user.blocked) {
      return res.status(403).json({
        error: 'Tài khoản đã bị khoá',
        reason: user.blockReason || undefined
      });
    }

    const authToken = signToken(user);

    return res.json({
      message: 'Đăng nhập thành công',
      authToken,
      expiresIn: JWT_EXPIRES_IN,
      user: toPublicUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
});

/**
 * POST /api/auth/register
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;

    const missing = ['username', 'email', 'password', 'fullName']
      .filter(field => !req.body[field]);

    if (missing.length) {
      return res.status(400).json({
        error: `Thiếu thông tin bắt buộc: ${missing.join(', ')}`,
        missing
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Định dạng email không hợp lệ' });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedUsername = String(username).trim();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        error: existingUser.email === normalizedEmail
          ? 'Email đã được sử dụng'
          : 'Tên đăng nhập đã tồn tại'
      });
    }

    // role không lấy từ req.body - nếu không, ai cũng tự đăng ký thành admin.
    const user = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password, // hook pre('save') của model sẽ hash bằng bcrypt
      fullName: String(fullName).trim(),
      phone: phone ? String(phone).trim() : undefined,
      role: 'user'
    });

    await user.save();

    return res.status(201).json({
      message: 'Tạo tài khoản thành công',
      authToken: signToken(user),
      expiresIn: JWT_EXPIRES_IN,
      user: toPublicUser(user)
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(409).json({
        error: `${field === 'email' ? 'Email' : 'Tên đăng nhập'} đã tồn tại`
      });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Lỗi server khi tạo tài khoản' });
  }
});

/**
 * GET /api/auth/me
 * Cho client xác minh token còn hiệu lực và lấy lại thông tin mới nhất
 * (vai trò, trạng thái khoá) thay vì tin vào localStorage.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản', code: 'USER_NOT_FOUND' });
    }
    if (user.blocked) {
      return res.status(403).json({ error: 'Tài khoản đã bị khoá', code: 'ACCOUNT_BLOCKED' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error('Auth /me error:', err);
    return res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/auth/logout
 * JWT là stateless nên phía server không có gì để xoá; client tự bỏ token đi.
 * Giữ endpoint để client có một nơi gọi thống nhất.
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Đã đăng xuất' });
});

module.exports = router;
