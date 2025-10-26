// Add sample reviews to test reply functionality
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Tour = require('../models/Tour');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function addSampleReviews() {
    try {
        // Connect to MongoDB
        const MONGODB_URI = 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get first tour
        const tour = await Tour.findOne();
        if (!tour) {
            console.log('❌ No tours found');
            return;
        }
        console.log('🎯 Tour:', tour.name, '(ID:', tour._id, ')');

        // Get first user (or create demo user)
        let user = await User.findOne();
        if (!user) {
            user = await User.create({
                username: 'demo',
                email: 'demo@example.com',
                password: 'demo123',
                fullName: 'Demo User'
            });
            console.log('✅ Created demo user');
        }
        console.log('👤 User:', user.username, '(ID:', user._id, ')');

        // Check if reviews already exist
        const existing = await Comment.find({ tourId: tour._id });
        if (existing.length > 0) {
            console.log(`⚠️ Found ${existing.length} existing reviews for this tour`);
            console.log('Do you want to add more? (This script will add 3 sample reviews)');
        }

        // Create 3 sample reviews
        const sampleReviews = [
            {
                tourId: tour._id,
                userId: user._id,
                content: {
                    text: 'Amazing tour! Everything was perfect from start to finish. The guide was knowledgeable and friendly. Highly recommended!',
                    rating: 5
                },
                verified: {
                    isVerified: true,
                    verifiedAt: new Date()
                },
                moderation: {
                    status: 'approved'
                },
                replies: []
            },
            {
                tourId: tour._id,
                userId: user._id,
                content: {
                    text: 'Great experience overall. The accommodation was comfortable and the itinerary was well-planned. Would love to come back!',
                    rating: 4
                },
                verified: {
                    isVerified: true,
                    verifiedAt: new Date()
                },
                moderation: {
                    status: 'approved'
                },
                replies: []
            },
            {
                tourId: tour._id,
                userId: user._id,
                content: {
                    text: 'Unforgettable journey! The landscapes were breathtaking and the local food was delicious. Best vacation ever!',
                    rating: 5
                },
                verified: {
                    isVerified: true,
                    verifiedAt: new Date()
                },
                moderation: {
                    status: 'approved'
                },
                replies: [
                    {
                        userId: user._id,
                        text: 'Thank you for your wonderful feedback! We\'re so happy you enjoyed your trip. Hope to see you again soon!',
                        isAdmin: true,
                        adminRole: 'customer_service',
                        timestamp: new Date()
                    }
                ]
            }
        ];

        const createdReviews = await Comment.insertMany(sampleReviews);
        console.log(`✅ Added ${createdReviews.length} sample reviews`);

        console.log('\n📊 Summary:');
        console.log(`Tour: ${tour.name}`);
        console.log(`Tour ID: ${tour._id}`);
        console.log(`Total reviews: ${existing.length + createdReviews.length}`);
        console.log(`\n🌐 Test URL: http://localhost:5500/frontend/detail.html?id=${tour._id}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addSampleReviews();
