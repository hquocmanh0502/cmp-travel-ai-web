const mongoose = require('mongoose');

// Schema cho Blog (lưu chi tiết du lịch như geography, climate...)
const blogSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // ID từ JSON, unique để tránh trùng
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String },
  images: [String], // Array hình ảnh
  geography: { type: String },
  climate: { type: String },
  language: { type: String },
  people: { type: String },
  createdAt: { type: Date, default: Date.now } // Thời gian tạo tự động
});

// Export model để backend dùng (query/insert)
module.exports = mongoose.model('Blog', blogSchema);