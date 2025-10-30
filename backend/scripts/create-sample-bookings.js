const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');
const User = require('../models/User');

async function createSampleBookings() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get all tours
    const tours = await Tour.find();
    console.log(`Found ${tours.length} tours`);

    // Get all users
    const users = await User.find();
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.error('No users found. Please create users first.');
      process.exit(1);
    }

    // Delete existing bookings to avoid duplicates (optional)
    console.log('\nClearing existing bookings...');
    await Booking.deleteMany({});

    const paymentStatuses = ['paid', 'unpaid', 'partial'];
    const bookingStatuses = ['confirmed', 'pending', 'cancelled', 'completed'];
    const paymentMethods = ['cash', 'credit_card', 'bank_transfer', 'paypal', 'cmp_wallet'];

    let createdCount = 0;
    const now = new Date();

    // Create 15-25 bookings for each tour distributed over 12 months
    for (const tour of tours) {
      const bookingCount = Math.floor(Math.random() * 11) + 15; // 15-25 bookings

      for (let i = 0; i < bookingCount; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const adults = Math.floor(Math.random() * 3) + 1; // 1-3 adults
        const children = Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0; // 0-2 children
        const tourPrice = tour.pricing?.adult || tour.estimatedCost || 5000;
        const tourBaseCost = tourPrice * adults + (children * tourPrice * 0.7);
        const accommodationCost = Math.floor(Math.random() * 500);
        const servicesCost = Math.floor(Math.random() * 200);
        const totalAmount = tourBaseCost + accommodationCost + servicesCost;

        // Distribute bookings across last 12 months
        // More bookings in recent months (weighted distribution)
        const monthsAgo = Math.random() < 0.5 
          ? Math.floor(Math.random() * 3) // 50% in last 3 months
          : Math.floor(Math.random() * 12); // 50% in last 12 months
        
        const bookingDate = new Date(now);
        bookingDate.setMonth(bookingDate.getMonth() - monthsAgo);
        // Random day within the month
        const randomDay = Math.floor(Math.random() * 28) + 1;
        bookingDate.setDate(randomDay);

        // Tour dates in future (relative to booking date, 1-180 days from booking)
        const daysFromBooking = Math.floor(Math.random() * 180) + 1;
        const checkinDate = new Date(bookingDate);
        checkinDate.setDate(checkinDate.getDate() + daysFromBooking);
        
        const checkoutDate = new Date(checkinDate);
        const duration = parseInt(tour.duration) || 3;
        checkoutDate.setDate(checkoutDate.getDate() + duration);

        const departureDate = new Date(checkinDate);
        departureDate.setDate(departureDate.getDate() - 1);

        // Calculate rooms needed (at least 1 room per 3 guests)
        const totalGuests = adults + children;
        const roomsNeeded = Math.ceil(totalGuests / 3);
        
        // Randomly distribute rooms
        const roomTypes = ['superior', 'juniorDeluxe', 'deluxe', 'suite'];
        const selectedRoomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
        
        const rooms = {
          superior: 0,
          juniorDeluxe: 0,
          deluxe: 0,
          suite: 0,
          family: 0,
          president: 0
        };
        rooms[selectedRoomType] = roomsNeeded;

        // More paid bookings for older bookings (past bookings are more likely to be paid)
        const isPaid = monthsAgo > 1 ? (Math.random() > 0.3) : (Math.random() > 0.5);
        const selectedPaymentStatus = isPaid ? 'paid' : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

        const booking = new Booking({
          userId: randomUser._id,
          tourId: tour._id,
          tourName: tour.name,
          
          // Dates (required)
          checkinDate: checkinDate,
          checkoutDate: checkoutDate,
          departureDate: departureDate,
          bookingDate: bookingDate,
          
          // Guests (required)
          adults: adults,
          children: children,
          infants: 0,
          
          // Rooms (required - at least 1 room)
          rooms: rooms,
          
          // Customer Info (required)
          customerInfo: {
            title: ['Mr', 'Mrs', 'Ms'][Math.floor(Math.random() * 3)],
            fullName: randomUser.fullName || randomUser.username,
            email: randomUser.email,
            phone: randomUser.phoneNumber || '+84901234567',
            specialRequests: ''
          },
          
          // Pricing (required)
          tourBaseCost: tourBaseCost,
          accommodationCost: accommodationCost,
          servicesCost: servicesCost,
          totalAmount: totalAmount,
          
          // Status
          status: bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)],
          paymentStatus: selectedPaymentStatus,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
        });

        await booking.save();
        createdCount++;
      }

      console.log(`Created ${bookingCount} bookings for ${tour.name}`);
    }

    console.log(`\n✅ Successfully created ${createdCount} sample bookings for ${tours.length} tours`);

    // Verification and statistics
    console.log('\n=== VERIFICATION ===');
    
    const totalBookings = await Booking.countDocuments();
    const paidBookings = await Booking.countDocuments({ paymentStatus: 'paid' });
    const unpaidBookings = await Booking.countDocuments({ paymentStatus: 'unpaid' });
    const partialBookings = await Booking.countDocuments({ paymentStatus: 'partial' });
    
    console.log(`\nBooking Status:`);
    console.log(`- Total bookings: ${totalBookings}`);
    console.log(`- Paid: ${paidBookings} (${Math.round(paidBookings/totalBookings*100)}%)`);
    console.log(`- Unpaid: ${unpaidBookings} (${Math.round(unpaidBookings/totalBookings*100)}%)`);
    console.log(`- Partial: ${partialBookings} (${Math.round(partialBookings/totalBookings*100)}%)`);

    // Revenue statistics
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    console.log(`\nRevenue:`);
    console.log(`- Total revenue (paid): $${(totalRevenue[0]?.total || 0).toLocaleString()}`);
    console.log(`- Average per booking: $${Math.round((totalRevenue[0]?.total || 0) / paidBookings).toLocaleString()}`);

    // Monthly breakdown for last 12 months
    console.log(`\n=== MONTHLY BREAKDOWN (Last 12 months) ===`);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyData = await Booking.aggregate([
      {
        $match: {
          bookingDate: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$bookingDate' },
            month: { $month: '$bookingDate' }
          },
          totalBookings: { $sum: 1 },
          paidBookings: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          revenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    console.log('\nMonth    | Bookings | Paid | Revenue');
    console.log('---------|----------|------|----------');
    monthlyData.forEach(month => {
      const monthName = monthNames[month._id.month - 1];
      const year = month._id.year;
      console.log(`${monthName} ${year} | ${String(month.totalBookings).padStart(8)} | ${String(month.paidBookings).padStart(4)} | $${month.revenue.toLocaleString()}`);
    });

    // Top 5 tours by revenue
    console.log(`\n=== TOP 5 TOURS BY REVENUE ===`);
    const topTours = await Booking.aggregate([
      {
        $match: { paymentStatus: 'paid' }
      },
      {
        $group: {
          _id: '$tourId',
          tourName: { $first: '$tourName' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 5
      }
    ]);

    topTours.forEach((tour, index) => {
      console.log(`${index + 1}. ${tour.tourName}: ${tour.totalBookings} bookings, $${tour.totalRevenue.toLocaleString()} revenue`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createSampleBookings();
