require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Blog = require('./models/Blog');

async function checkBlogs() {
  try {
    await connectDB();
    console.log('✅ MongoDB Connected\n');

    // Đếm số lượng blogs
    const count = await Blog.countDocuments();
    console.log(`📊 Total blogs: ${count}\n`);

    // Lấy tất cả blogs
    const blogs = await Blog.find().sort({ createdAt: -1 });
    
    if (blogs.length === 0) {
      console.log('⚠️  Không có blog nào trong database!');
    } else {
      console.log('📚 Danh sách blogs:\n');
      blogs.forEach((blog, index) => {
        console.log(`${index + 1}. ${blog.title}`);
        console.log(`   ID: ${blog._id}`);
        console.log(`   Author: ${blog.author}`);
        console.log(`   Category: ${blog.category}`);
        console.log(`   Status: ${blog.status}`);
        console.log(`   Views: ${blog.views}`);
        console.log(`   Created: ${blog.createdAt}`);
        console.log('');
      });
    }

    // Kiểm tra indexes
    const indexes = await Blog.collection.getIndexes();
    console.log('🔍 Indexes hiện tại:');
    console.log(JSON.stringify(indexes, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBlogs();
