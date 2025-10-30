/**
 * Add Gallery Images and Comments to Tours
 * This script adds multiple gallery images and sample comments to all tours
 */

const mongoose = require('mongoose');
const Tour = require('../models/Tour');
const Comment = require('../models/Comment');
const User = require('../models/User');
const connectDB = require('../config/db');

// Sample gallery images by category - 12 diverse images per tour
const getGalleryImages = (tourName, mainImage) => {
    // Generate diverse image URLs using different Unsplash parameters
    const baseUrl = mainImage.split('?')[0];
    const searchTerm = tourName.toLowerCase().replace(/\s+/g, '-');
    
    return [
        // Main & Overview Images (2 images)
        { url: mainImage, category: 'all', caption: `${tourName} - Main View` },
        { url: `${baseUrl}?w=800&h=600&fit=crop&auto=format`, category: 'all', caption: `${tourName} - Panoramic View` },
        
        // Attractions (3 images)
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=85&sat=10`, category: 'attractions', caption: `${tourName} - Top Attraction` },
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=90&con=5`, category: 'attractions', caption: `${tourName} - Famous Landmark` },
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=85&bri=5`, category: 'attractions', caption: `${tourName} - Must-See Spot` },
        
        // Landscape & Nature (2 images)
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=90&sat=15`, category: 'landscape', caption: `${tourName} - Beautiful Scenery` },
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=85&con=10`, category: 'landscape', caption: `${tourName} - Natural Beauty` },
        
        // Activities (2 images)
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=90&bri=-5`, category: 'activities', caption: `${tourName} - Local Experience` },
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=85&sat=5`, category: 'activities', caption: `${tourName} - Adventure Time` },
        
        // Accommodation (2 images)
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=90&con=8`, category: 'accommodation', caption: `${tourName} - Luxury Stay` },
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=85&bri=3`, category: 'accommodation', caption: `${tourName} - Comfortable Rooms` },
        
        // Food & Cuisine (1 image)
        { url: `${baseUrl}?w=800&h=600&fit=crop&q=95&sat=20`, category: 'food', caption: `${tourName} - Local Cuisine` }
    ];
};

// Sample comments data
const sampleComments = [
    {
        rating: 5,
        text: "Amazing experience! The tour was well-organized and our guide was incredibly knowledgeable. Would definitely recommend!",
        helpful: 24,
        notHelpful: 2
    },
    {
        rating: 4,
        text: "Great tour overall. The destinations were beautiful and accommodation was comfortable. Only minor issue was the tight schedule.",
        helpful: 18,
        notHelpful: 3
    },
    {
        rating: 5,
        text: "Best vacation ever! Everything exceeded our expectations. The food was delicious and the activities were so much fun!",
        helpful: 31,
        notHelpful: 1
    },
    {
        rating: 4,
        text: "Really enjoyed the trip. The scenery was breathtaking and we got to experience authentic local culture. Good value for money.",
        helpful: 15,
        notHelpful: 2
    },
    {
        rating: 5,
        text: "Absolutely loved it! Our tour guide was fantastic and made the experience even better. Can't wait to book another tour!",
        helpful: 27,
        notHelpful: 0
    },
    {
        rating: 3,
        text: "Decent tour but felt a bit rushed. Would have liked more free time to explore on our own. Still worth it for the price.",
        helpful: 10,
        notHelpful: 5
    },
    {
        rating: 5,
        text: "Perfect family vacation! Kids had a blast and we made wonderful memories. Highly recommend for families.",
        helpful: 22,
        notHelpful: 1
    },
    {
        rating: 4,
        text: "Beautiful locations and well-planned itinerary. The group size was just right. Would book again!",
        helpful: 19,
        notHelpful: 2
    }
];

async function addGalleryAndComments() {
    try {
        console.log('🎨 Starting to add gallery images and comments...\n');
        
        // Connect to database
        await connectDB();
        console.log('');
        
        // Get all tours
        const tours = await Tour.find({});
        console.log(`📊 Found ${tours.length} tours\n`);
        
        // Get all users for comments
        const users = await User.find({});
        console.log(`👥 Found ${users.length} users\n`);
        
        if (users.length === 0) {
            console.log('⚠️  No users found. Please create users first.');
            process.exit(0);
        }
        
        let galleryUpdated = 0;
        let commentsAdded = 0;
        
        for (const tour of tours) {
            try {
                // Update gallery if it has less than 12 images
                if (!tour.gallery || tour.gallery.length < 12) {
                    const galleryImages = getGalleryImages(tour.name, tour.img);
                    tour.gallery = galleryImages;
                    await tour.save();
                    galleryUpdated++;
                    console.log(`✅ Updated gallery for: ${tour.name} (${galleryImages.length} images)`);
                }
                
                // Check existing comments for this tour
                const existingComments = await Comment.countDocuments({ tourId: tour._id });
                
                if (existingComments < 3) {
                    // Add 5-8 random comments for each tour
                    const numComments = Math.floor(Math.random() * 4) + 5; // 5-8 comments
                    const commentsToAdd = [];
                    
                    for (let i = 0; i < numComments; i++) {
                        const randomUser = users[Math.floor(Math.random() * users.length)];
                        const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
                        
                        // Create random date in the past 6 months
                        const randomDate = new Date();
                        randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 180));
                        
                        const comment = new Comment({
                            tourId: tour._id,
                            userId: randomUser._id,
                            content: {
                                text: randomComment.text,
                                rating: randomComment.rating,
                                images: [],
                                detailedRating: {
                                    guide: randomComment.rating,
                                    accommodation: Math.max(1, randomComment.rating - Math.floor(Math.random() * 2)),
                                    transportation: Math.max(1, randomComment.rating - Math.floor(Math.random() * 2)),
                                    food: randomComment.rating,
                                    activities: randomComment.rating,
                                    valueForMoney: randomComment.rating
                                }
                            },
                            verified: {
                                isVerified: true,
                                verifiedAt: randomDate
                            },
                            reactions: {
                                likes: [],
                                loves: [],
                                helpful: []
                            },
                            status: 'approved',
                            createdAt: randomDate,
                            updatedAt: randomDate
                        });
                        
                        await comment.save();
                        commentsToAdd.push(comment);
                    }
                    
                    commentsAdded += commentsToAdd.length;
                    console.log(`💬 Added ${commentsToAdd.length} comments for: ${tour.name}`);
                }
                
            } catch (error) {
                console.error(`❌ Error processing tour ${tour.name}:`, error.message);
            }
        }
        
        console.log('\n📊 Summary:');
        console.log('──────────────────────────────────────────────────');
        console.log(`   🎨 Tours with updated gallery: ${galleryUpdated}`);
        console.log(`   💬 Total comments added: ${commentsAdded}`);
        console.log('──────────────────────────────────────────────────');
        
        console.log('\n🎉 Gallery and comments update completed!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n👋 Closing database connection...');
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Run the script
addGalleryAndComments();
