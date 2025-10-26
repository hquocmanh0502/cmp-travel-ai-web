/**
 * Script to check hotels and tours in database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');
const Tour = require('../models/Tour');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function checkHotelsAndTours() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all tours
    const tours = await Tour.find({}).select('name country _id');
    console.log(`📍 Found ${tours.length} tours:\n`);
    
    const toursByCountry = {};
    tours.forEach(tour => {
      if (!toursByCountry[tour.country]) {
        toursByCountry[tour.country] = [];
      }
      toursByCountry[tour.country].push(tour);
    });
    
    Object.entries(toursByCountry).forEach(([country, tours]) => {
      console.log(`\n🌍 ${country}:`);
      tours.forEach(tour => {
        console.log(`   - ${tour.name} (ID: ${tour._id})`);
      });
    });
    
    // Get all hotels
    const hotels = await Hotel.find({}).select('name location.country location.city _id');
    console.log(`\n\n🏨 Found ${hotels.length} hotels:\n`);
    
    const hotelsByCountry = {};
    hotels.forEach(hotel => {
      const country = hotel.location?.country || 'Unknown';
      if (!hotelsByCountry[country]) {
        hotelsByCountry[country] = [];
      }
      hotelsByCountry[country].push(hotel);
    });
    
    Object.entries(hotelsByCountry).forEach(([country, hotels]) => {
      console.log(`\n🌍 ${country}:`);
      hotels.forEach(hotel => {
        console.log(`   - ${hotel.name} (City: ${hotel.location?.city || 'N/A'}, ID: ${hotel._id})`);
      });
    });
    
    // Show matching
    console.log('\n\n🔗 MATCHING TOURS ↔ HOTELS:\n');
    Object.entries(toursByCountry).forEach(([country, tours]) => {
      const matchingHotels = hotelsByCountry[country] || [];
      console.log(`\n📍 ${country}:`);
      console.log(`   Tours: ${tours.length}`);
      console.log(`   Hotels: ${matchingHotels.length}`);
      if (matchingHotels.length > 0) {
        console.log(`   ✅ Hotels available for this destination`);
      } else {
        console.log(`   ⚠️  No hotels found for this destination`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n\n👋 MongoDB connection closed');
  }
}

checkHotelsAndTours()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
