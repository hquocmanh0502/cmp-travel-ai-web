const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');

async function checkTourBookings() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get total bookings
    const totalBookings = await Booking.countDocuments();
    console.log(`\nTotal bookings in database: ${totalBookings}`);

    // Get sample bookings
    const sampleBookings = await Booking.find().limit(3).lean();
    console.log('\nSample bookings:');
    sampleBookings.forEach((booking, i) => {
      console.log(`\nBooking ${i + 1}:`);
      console.log(`  _id: ${booking._id}`);
      console.log(`  tourId: ${booking.tourId}`);
      console.log(`  tourId type: ${typeof booking.tourId}`);
      console.log(`  totalAmount: ${booking.totalAmount}`);
      console.log(`  paymentStatus: ${booking.paymentStatus}`);
    });

    // Get sample tours
    const sampleTours = await Tour.find().limit(3).lean();
    console.log('\n\nSample tours:');
    sampleTours.forEach((tour, i) => {
      console.log(`\nTour ${i + 1}:`);
      console.log(`  _id: ${tour._id}`);
      console.log(`  _id type: ${typeof tour._id}`);
      console.log(`  name: ${tour.name}`);
      console.log(`  id field: ${tour.id}`);
    });

    // Check if any bookings match tours
    console.log('\n\nChecking booking-tour matches:');
    for (const tour of sampleTours) {
      const bookingCount = await Booking.countDocuments({ tourId: tour._id });
      const bookingCountByIdField = await Booking.countDocuments({ tourId: tour.id });
      const bookingCountByStringId = await Booking.countDocuments({ tourId: tour._id.toString() });
      
      console.log(`\nTour: ${tour.name}`);
      console.log(`  Bookings matching _id (${tour._id}): ${bookingCount}`);
      console.log(`  Bookings matching id field (${tour.id}): ${bookingCountByIdField}`);
      console.log(`  Bookings matching string _id (${tour._id.toString()}): ${bookingCountByStringId}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTourBookings();
