require('dotenv').config();
const mongoose = require('mongoose');
const TourGuide = require('../models/TourGuide');
const GuideReview = require('../models/GuideReview');
const User = require('../models/User');
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const sampleGuides = [
  {
    name: 'Nguyễn Văn An',
    email: 'nguyen.an@cmptravel.com',
    phone: '0901234567',
    avatar: 'https://i.pravatar.cc/300?img=12',
    bio: 'Passionate tour guide with over 10 years of experience exploring Vietnam. Specialized in cultural tours and adventure activities. Fluent in English, French, and Vietnamese.',
    dateOfBirth: new Date('1985-05-15'),
    gender: 'male',
    languages: ['Vietnamese', 'English', 'French'],
    specialties: ['Cultural Tours', 'Adventure Activities', 'Historical Sites', 'Photography Tours'],
    experience: 10,
    certifications: [
      {
        name: 'Licensed Tour Guide',
        issuedBy: 'Vietnam Tourism Authority',
        issuedDate: new Date('2014-01-15'),
        expiryDate: new Date('2026-01-15')
      },
      {
        name: 'First Aid Certified',
        issuedBy: 'Red Cross Vietnam',
        issuedDate: new Date('2023-06-01'),
        expiryDate: new Date('2025-06-01')
      },
      {
        name: 'Adventure Activity Instructor',
        issuedBy: 'Outdoor Education Association',
        issuedDate: new Date('2015-03-20')
      }
    ],
    status: 'active',
    availability: 'available',
    salary: {
      baseRate: 200,
      currency: 'USD'
    },
    address: 'Ho Chi Minh City, Vietnam',
    emergencyContact: {
      name: 'Nguyễn Thị Bình',
      phone: '0987654321',
      relationship: 'Spouse'
    }
  },
  {
    name: 'Trần Thị Mai',
    email: 'tran.mai@cmptravel.com',
    phone: '0912345678',
    avatar: 'https://i.pravatar.cc/300?img=47',
    bio: 'Enthusiastic guide specializing in culinary tours and local food experiences. Love sharing Vietnamese culture through its amazing cuisine. 8 years of guiding experience.',
    dateOfBirth: new Date('1990-08-20'),
    gender: 'female',
    languages: ['Vietnamese', 'English', 'Korean'],
    specialties: ['Culinary Tours', 'Food & Drink', 'Local Markets', 'Cooking Classes'],
    experience: 8,
    certifications: [
      {
        name: 'Licensed Tour Guide',
        issuedBy: 'Vietnam Tourism Authority',
        issuedDate: new Date('2016-05-10'),
        expiryDate: new Date('2026-05-10')
      },
      {
        name: 'Food Safety Certificate',
        issuedBy: 'Ministry of Health',
        issuedDate: new Date('2022-03-15'),
        expiryDate: new Date('2025-03-15')
      }
    ],
    status: 'active',
    availability: 'available',
    salary: {
      baseRate: 180,
      currency: 'USD'
    },
    address: 'Hanoi, Vietnam',
    emergencyContact: {
      name: 'Trần Văn Cường',
      phone: '0976543210',
      relationship: 'Sibling'
    }
  },
  {
    name: 'Lê Hoàng Phúc',
    email: 'le.phuc@cmptravel.com',
    phone: '0923456789',
    avatar: 'https://i.pravatar.cc/300?img=33',
    bio: 'Adventure specialist with expertise in trekking, mountain climbing, and eco-tours. Certified in outdoor safety and wilderness first aid. 12 years guiding experience.',
    dateOfBirth: new Date('1982-03-10'),
    gender: 'male',
    languages: ['Vietnamese', 'English', 'Chinese'],
    specialties: ['Trekking', 'Mountain Climbing', 'Eco-Tours', 'Wildlife Photography'],
    experience: 12,
    certifications: [
      {
        name: 'Licensed Tour Guide',
        issuedBy: 'Vietnam Tourism Authority',
        issuedDate: new Date('2012-02-01'),
        expiryDate: new Date('2027-02-01')
      },
      {
        name: 'Wilderness First Aid',
        issuedBy: 'Wilderness Medical Associates',
        issuedDate: new Date('2023-01-10'),
        expiryDate: new Date('2026-01-10')
      },
      {
        name: 'Mountain Guide Certification',
        issuedBy: 'International Mountain Guides',
        issuedDate: new Date('2013-07-15')
      }
    ],
    status: 'active',
    availability: 'available',
    salary: {
      baseRate: 250,
      currency: 'USD'
    },
    address: 'Da Lat, Vietnam',
    emergencyContact: {
      name: 'Lê Thị Hương',
      phone: '0965432109',
      relationship: 'Spouse'
    }
  },
  {
    name: 'Phạm Minh Tuấn',
    email: 'pham.tuan@cmptravel.com',
    phone: '0934567890',
    avatar: 'https://i.pravatar.cc/300?img=15',
    bio: 'Beach and coastal tour expert. Specialized in water sports, island hopping, and marine activities. Fun and energetic guide with 6 years experience.',
    dateOfBirth: new Date('1992-11-25'),
    gender: 'male',
    languages: ['Vietnamese', 'English', 'Japanese'],
    specialties: ['Beach Tours', 'Water Sports', 'Island Hopping', 'Scuba Diving'],
    experience: 6,
    certifications: [
      {
        name: 'Licensed Tour Guide',
        issuedBy: 'Vietnam Tourism Authority',
        issuedDate: new Date('2018-04-20'),
        expiryDate: new Date('2028-04-20')
      },
      {
        name: 'Scuba Diving Instructor',
        issuedBy: 'PADI',
        issuedDate: new Date('2019-08-15')
      }
    ],
    status: 'active',
    availability: 'busy',
    salary: {
      baseRate: 160,
      currency: 'USD'
    },
    address: 'Nha Trang, Vietnam',
    emergencyContact: {
      name: 'Phạm Văn Long',
      phone: '0954321098',
      relationship: 'Parent'
    }
  },
  {
    name: 'Võ Thị Lan',
    email: 'vo.lan@cmptravel.com',
    phone: '0945678901',
    avatar: 'https://i.pravatar.cc/300?img=44',
    bio: 'Cultural heritage specialist with deep knowledge of Vietnamese history and traditions. Expert in temple tours and traditional crafts. 9 years experience.',
    dateOfBirth: new Date('1988-07-18'),
    gender: 'female',
    languages: ['Vietnamese', 'English', 'Thai'],
    specialties: ['Cultural Heritage', 'Temple Tours', 'Traditional Crafts', 'Historical Tours'],
    experience: 9,
    certifications: [
      {
        name: 'Licensed Tour Guide',
        issuedBy: 'Vietnam Tourism Authority',
        issuedDate: new Date('2015-09-10'),
        expiryDate: new Date('2026-09-10')
      },
      {
        name: 'Cultural Heritage Expert',
        issuedBy: 'UNESCO Vietnam',
        issuedDate: new Date('2017-11-20')
      }
    ],
    status: 'active',
    availability: 'unavailable',
    salary: {
      baseRate: 190,
      currency: 'USD'
    },
    address: 'Hue, Vietnam',
    emergencyContact: {
      name: 'Võ Minh Khoa',
      phone: '0943210987',
      relationship: 'Sibling'
    }
  }
];

