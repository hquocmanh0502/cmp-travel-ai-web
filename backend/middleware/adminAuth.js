// Admin Authentication Middleware
//
// Trước đây file này chỉ gọi next() cho mọi request, nghĩa là toàn bộ API quản trị
// (xoá tour, xem doanh thu, khoá tài khoản...) mở cho bất kỳ ai biết URL.
// Giờ nó dùng chung tầng xác thực JWT ở middleware/auth.js.
//
// Giữ lại tên isAdmin để các route đang import không phải sửa.

const { requireAdmin } = require('./auth');

module.exports = { isAdmin: requireAdmin, requireAdmin };
