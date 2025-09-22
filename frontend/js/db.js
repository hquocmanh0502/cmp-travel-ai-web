const mongoose = require('mongoose');
const fs = require('fs'); // Để đọc file JSON local
require('dotenv').config();

// Connect Atlas (thay bằng string của bạn)
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority')
  .then(() => console.log('Kết nối traveldb thành công! Bắt đầu chèn file JSON siêu đỉnh! 🌟'))
  .catch(err => console.error('Lỗi connect:', err));

// Model Tours (như trước)
const tourSchema = new mongoose.Schema({
  name: String,
  country: String,
  description: String,
  attractions: [String],
  estimatedCost: String,
  rating: String,
  activity: [String],
  food: [String],
  id: String,
  img: String
});
const Tour = mongoose.model('Tour', tourSchema);

// Function đọc file và insert
const insertFromFile = async () => {
  try {
    // Đường dẫn file local (thay bằng path file data.json trên máy bạn, ví dụ C:/Users/YourName/data.json)
    const filePath = 'E:/cmp-travel-main/data/data.json'; // Hoặc 'C:/path/to/your/data.json'
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const tourData = JSON.parse(jsonData); // Parse file thành array

    await Tour.deleteMany({}); // Xóa cũ nếu cần test lại (optional)
    const inserted = await Tour.insertMany(tourData);
    console.log(`Chèn file thành công! Imported ${inserted.length} tours từ data.json – Maldives đến Barcelona đầy ắp! 🗺️`);
  } catch (err) {
    console.error('Lỗi chèn file:', err);
  } finally {
    mongoose.connection.close();
  }
};

// Chạy function
insertFromFile();