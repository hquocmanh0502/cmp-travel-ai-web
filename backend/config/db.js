// backend/config/db.js
const mongoose = require('mongoose');
const dns = require('dns');

// Trên Windows, c-ares đôi khi đọc nhầm DNS server thành 127.0.0.1 (máy có nhiều
// adapter ảo). dns.lookup() vẫn chạy nhưng resolveSrv() bị ECONNREFUSED, làm
// connection string mongodb+srv:// không kết nối được. Fallback sang DNS công cộng.
const resolvers = dns.getServers();
if (resolvers.every(s => s === '127.0.0.1' || s === '::1')) {
  console.warn('⚠️  DNS resolver không hợp lệ (127.0.0.1), chuyển sang 1.1.1.1 / 8.8.8.8');
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;