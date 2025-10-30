/**
 * Restore Tours Database
 * Import all tours from data.json back into MongoDB
 */

const mongoose = require('mongoose');
const Tour = require('../models/Tour');
const connectDB = require('../config/db');
const fs = require('fs');
const path = require('path');

async function restoreTours() {
    try {
        console.log('🔄 Starting tours restoration...\n');
        
        // Connect to database
        await connectDB();
        console.log('');
        
        // Read data from data.json
        const dataPath = path.join(__dirname, '../../data/data.json');
        const toursData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        console.log(`📊 Found ${toursData.length} tours in data.json\n`);
        
        // Ask for confirmation
        console.log('⚠️  This will:');
        console.log('   1. Clear existing tours database');
        console.log('   2. Import all tours from data.json');
        console.log('');
        
        // Clear existing tours
        const existingCount = await Tour.countDocuments();
        console.log(`📦 Current tours in database: ${existingCount}`);
        
        await Tour.deleteMany({});
        console.log('✅ Cleared existing tours\n');
        
        // Import tours
        let successCount = 0;
        let errorCount = 0;
        
        for (const tourData of toursData) {
            try {
                // Transform data to match Tour schema
                const tour = new Tour({
                    id: tourData.id,
                    name: tourData.name,
                    country: tourData.country,
                    description: tourData.description,
                    img: tourData.img,
                    rating: parseFloat(tourData.rating) || 4.5,
                    estimatedCost: parseInt(tourData.estimatedCost) || 5000,
                    attractions: tourData.attractions || [],
                    food: tourData.food || [],
                    duration: '7 Days',
                    type: 'international',
                    maxGroupSize: 20,
                    minAge: 0,
                    inclusions: [
                        'Accommodation',
                        'Meals as per itinerary',
                        'Professional tour guide',
                        'Airport transfers',
                        'Entrance fees'
                    ],
                    exclusions: [
                        'International flights',
                        'Travel insurance',
                        'Personal expenses',
                        'Tips and gratuities'
                    ],
                    pricing: {
                        adult: parseInt(tourData.estimatedCost) || 5000,
                        child: Math.floor((parseInt(tourData.estimatedCost) || 5000) * 0.7),
                        infant: Math.floor((parseInt(tourData.estimatedCost) || 5000) * 0.3),
                        groupDiscount: 10
                    },
                    location: {
                        address: tourData.country,
                        region: tourData.country
                    },
                    availability: [
                        {
                            startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
                            availableSlots: 20,
                            price: parseInt(tourData.estimatedCost) || 5000
                        },
                        {
                            startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                            endDate: new Date(Date.now() + 67 * 24 * 60 * 60 * 1000),
                            availableSlots: 20,
                            price: parseInt(tourData.estimatedCost) || 5000
                        }
                    ],
                    tags: tourData.activity || [],
                    difficulty: 'moderate',
                    bestTimeToVisit: ['January', 'February', 'March', 'April', 'May', 'June'],
                    analytics: {
                        viewCount: Math.floor(Math.random() * 1000) + 100,
                        wishlistCount: Math.floor(Math.random() * 50) + 10,
                        bookingCount: Math.floor(Math.random() * 30) + 5,
                        averageRating: parseFloat(tourData.rating) || 4.5,
                        sentimentScore: 0.8,
                        popularityScore: parseFloat(tourData.rating) * 20 || 90
                    },
                    gallery: [
                        {
                            url: tourData.img,
                            category: 'all',
                            caption: tourData.name
                        }
                    ],
                    itinerary: [
                        {
                            day: 1,
                            title: 'Arrival & Welcome',
                            activities: ['Airport pickup', 'Hotel check-in', 'Welcome dinner'],
                            meals: ['Dinner']
                        },
                        {
                            day: 2,
                            title: 'City Tour',
                            activities: ['Visit main attractions', 'Local market tour', 'Cultural show'],
                            meals: ['Breakfast', 'Lunch']
                        },
                        {
                            day: 3,
                            title: 'Adventure Day',
                            activities: tourData.activity || ['Explore local activities'],
                            meals: ['Breakfast', 'Lunch', 'Dinner']
                        }
                    ],
                    status: 'active',
                    featured: Math.random() > 0.7
                });
                
                await tour.save();
                successCount++;
                console.log(`✅ Imported: ${tour.name} (ID: ${tour.id})`);
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Failed to import tour (ID: ${tourData.id}): ${error.message}`);
            }
        }
        
        console.log('\n📊 Restoration Summary:');
        console.log('──────────────────────────────────────────────────');
        console.log(`   ✅ Successfully imported: ${successCount} tours`);
        console.log(`   ❌ Failed: ${errorCount} tours`);
        console.log(`   📦 Total in database: ${await Tour.countDocuments()} tours`);
        console.log('──────────────────────────────────────────────────');
        
        console.log('\n🎉 Tours restoration completed!');
        
    } catch (error) {
        console.error('❌ Error during restoration:', error);
    } finally {
        console.log('\n👋 Closing database connection...');
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Run restoration
restoreTours();
