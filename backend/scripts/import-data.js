const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models - sử dụng models đã có (safe import)
const User = require('../models/User');
const Tour = require('../models/Tour');

// Import các models khác nếu tồn tại
let Blog, Feedback, Hotel, Comment;

try {
  Blog = require('../models/Blog');
  console.log('✅ Blog model loaded');
} catch (e) {
  console.log('⚠️ Blog model not found, skipping blog import');
}

try {
  Feedback = require('../models/Feedback');
  console.log('✅ Feedback model loaded');
} catch (e) {
  console.log('⚠️ Feedback model not found, skipping feedback import');
}

try {
  Hotel = require('../models/Hotel');
  console.log('✅ Hotel model loaded');
} catch (e) {
  console.log('⚠️ Hotel model not found, skipping hotel import');
}

try {
  Comment = require('../models/Comment');
  console.log('✅ Comment model loaded');
} catch (e) {
  console.log('⚠️ Comment model not found, skipping comment import');
}

// Load environment variables
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Atlas connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Function to clean database and drop conflicting indexes
const cleanDatabase = async () => {
  try {
    console.log('🧹 Cleaning database and indexes...');
    
    // Drop all collections to start fresh
    await mongoose.connection.db.dropCollection('tours').catch(() => {});
    await mongoose.connection.db.dropCollection('users').catch(() => {});
    await mongoose.connection.db.dropCollection('blogs').catch(() => {});
    await mongoose.connection.db.dropCollection('feedbacks').catch(() => {});
    await mongoose.connection.db.dropCollection('hotels').catch(() => {});
    await mongoose.connection.db.dropCollection('comments').catch(() => {});
    
    console.log('✅ Database cleaned successfully');
  } catch (error) {
    console.log('⚠️ Error cleaning database:', error.message);
  }
};

