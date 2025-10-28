const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware để log requests
router.use((req, res, next) => {
  console.log(`📨 Auth ${req.method} ${req.path}:`);
  console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
  console.log('📄 Content-Type:', req.headers['content-type']);
  next();
});

// Login route - ĐÃ SỬA ĐỂ NHẬN EMAIL
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt received');
    console.log('📊 Request body keys:', Object.keys(req.body));
    console.log('📧 Email field:', req.body.email);
    console.log('🔑 Password field:', req.body.password ? '***PROVIDED***' : 'MISSING');
    
    const { email, password } = req.body;
    
    // Kiểm tra dữ liệu đầu vào - ✅ SỬA MESSAGE
    if (!email || !password) {
      console.log('❌ Missing credentials:', { 
        emailProvided: !!email, 
        passwordProvided: !!password,
        bodyFields: Object.keys(req.body)
      });
      return res.status(400).json({ 
        error: 'Email và mật khẩu là bắt buộc', // ✅ SỬA TỪ "Username và password"
        received: { 
          email: !!email, 
          password: !!password,
          bodyKeys: Object.keys(req.body)
        }
      });
    }
    
    console.log('🔍 Searching for user with email:', email);
    
    // Tìm user theo email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log('👤 User search result:', user ? {
      id: user._id,
      username: user.username,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordMatch: user.password === password
    } : 'USER_NOT_FOUND');
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      return res.status(401).json({ error: 'Email không tồn tại trong hệ thống' });
    }
    
    // Kiểm tra mật khẩu (chú ý: trong production nên dùng bcrypt)
    console.log('🔐 Password comparison:', {
      provided: password,
      stored: user.password,
      match: user.password === password
    });
    
    if (user.password !== password) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({ error: 'Mật khẩu không chính xác' });
    }
    
    console.log('✅ Login successful for user:', user.email);
    
    // Generate simple token (for production, use JWT)
    const authToken = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');
    
    // Trả về thông tin user + token
    const response = {
      message: 'Đăng nhập thành công',
      authToken: authToken, // ✅ ADD TOKEN
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      }
    };
    
    console.log('📤 Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
    
  } catch (err) {
    console.error('💥 Login error:', err);
    res.status(500).json({ 
      error: 'Lỗi server khi đăng nhập',
      details: err.message 
    });
  }
});

// Register route - KHÔNG ĐỔI
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Register attempt received');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const { username, email, password, fullName, phone } = req.body;
    
    // Validation chi tiết
    if (!username || !email || !password || !fullName) {
      const missing = [];
      if (!username) missing.push('username');
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      if (!fullName) missing.push('fullName');
      
      console.log('❌ Missing required fields:', missing);
      return res.status(400).json({ 
        error: `Thiếu thông tin bắt buộc: ${missing.join(', ')}`,
        missing: missing
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Định dạng email không hợp lệ' });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() }, 
        { username: username.toLowerCase().trim() }
      ] 
    });
    
    if (existingUser) {
      console.log('❌ User already exists:', existingUser.email);
      if (existingUser.email === email.toLowerCase().trim()) {
        return res.status(400).json({ error: 'Email đã được sử dụng' });
      } else {
        return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
      }
    }
    
    // Tạo user mới
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Trong production nên hash bằng bcrypt
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedUser = await user.save();
    console.log('✅ User created successfully:', savedUser.email);
    
    // Generate auth token
    const authToken = Buffer.from(`${savedUser._id}:${Date.now()}`).toString('base64');
    
    res.status(201).json({ 
      message: 'Tạo tài khoản thành công',
      authToken: authToken, // ✅ ADD TOKEN
      user: { 
        id: savedUser._id, 
        username: savedUser.username, 
        email: savedUser.email,
        fullName: savedUser.fullName
      }
    });
    
  } catch (err) {
    console.error('💥 Register error:', err);
    
    // Xử lý lỗi MongoDB duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field === 'email' ? 'Email' : 'Tên đăng nhập'} đã tồn tại` 
      });
    }
    
    res.status(500).json({ 
      error: 'Lỗi server khi tạo tài khoản',
      details: err.message 
    });
  }
});

// =============================================
// DEBUG: Get or Create Demo User
// =============================================
router.get('/demo-user', async (req, res) => {
  try {
    console.log('🔍 Looking for demo user...');
    
    // Try to find existing demo user
    let user = await User.findOne({ username: 'demo' });
    
    if (!user) {
      console.log('📝 Creating new demo user...');
      // Create demo user
      user = new User({
        username: 'demo',
        email: 'demo@example.com',
        password: 'demo123',
        fullName: 'Demo User',
        phone: '0123456789'
      });
      await user.save();
      console.log('✅ Demo user created:', user._id);
    }
    
    res.json({
      success: true,
      message: 'Demo user found/created',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Error with demo user:', error);
    res.status(500).json({ 
      error: 'Error getting demo user',
      details: error.message 
    });
  }
});

module.exports = router;