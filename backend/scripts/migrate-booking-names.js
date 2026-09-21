// Script to update existing bookings with tour and hotel names
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Fallback to hardcoded MongoDB URI if .env not found
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 MONGODB_URI:', MONGODB_URI ? 'Found' : 'Missing');

const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');

async function migrateBookings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find ALL bookings with hotelId that need hotel name update
    const bookings = await Booking.find({
      hotelId: { $exists: true, $ne: null }
    });
    
    console.log(`📦 Found ${bookings.length} bookings to update`);
    
    let updated = 0;
    let failed = 0;
    
    for (const booking of bookings) {
      try {
        let needUpdate = false;
        
        console.log(`\n🔍 Checking booking ${booking.bookingId}:`);
        console.log(`  Current tourName: "${booking.tourName}"`);
        console.log(`  Current hotelName: "${booking.hotelName}"`);
        console.log(`  Has hotelId: ${!!booking.hotelId}`);
        
        // Fetch tour info if needed
        let tourName = booking.tourName;
        if (!tourName || tourName === 'Tour' || tourName === 'Unknown Tour') {
          if (booking.tourId) {
            const tour = await Tour.findById(booking.tourId);
            if (tour) {
              tourName = tour.name || 'Unknown Tour';
              needUpdate = true;
              console.log(`  ✏️  Will update tourName to: "${tourName}"`);
            }
          }
        }
        
        // Fetch hotel info if booking has hotelId
        let hotelName = booking.hotelName;
        if (booking.hotelId && (!hotelName || hotelName === 'No hotel selected')) {
          console.log(`  🏨 Fetching hotel info for hotelId: ${booking.hotelId}`);
          const hotel = await Hotel.findById(booking.hotelId);
          if (hotel) {
            hotelName = hotel.name || 'No hotel selected';
            needUpdate = true;
            console.log(`  ✏️  Will update hotelName to: "${hotelName}"`);
          } else {
            console.log(`  ⚠️  Hotel not found in database`);
          }
        }
        
        // Update only if needed
        if (needUpdate) {
          booking.tourName = tourName;
          booking.hotelName = hotelName;
          await booking.save();
          
          console.log(`✅ Updated booking ${booking.bookingId}: Tour="${tourName}", Hotel="${hotelName}"`);
          updated++;
        } else {
          console.log(`  ⏭️  No update needed for booking ${booking.bookingId}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to update booking ${booking.bookingId}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📦 Total: ${bookings.length}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Migration completed and disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateBookings();
