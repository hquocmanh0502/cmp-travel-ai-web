require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

async function cleanupIndexes() {
  try {
    // Kết nối MongoDB
    await connectDB();
    console.log('✅ MongoDB Connected');

    const Blog = mongoose.connection.collection('blogs');
    
    // Xóa collection và index cũ
    await Blog.drop().catch(() => console.log('Collection không tồn tại hoặc đã trống'));
    console.log('🗑️  Dropped blogs collection');

    console.log('✅ Cleanup completed! Bạn có thể chạy add-sample-blogs.js bây giờ.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupIndexes();
