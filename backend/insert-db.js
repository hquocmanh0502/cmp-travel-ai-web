// backend/insert-db.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect Atlas
mongoose.connect('mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority')
  .then(() => console.log('🌟 Kết nối database thành công!'))
  .catch(err => console.error('❌ Lỗi connect:', err));

// Import models
const Tour = require('./models/Tour');
const Blog = require('./models/Blog');
const User = require('./models/User');
const Feedback = require('./models/Feedback');

const insertAllData = async () => {
  try {
    console.log('🚀 Bắt đầu insert dữ liệu...');

    // 1. Insert Tours
    const tourFilePath = path.join(__dirname, '../data/data.json');
    
    if (!fs.existsSync(tourFilePath)) {
      console.error('❌ Không tìm thấy file data.json tại:', tourFilePath);
      console.log('📁 Tạo dữ liệu mẫu...');
      
      // Tạo dữ liệu mẫu nếu không có file
      const sampleTours = [
        {
          id: "japan-01",
          name: "Tokyo Adventure",
          country: "Japan",
          description: "Khám phá thủ đô sôi động của Nhật Bản với những trải nghiệm văn hóa độc đáo.",
          attractions: ["Tokyo Tower", "Senso-ji Temple", "Shibuya Crossing"],
          estimatedCost: 5500,
          rating: 4.8,
          activity: ["sightseeing", "cultural", "shopping"],
          food: ["sushi", "ramen", "tempura"],
          img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500"
        },
        {
          id: "italy-01",
          name: "Rome History Tour",
          country: "Italy",
          description: "Khám phá những di tích lịch sử cổ kính của thành phố Rome.",
          attractions: ["Colosseum", "Vatican City", "Trevi Fountain"],
          estimatedCost: 4200,
          rating: 4.7,
          activity: ["historical", "cultural", "walking"],
          food: ["pasta", "pizza", "gelato"],
          img: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500"
        }
      ];
      
      await Tour.deleteMany({});
      const insertedTours = await Tour.insertMany(sampleTours.map(tour => ({
        ...tour,
        categories: {
          travelStyle: tour.estimatedCost > 5000 ? ['luxury'] : ['budget'],
          difficulty: 'moderate',
          bestFor: ['couples', 'families'],
          season: ['spring', 'summer'],
          climate: 'temperate'
        },
        viewCount: Math.floor(Math.random() * 1000),
        bookingCount: Math.floor(Math.random() * 100),
        popularityScore: Math.random()
      })));
      console.log(`✅ Insert ${insertedTours.length} sample tours thành công!`);
      
    } else {
      const tourJsonData = fs.readFileSync(tourFilePath, 'utf8');
      const tourData = JSON.parse(tourJsonData);

      await Tour.deleteMany({});
      const insertedTours = await Tour.insertMany(tourData.map(tour => ({
        ...tour,
        categories: {
          travelStyle: tour.estimatedCost > 5000 ? ['luxury'] : ['budget'],
          difficulty: 'moderate',
          bestFor: ['couples', 'families'],
          season: ['spring', 'summer'],
          climate: 'temperate'
        },
        viewCount: Math.floor(Math.random() * 1000),
        bookingCount: Math.floor(Math.random() * 100),
        popularityScore: Math.random()
      })));
      console.log(`✅ Insert ${insertedTours.length} tours thành công!`);
    }

    // 2. Insert Blogs
    const blogFilePath = path.join(__dirname, '../data/blog.json');
    
    if (!fs.existsSync(blogFilePath)) {
      console.log('📝 Tạo blog mẫu...');
      const sampleBlogs = [
        {
          id: 1,
          title: "Du lịch Nhật Bản - Kinh nghiệm từ A-Z",
          description: "Hướng dẫn chi tiết cho chuyến du lịch Nhật Bản đầu tiên",
          thumbnail: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500",
          images: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500"],
          geography: "Nhật Bản là quốc gia đảo ở Đông Á",
          climate: "Khí hậu ôn đới ẩm",
          language: "Tiếng Nhật",
          people: "Người dân thân thiện và lịch sự"
        }
      ];
      
      await Blog.deleteMany({});
      const insertedBlogs = await Blog.insertMany(sampleBlogs);
      console.log(`✅ Insert ${insertedBlogs.length} sample blogs thành công!`);
    } else {
      const blogJsonData = fs.readFileSync(blogFilePath, 'utf8');
      const blogData = JSON.parse(blogJsonData);

      await Blog.deleteMany({});
      const insertedBlogs = await Blog.insertMany(blogData);
      console.log(`✅ Insert ${insertedBlogs.length} blogs thành công!`);
    }

    // 3. Insert sample Users
    await User.deleteMany({});
    const sampleUsers = [
      {
        username: 'admin',
        email: 'admin@cmptravel.com',
        password: 'admin123',
        fullName: 'Admin CMP Travel',
        phone: '+84123456789',
        preferences: {
          budgetRange: { min: 3000, max: 8000 },
          favoriteCountries: ['Japan', 'Italy', 'France'],
          travelStyle: 'luxury',
          activities: ['sightseeing', 'cultural', 'food'],
          climatePreference: 'temperate'
        }
      },
      {
        username: 'demo_user',
        email: 'demo@example.com',
        password: 'demo123',
        fullName: 'Demo User',
        phone: '+84987654321',
        preferences: {
          budgetRange: { min: 2000, max: 5000 },
          favoriteCountries: ['Thailand', 'Vietnam', 'Malaysia'],
          travelStyle: 'budget',
          activities: ['adventure', 'beaches'],
          climatePreference: 'tropical'
        }
      }
    ];
    const insertedUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Insert ${insertedUsers.length} users thành công!`);

    // 4. Insert sample Feedbacks
    const tours = await Tour.find().limit(2);
    
    await Feedback.deleteMany({});
    const sampleFeedbacks = [
      {
        user: insertedUsers[0]._id,
        tour: tours[0]._id,
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@email.com',
        rating: 5,
        feedback: 'Tour rất tuyệt vời! Hướng dẫn viên nhiệt tình, địa điểm đẹp. Tôi rất hài lòng với dịch vụ.',
        sentiment: {
          score: 0.8,
          label: 'positive',
          confidence: 0.9
        },
        keywords: ['tuyệt vời', 'nhiệt tình', 'đẹp', 'hài lòng'],
        categories: ['service', 'location'],
        isApproved: true
      },
      {
        user: insertedUsers[1]._id,
        tour: tours[1] ? tours[1]._id : tours[0]._id,
        name: 'Trần Thị B',
        email: 'tranthib@email.com',
        rating: 4,
        feedback: 'Chuyến đi khá ổn, tuy nhiên giá hơi cao so với dịch vụ. Nhưng nhìn chung vẫn đáng để trải nghiệm.',
        sentiment: {
          score: 0.2,
          label: 'neutral',
          confidence: 0.7
        },
        keywords: ['ổn', 'cao', 'đáng', 'trải nghiệm'],
        categories: ['price', 'service'],
        isApproved: true
      }
    ];
    const insertedFeedbacks = await Feedback.insertMany(sampleFeedbacks);
    console.log(`✅ Insert ${insertedFeedbacks.length} feedbacks thành công!`);

    console.log('🎉 Insert tất cả dữ liệu thành công!');
    console.log('📊 Tổng kết:');
    console.log(`   - Tours: ${tours.length}`);
    console.log(`   - Blogs: ${await Blog.countDocuments()}`);
    console.log(`   - Users: ${insertedUsers.length}`);
    console.log(`   - Feedbacks: ${insertedFeedbacks.length}`);

  } catch (err) {
    console.error('❌ Lỗi insert:', err);
  } finally {
    mongoose.connection.close();
    console.log('🔒 Đã đóng kết nối database');
  }
};

// Chạy function
insertAllData();