/**
 * Script to update existing bookings with tourName and hotelName
 * This will populate the tourName and hotelName fields for all bookings
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmp_travel';

async function updateBookingNames() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all bookings
    const bookings = await Booking.find({});
    console.log(`📊 Found ${bookings.length} bookings to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      let needsUpdate = false;
      const updates = {};

      // Update tourName if missing or default
      if (!booking.tourName || booking.tourName === 'Tour' || booking.tourName === 'Unknown Tour') {
        const tour = await Tour.findById(booking.tourId);
        if (tour && tour.name) {
          updates.tourName = tour.name;
          needsUpdate = true;
          console.log(`  ✏️  Updating tourName for booking ${booking.bookingId}: ${tour.name}`);
        } else {
          console.log(`  ⚠️  Tour not found for booking ${booking.bookingId}`);
        }
      }

      // Update hotelName if missing or default and hotelId exists
      if (booking.hotelId && (!booking.hotelName || booking.hotelName === 'No hotel selected')) {
        const hotel = await Hotel.findById(booking.hotelId);
        if (hotel && hotel.name) {
          updates.hotelName = hotel.name;
          needsUpdate = true;
          console.log(`  ✏️  Updating hotelName for booking ${booking.bookingId}: ${hotel.name}`);
        } else {
          console.log(`  ⚠️  Hotel not found for booking ${booking.bookingId}`);
        }
      }

      // Apply updates if any
      if (needsUpdate) {
        await Booking.findByIdAndUpdate(booking._id, updates);
        updatedCount++;
        console.log(`  ✅ Updated booking ${booking.bookingId}`);
      } else {
        skippedCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  Total bookings: ${bookings.length}`);
    console.log(`  Updated: ${updatedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log('\n✅ Update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating booking names:', error);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
  }
}

// Run the script
updateBookingNames()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
