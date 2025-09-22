const mongoose = require('mongoose');
const fs = require('fs'); // Để đọc file JSON
require('dotenv').config();

// Connect Atlas (thay bằng string của bạn)
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority')
  .then(() => console.log('Kết nối traveldb thành công! Bắt đầu insert blog siêu đỉnh! 🌟'))
  .catch(err => console.error('Lỗi connect:', err));

// Model Blog (dựa sơ đồ trước, với ref nếu cần sau)
const blogSchema = new mongoose.Schema({
  id: Number,
  title: String,
  description: String,
  thumbnail: String,
  images: [String],
  geography: String,
  climate: String,
  language: String,
  people: String
});
const Blog = mongoose.model('Blog', blogSchema);

// Function đọc file và insert
const insertBlog = async () => {
  try {
    // Đường dẫn file blog.json (thay bằng path thật trên máy bạn, ví dụ E:\cmp-travel-main\data\blog.json)
    const filePath = 'E:\\cmp-travel-main\\data\\blog.json'; // Hoặc 'E:\\cmp-travel-main\\data\\blog.json' nếu ở folder data
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const blogData = JSON.parse(jsonData); // Parse file thành array

    await Blog.deleteMany({}); // Xóa cũ nếu cần test lại (optional, cẩn thận nếu có data quan trọng!)
    const inserted = await Blog.insertMany(blogData);
    console.log(`Insert blog thành công! Bơm ${inserted.length} blogs vào DB – từ Maldives Paradise đến Vancouver Beauty, AI blog du lịch sẵn sàng "wow"! 📝`);
  } catch (err) {
    console.error('Lỗi insert blog:', err);
  } finally {
    mongoose.connection.close();
  }
};

// Chạy function
insertBlog();