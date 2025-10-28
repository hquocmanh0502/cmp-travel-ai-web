// Add sample reviews for all tours
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Tour = require('../models/Tour');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Sample review templates
const reviewTemplates = [
    {
        rating: 5,
        texts: [
            "Amazing tour! Everything was perfect from start to finish. The guide was knowledgeable and friendly. Highly recommended!",
            "Unforgettable journey! The landscapes were breathtaking and the local food was delicious. Best vacation ever!",
            "Absolutely wonderful experience! Every detail was well-planned and the accommodations were superb.",
            "Outstanding tour! Our guide was fantastic and showed us hidden gems. Would definitely book again!",
            "Perfect trip! Great organization, beautiful sights, and wonderful memories. 5 stars all the way!"
        ]
    },
    {
        rating: 4,
        texts: [
            "Great experience overall. The accommodation was comfortable and the itinerary was well-planned. Would love to come back!",
            "Very good tour with excellent guides. Minor hiccups with transportation but overall very satisfied.",
            "Enjoyed the tour thoroughly. Food was great, places were beautiful. Just wish we had more free time.",
            "Wonderful trip! Everything was well organized. Only suggestion would be more time at certain locations.",
            "Really good tour! The activities were fun and the group was friendly. Would recommend with minor improvements."
        ]
    },
    {
        rating: 5,
        texts: [
            "This tour exceeded all expectations! The guide's knowledge and enthusiasm made it unforgettable.",
            "Fantastic experience! Every moment was special and well worth the investment.",
            "Best tour I've ever been on! The attention to detail and personal touches were incredible.",
            "Simply perfect! From booking to the end of the tour, everything was seamless and enjoyable.",
            "Exceptional tour! Great value for money and created memories that will last a lifetime."
        ]
    },
    {
        rating: 4,
        texts: [
            "Solid tour with great activities. The accommodations were nice and locations were stunning.",
            "Very pleased with this tour. Professional guides and well-planned schedule. Minor room for improvement.",
            "Good tour overall. The highlights were definitely worth it and our guide was very helpful.",
            "Enjoyed every day of the tour. Great mix of activities and relaxation time.",
            "Nice tour! Everything went smoothly and we got to see all the main attractions."
        ]
    },
    {
        rating: 5,
        texts: [
            "Incredible tour! The scenery was stunning and our guide made everything so interesting and fun.",
            "Perfect from start to finish! Couldn't have asked for a better experience.",
            "Amazing adventure! The itinerary was perfectly paced and the food was delicious throughout.",
            "Highly recommend this tour! Professional staff, beautiful locations, and great value.",
            "One of the best trips of my life! Everything exceeded expectations."
        ]
    }
];

// Admin replies
const adminReplies = [
    "Thank you for your wonderful feedback! We're so happy you enjoyed your trip. Hope to see you again soon!",
    "We're thrilled to hear you had such a great experience! Your feedback means a lot to our team.",
    "Thank you for choosing us! We're delighted that you had a memorable journey.",
    "We appreciate your kind words! It's wonderful to know you enjoyed the tour so much.",
    "Thank you for your review! We're glad we could make your trip special.",
    "We're so pleased you had a fantastic time! Thank you for sharing your experience.",
    "Your feedback is invaluable to us. Thank you for the great review!",
    "We're happy to hear you enjoyed every moment! Thanks for traveling with us."
];

async function addReviewsForAllTours() {
    try {
        const MONGODB_URI = 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all tours
        const tours = await Tour.find();
        console.log(`🎯 Found ${tours.length} tours`);

        // Get users
        const users = await User.find().limit(5);
        if (users.length === 0) {
            console.log('❌ No users found');
            return;
        }
        console.log(`👥 Found ${users.length} users`);

        let totalAdded = 0;
        let totalSkipped = 0;

        for (const tour of tours) {
            // Check existing reviews
            const existingCount = await Comment.countDocuments({ tourId: tour._id });
            
            if (existingCount >= 3) {
                console.log(`⏭️  Skipping ${tour.name} - already has ${existingCount} reviews`);
                totalSkipped++;
                continue;
            }

            // Add 3-5 reviews per tour
            const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews
            const reviews = [];

            for (let i = 0; i < numReviews; i++) {
                const user = users[i % users.length];
                const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
                const text = template.texts[Math.floor(Math.random() * template.texts.length)];
                
                // Random chance to add admin reply (60%)
                const replies = [];
                if (Math.random() > 0.4) {
                    const adminUser = users[0]; // First user as admin
                    replies.push({
                        userId: adminUser._id,
                        text: adminReplies[Math.floor(Math.random() * adminReplies.length)],
                        isAdmin: true,
                        adminRole: 'customer_service',
                        timestamp: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) // Random within last 5 days
                    });
                }

                reviews.push({
                    tourId: tour._id,
                    userId: user._id,
                    content: {
                        text: text,
                        rating: template.rating
                    },
                    verified: {
                        isVerified: true,
                        verifiedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random within last 30 days
                    },
                    moderation: {
                        status: 'approved'
                    },
                    replies: replies,
                    timestamps: {
                        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Random within last 60 days
                        updatedAt: new Date()
                    }
                });
            }

            await Comment.insertMany(reviews);
            console.log(`✅ Added ${numReviews} reviews for: ${tour.name}`);
            totalAdded += numReviews;
        }

        console.log('\n📊 Summary:');
        console.log(`✅ Total reviews added: ${totalAdded}`);
        console.log(`⏭️  Tours skipped: ${totalSkipped}`);
        console.log(`🎯 Tours processed: ${tours.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addReviewsForAllTours();