// Import data function
const importData = async () => {
  try {
    console.log('🚀 Starting comprehensive data import...');
    
    // Clean database first
    await cleanDatabase();

    // 1. Import Tours
    const tourDataPath = path.join(__dirname, '../../data/data.json');
    if (fs.existsSync(tourDataPath)) {
      const toursData = JSON.parse(fs.readFileSync(tourDataPath, 'utf8'));
      
      // Enhance tour data với proper ID field
      const enhancedTours = toursData.map((tour, index) => ({
        // Ensure we have an ID field - use original id or create one
        id: tour.id || (index + 1).toString(),
        name: tour.name,
        country: tour.country,
        description: tour.description,
        img: tour.img,
        rating: tour.rating || 4.5,
        estimatedCost: tour.estimatedCost,
        attractions: tour.attractions || [],
        food: tour.food || [],
        
        // Required fields
        duration: tour.duration || '5 days',
        type: tour.estimatedCost > 6000 ? 'international' : 'domestic',
        
        // Pricing object
        pricing: {
          adult: tour.estimatedCost,
          child: Math.round(tour.estimatedCost * 0.7),
          infant: Math.round(tour.estimatedCost * 0.1),
          groupDiscount: 0
        },
        
        // Additional fields
        maxGroupSize: 20,
        minAge: 0,
        inclusions: [
          'Accommodation',
          'Transportation', 
          'Tour guide',
          'Entrance fees'
        ],
        exclusions: [
          'Personal expenses',
          'Travel insurance',
          'Tips'
        ],
        
        // Location info
        location: {
          coordinates: [106.6297, 10.8231],
          address: `${tour.name}, ${tour.country}`,
          region: tour.country
        },
        
        // Analytics cho AI
        analytics: {
          viewCount: Math.floor(Math.random() * 1000),
          wishlistCount: Math.floor(Math.random() * 100),
          bookingCount: Math.floor(Math.random() * 50),
          averageRating: tour.rating || 4.5,
          sentimentScore: Math.random() * 0.6 + 0.2,
          popularityScore: Math.random()
        },
        
        // SEO and tags
        tags: [
          tour.country.toLowerCase(),
          tour.estimatedCost > 5000 ? 'luxury' : 'budget',
          'popular'
        ],
        difficulty: 'moderate',
        bestTimeToVisit: ['spring', 'summer', 'fall'],
        
        // Status
        status: 'active',
        featured: Math.random() > 0.7
      }));

      const importedTours = await Tour.insertMany(enhancedTours);
      console.log(`✅ ${importedTours.length} tours imported`);
    } else {
      console.log('⚠️ Tour data file not found at:', tourDataPath);
    }

    // 2. Import Blogs
    if (Blog) {
      const blogDataPath = path.join(__dirname, '../../data/blog.json');
      if (fs.existsSync(blogDataPath)) {
        try {
          const blogsData = JSON.parse(fs.readFileSync(blogDataPath, 'utf8'));
          const importedBlogs = await Blog.insertMany(blogsData);
          console.log(`✅ ${importedBlogs.length} blogs imported`);
        } catch (blogError) {
          console.log('⚠️ Blog import error:', blogError.message);
        }
      } else {
        console.log('⚠️ Blog data file not found');
      }
    }

    // 3. Import sample Users with AI preferences
    const sampleUsers = [
      {
        username: 'admin',
        email: 'admin@cmptravel.com',
        password: 'admin123',
        fullName: 'CMP Travel Admin',
        phone: '+84123456789',
        verified: true,
        preferences: {
          budgetRange: { min: 3000, max: 10000 },
          favoriteCountries: ['Japan', 'Italy', 'France', 'Switzerland'],
          favoriteDestinations: ['Tokyo', 'Paris', 'Rome', 'Zurich'],
          travelStyle: ['luxury', 'cultural'],
          hotelPreferences: {
            rating: 5,
            amenities: ['wifi', 'pool', 'spa', 'gym'],
            roomType: 'suite'
          },
          activities: ['sightseeing', 'cultural', 'food', 'shopping'],
          climatePreference: 'temperate'
        },
        behavior: {
          searchHistory: [],
          viewHistory: [],
          wishlist: [],
          bookingHistory: []
        }
      },
      {
        username: 'demo_user',
        email: 'demo@example.com',
        password: 'demo123',
        fullName: 'Demo User',
        phone: '+84987654321',
        verified: true,
        preferences: {
          budgetRange: { min: 2000, max: 6000 },
          favoriteCountries: ['Thailand', 'Vietnam', 'Malaysia', 'Singapore'],
          favoriteDestinations: ['Bangkok', 'Ho Chi Minh', 'Kuala Lumpur'],
          travelStyle: ['budget', 'adventure'],
          hotelPreferences: {
            rating: 3,
            amenities: ['wifi', 'breakfast'],
            roomType: 'double'
          },
          activities: ['adventure', 'beaches', 'food'],
          climatePreference: 'tropical'
        },
        behavior: {
          searchHistory: [],
          viewHistory: [],
          wishlist: [],
          bookingHistory: []
        }
      },
      {
        username: 'traveler_pro',
        email: 'traveler@example.com',
        password: 'travel123',
        fullName: 'Professional Traveler',
        phone: '+84555666777',
        verified: true,
        preferences: {
          budgetRange: { min: 1500, max: 4000 },
          favoriteCountries: ['Korea', 'China', 'Taiwan', 'Hong Kong'],
          favoriteDestinations: ['Seoul', 'Beijing', 'Taipei'],
          travelStyle: ['cultural', 'adventure'],
          hotelPreferences: {
            rating: 4,
            amenities: ['wifi', 'gym', 'pool'],
            roomType: 'single'
          },
          activities: ['cultural', 'shopping', 'nightlife'],
          climatePreference: 'temperate'
        },
        behavior: {
          searchHistory: [],
          viewHistory: [],
          wishlist: [],
          bookingHistory: []
        }
      }
    ];
    
    const importedUsers = await User.insertMany(sampleUsers);
    console.log(`✅ ${importedUsers.length} users imported`);

    // 4. Import sample Feedbacks (if model exists)
    if (Feedback) {
      try {
        const tours = await Tour.find().limit(3);
        if (tours.length > 0) {
          const sampleFeedbacks = [
            {
              user: importedUsers[0]._id,
              tour: tours[0]._id,
              name: 'Nguyễn Văn A',
              email: 'nguyenvana@email.com',
              rating: 5,
              feedback: 'Tour rất tuyệt vời! Hướng dẫn viên nhiệt tình, địa điểm đẹp. Tôi rất hài lòng với dịch vụ và sẽ giới thiệu cho bạn bè.',
              sentiment: {
                score: 0.85,
                label: 'positive',
                confidence: 0.92
              },
              keywords: ['tuyệt vời', 'nhiệt tình', 'đẹp', 'hài lòng'],
              categories: ['service', 'location', 'guide'],
              isApproved: true,
              verified: {
                isVerified: true,
                verifiedAt: new Date()
              }
            },
            {
              user: importedUsers[1]._id,
              tour: tours[1] ? tours[1]._id : tours[0]._id,
              name: 'Trần Thị B',
              email: 'tranthib@email.com',
              rating: 4,
              feedback: 'Chuyến đi khá ổn, tuy nhiên giá hơi cao so với dịch vụ. Nhưng nhìn chung vẫn đáng để trải nghiệm.',
              sentiment: {
                score: 0.15,
                label: 'neutral',
                confidence: 0.78
              },
              keywords: ['ổn', 'cao', 'đáng', 'trải nghiệm'],
              categories: ['price', 'service'],
              isApproved: true,
              verified: {
                isVerified: true,
                verifiedAt: new Date()
              }
            }
          ];
          
          const importedFeedbacks = await Feedback.insertMany(sampleFeedbacks);
          console.log(`✅ ${importedFeedbacks.length} feedbacks imported`);
        }
      } catch (feedbackError) {
        console.log('⚠️ Feedback import error:', feedbackError.message);
      }
    }

    // 5. Import Hotels
    if (Hotel) {
      try {
        const sampleHotels = [
          {
            name: 'Tokyo Grand Hotel',
            location: {
              address: '1-1-1 Shibuya, Tokyo, Japan',
              coordinates: [139.7006, 35.6594],
              city: 'Tokyo',
              country: 'Japan'
            },
            details: {
              rating: 4.8,
              priceRange: { min: 200, max: 500 },
              amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant'],
              roomTypes: [
                { type: 'Standard', price: 200, capacity: 2, amenities: ['wifi', 'tv'] },
                { type: 'Deluxe', price: 300, capacity: 2, amenities: ['wifi', 'tv', 'minibar'] },
                { type: 'Suite', price: 500, capacity: 4, amenities: ['wifi', 'tv', 'minibar', 'balcony'] }
              ],
              images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500']
            },
            aiScore: {
              valueForMoney: 0.85,
              locationScore: 0.92,
              serviceScore: 0.88
            }
          },
          {
            name: 'Hanoi Heritage Hotel',
            location: {
              address: '15 Hoan Kiem Lake, Hanoi, Vietnam',
              coordinates: [105.8542, 21.0285],
              city: 'Hanoi',
              country: 'Vietnam'
            },
            details: {
              rating: 4.5,
              priceRange: { min: 80, max: 200 },
              amenities: ['wifi', 'restaurant', 'spa', 'concierge'],
              roomTypes: [
                { type: 'Standard', price: 80, capacity: 2, amenities: ['wifi', 'ac'] },
                { type: 'Superior', price: 120, capacity: 2, amenities: ['wifi', 'ac', 'balcony'] }
              ],
              images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=500']
            },
            aiScore: {
              valueForMoney: 0.90,
              locationScore: 0.95,
              serviceScore: 0.82
            }
          }
        ];

        const importedHotels = await Hotel.insertMany(sampleHotels);
        console.log(`✅ ${importedHotels.length} hotels imported`);
      } catch (hotelError) {
        console.log('⚠️ Hotel import error:', hotelError.message);
      }
    }

    // 6. Import Comments with AI analysis
    if (Comment) {
      try {
        const users = await User.find({});
        const tours = await Tour.find({}).limit(3);
        
        if (users.length > 0 && tours.length > 0) {
          const sampleComments = [
            {
              tourId: tours[0]._id,
              userId: users[0]._id,
              content: {
                text: 'Tour tuyệt vời! Hướng dẫn viên rất nhiệt tình và am hiểu. Cảnh đẹp, đồ ăn ngon. Sẽ quay lại chắc chắn!',
                rating: 5,
                images: ['https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400']
              },
              verified: {
                isVerified: true,
                bookingId: 'BK001',
                verifiedAt: new Date()
              },
              aiAnalysis: {
                sentiment: {
                  score: 0.85,
                  label: 'positive',
                  confidence: 0.92
                },
                keywords: ['tuyệt vời', 'nhiệt tình', 'cảnh đẹp', 'ngon'],
                categories: ['guide', 'food', 'activities'],
                emotions: ['happy', 'excited'],
                language: 'vi',
                toxicity: 0.05
              },
              moderation: {
                status: 'approved',
                moderatedBy: users[0]._id,
                reason: 'Auto-approved: positive sentiment'
              }
            },
            {
              tourId: tours[1] ? tours[1]._id : tours[0]._id,
              userId: users[1] ? users[1]._id : users[0]._id,
              content: {
                text: 'Chuyến đi khá ổn, tuy nhiên giá hơi cao so với dịch vụ. Nhưng nhìn chung vẫn đáng để trải nghiệm.',
                rating: 3
              },
              verified: {
                isVerified: true,
                bookingId: 'BK002',
                verifiedAt: new Date()
              },
              aiAnalysis: {
                sentiment: {
                  score: 0.15,
                  label: 'neutral',
                  confidence: 0.78
                },
                keywords: ['ổn', 'cao', 'đáng', 'trải nghiệm'],
                categories: ['price', 'service'],
                emotions: ['neutral'],
                language: 'vi',
                toxicity: 0.02
              },
              moderation: {
                status: 'approved',
                moderatedBy: users[0]._id,
                reason: 'Auto-approved: neutral sentiment'
              }
            }
          ];

          const importedComments = await Comment.insertMany(sampleComments);
          console.log(`✅ ${importedComments.length} comments imported`);
        }
      } catch (commentError) {
        console.log('⚠️ Comment import error:', commentError.message);
      }
    }

    console.log('🎉 Comprehensive data import completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Tours: ${await Tour.countDocuments()}`);
    console.log(`   - Users: ${await User.countDocuments()}`);
    if (Blog) console.log(`   - Blogs: ${await Blog.countDocuments()}`);
    if (Feedback) console.log(`   - Feedbacks: ${await Feedback.countDocuments()}`);
    if (Hotel) console.log(`   - Hotels: ${await Hotel.countDocuments()}`);
    if (Comment) console.log(`   - Comments: ${await Comment.countDocuments()}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('Error details:', error.message);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await importData();
    console.log('🏁 Import finished! Disconnecting...');
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { importData };