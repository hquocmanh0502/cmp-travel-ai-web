/**
 * Script to check existing bookings and their hotel information
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmp_travel';

async function checkBookings() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all bookings
    const bookings = await Booking.find({})
      .populate('tourId', 'name country img')
      .populate('hotelId', 'name address');
    
    console.log(`📊 Found ${bookings.length} bookings\n`);

    if (bookings.length === 0) {
      console.log('❌ No bookings found in database');
    } else {
      bookings.forEach((booking, index) => {
        console.log(`\n========== Booking #${index + 1} ==========`);
        console.log(`Booking ID: ${booking.bookingId}`);
        console.log(`Status: ${booking.status}`);
        console.log(`\n--- Tour Info ---`);
        console.log(`Tour ID: ${booking.tourId?._id || booking.tourId}`);
        console.log(`Tour Name (stored): ${booking.tourName}`);
        console.log(`Tour Name (populated): ${booking.tourId?.name || 'Not populated'}`);
        console.log(`\n--- Hotel Info ---`);
        console.log(`Hotel ID: ${booking.hotelId || 'None'}`);
        console.log(`Hotel Name (stored): ${booking.hotelName}`);
        console.log(`Hotel Name (populated): ${booking.hotelId?.name || 'Not populated'}`);
        console.log(`\n--- Booking Details ---`);
        console.log(`Check-in: ${booking.checkinDate?.toISOString().split('T')[0]}`);
        console.log(`Check-out: ${booking.checkoutDate?.toISOString().split('T')[0]}`);
        console.log(`Adults: ${booking.adults}, Children: ${booking.children}, Infants: ${booking.infants}`);
        console.log(`Total Amount: $${booking.totalAmount}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking bookings:', error);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n\n👋 MongoDB connection closed');
  }
}

// Run the script
checkBookings()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