const createSampleReviews = async (guides, users, tours, bookings) => {
  const reviewTemplates = [
    {
      rating: 5,
      comment: 'Amazing tour guide! Very knowledgeable and friendly. Made our trip unforgettable. Highly recommended!',
      detailedRatings: { knowledge: 5, communication: 5, professionalism: 5, friendliness: 5, punctuality: 5 }
    },
    {
      rating: 5,
      comment: 'Best guide ever! Patient, informative, and really cared about our experience. Thank you so much!',
      detailedRatings: { knowledge: 5, communication: 5, professionalism: 5, friendliness: 5, punctuality: 5 }
    },
    {
      rating: 4,
      comment: 'Great experience overall. Guide was very professional and knowledgeable. Only minor issue was we started a bit late.',
      detailedRatings: { knowledge: 5, communication: 4, professionalism: 5, friendliness: 4, punctuality: 3 }
    },
    {
      rating: 5,
      comment: 'Wonderful tour! Our guide went above and beyond to make sure we had a great time. Very friendly and helpful.',
      detailedRatings: { knowledge: 5, communication: 5, professionalism: 5, friendliness: 5, punctuality: 5 }
    },
    {
      rating: 4,
      comment: 'Very good guide with excellent local knowledge. Sometimes hard to understand but overall great experience.',
      detailedRatings: { knowledge: 5, communication: 3, professionalism: 4, friendliness: 5, punctuality: 4 }
    },
    {
      rating: 5,
      comment: 'Absolutely fantastic! Our guide made the tour so much fun and interesting. Would definitely book again!',
      detailedRatings: { knowledge: 5, communication: 5, professionalism: 5, friendliness: 5, punctuality: 5 }
    },
    {
      rating: 4,
      comment: 'Good tour guide with lots of experience. Very informative and professional throughout the trip.',
      detailedRatings: { knowledge: 5, communication: 4, professionalism: 5, friendliness: 4, punctuality: 4 }
    },
    {
      rating: 5,
      comment: 'Outstanding service! Guide was punctual, knowledgeable, and made everyone feel comfortable. Perfect!',
      detailedRatings: { knowledge: 5, communication: 5, professionalism: 5, friendliness: 5, punctuality: 5 }
    },
    {
      rating: 5,
      comment: 'Incredible experience! Our guide shared so many interesting stories and local insights. Highly recommend!',
      detailedRatings: { knowledge: 5, communication: 5, professionalism: 5, friendliness: 5, punctuality: 5 }
    },
    {
      rating: 4,
      comment: 'Very pleasant tour with a friendly guide. Well organized and informative. Minor delays but nothing major.',
      detailedRatings: { knowledge: 4, communication: 4, professionalism: 4, friendliness: 5, punctuality: 3 }
    }
  ];

  const reviews = [];

  for (const guide of guides) {
    // Each guide gets 3-6 reviews
    const numReviews = Math.floor(Math.random() * 4) + 3;
    
    for (let i = 0; i < numReviews; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomTour = tours[Math.floor(Math.random() * tours.length)];
      const randomBooking = bookings[Math.floor(Math.random() * bookings.length)];
      const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];

      reviews.push({
        userId: randomUser._id,
        guideId: guide._id,
        tourId: randomTour._id,
        bookingId: randomBooking._id,
        rating: template.rating,
        comment: template.comment,
        detailedRatings: template.detailedRatings,
        status: 'approved',
        isVerified: true,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Random date in last 90 days
      });
    }
  }

  return reviews;
};

const seedData = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing tour guides and reviews...');
    await TourGuide.deleteMany({});
    await GuideReview.deleteMany({});

    console.log('👤 Creating tour guides...');
    const createdGuides = await TourGuide.insertMany(sampleGuides);
    console.log(`✅ Created ${createdGuides.length} tour guides`);

    // Get some users, tours, and bookings for reviews
    console.log('📊 Fetching users, tours, and bookings...');
    const users = await User.find().limit(20);
    const tours = await Tour.find().limit(10);
    const bookings = await Booking.find().limit(10);

    if (users.length === 0) {
      console.log('⚠️  No users found. Please create some users first.');
      console.log('💡 Reviews will not be created without users.');
    } else if (tours.length === 0) {
      console.log('⚠️  No tours found. Please create some tours first.');
      console.log('💡 Reviews will not be created without tours.');
    } else if (bookings.length === 0) {
      console.log('⚠️  No bookings found. Reviews will be created without booking references.');
      const reviews = await createSampleReviews(createdGuides, users, tours, [{ _id: null }]);
      console.log('💬 Creating reviews...');
      await GuideReview.insertMany(reviews);
      console.log(`✅ Created ${reviews.length} reviews`);
    } else {
      console.log('💬 Creating reviews...');
      const reviews = await createSampleReviews(createdGuides, users, tours, bookings);
      await GuideReview.insertMany(reviews);
      console.log(`✅ Created ${reviews.length} reviews`);
    }

    // Update guide ratings
    console.log('⭐ Updating guide ratings...');
    for (const guide of createdGuides) {
      await guide.updateRating();
    }
    console.log('✅ All guide ratings updated');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Tour Guides: ${createdGuides.length}`);
    const totalReviews = await GuideReview.countDocuments();
    console.log(`   - Reviews: ${totalReviews}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
