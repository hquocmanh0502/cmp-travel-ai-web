// Prevent server from starting
process.env.SKIP_SERVER = 'true';

const mongoose = require('mongoose');
const User = require('./models/User');
const Booking = require('./models/Booking');
const Tour = require('./models/Tour');
const { applyVIPDiscount, calculateVIPLevel, getVIPDiscount } = require('./services/vipService');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function testVIPDiscount() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a Diamond user
    const diamondUser = await User.findOne({ membershipLevel: 'diamond' });
    if (!diamondUser) {
      console.log('❌ No Diamond user found');
      return;
    }

    console.log('🏆 Testing VIP Discount for Diamond User:');
    console.log(`   Name: ${diamondUser.fullName}`);
    console.log(`   Username: ${diamondUser.username}`);
    console.log(`   VIP Level: ${diamondUser.membershipLevel.toUpperCase()}`);
    console.log(`   Total Spent: $${diamondUser.totalSpent?.toLocaleString() || 0}`);
    console.log(`   Total Bookings: ${diamondUser.totalBookings || 0}`);
    console.log('');

    // Test discount calculation
    const testPrice = 10000;
    const discountResult = applyVIPDiscount(testPrice, diamondUser.membershipLevel);
    
    console.log('💰 Discount Calculation Test:');
    console.log(`   Original Price: $${discountResult.originalPrice.toLocaleString()}`);
    console.log(`   VIP Level: ${diamondUser.membershipLevel.toUpperCase()}`);
    console.log(`   Discount Percentage: ${discountResult.discount}%`);
    console.log(`   Discount Amount: $${discountResult.discountAmount.toLocaleString()}`);
    console.log(`   Final Price: $${discountResult.finalPrice.toLocaleString()}`);
    console.log(`   Savings: $${discountResult.discountAmount.toLocaleString()} (${discountResult.discount}%)`);
    console.log('');

    // Check recent bookings with VIP discount
    const recentBooking = await Booking.findOne({ userId: diamondUser._id })
      .sort({ createdAt: -1 })
      .limit(1);

    if (recentBooking) {
      console.log('📋 Most Recent Booking:');
      console.log(`   Booking ID: ${recentBooking._id}`);
      console.log(`   Tour: ${recentBooking.tourName}`);
      console.log(`   Status: ${recentBooking.status} / ${recentBooking.paymentStatus}`);
      
      if (recentBooking.vipDiscount) {
        console.log('   VIP Discount Applied:');
        console.log(`     Level: ${recentBooking.vipDiscount.membershipLevel?.toUpperCase() || 'N/A'}`);
        console.log(`     Original Amount: $${recentBooking.vipDiscount.originalAmount?.toLocaleString() || 0}`);
        console.log(`     Discount: ${recentBooking.vipDiscount.discountPercentage || 0}%`);
        console.log(`     Discount Amount: $${recentBooking.vipDiscount.discountAmount?.toLocaleString() || 0}`);
        console.log(`     Final Amount: $${recentBooking.totalAmount?.toLocaleString() || 0}`);
      } else {
        console.log('   ⚠️  No VIP discount data found in this booking');
      }
      console.log('');
    }

    // Test all VIP levels
    console.log('🎯 All VIP Levels Discount Test ($10,000 booking):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const levels = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    levels.forEach(level => {
      const result = applyVIPDiscount(10000, level);
      const emoji = {
        bronze: '🥉',
        silver: '🥈', 
        gold: '🥇',
        platinum: '💎',
        diamond: '💠'
      }[level];
      
      console.log(`${emoji} ${level.toUpperCase().padEnd(10)} | ${result.discount}% OFF | Save $${result.discountAmount.toLocaleString().padEnd(8)} | Pay $${result.finalPrice.toLocaleString()}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Distribution of VIP levels
    const distribution = await User.aggregate([
      {
        $group: {
          _id: '$membershipLevel',
          count: { $sum: 1 },
          avgSpent: { $avg: '$totalSpent' },
          totalSpent: { $sum: '$totalSpent' }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    console.log('📊 VIP Level Distribution:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    distribution.forEach(item => {
      const emoji = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇', 
        platinum: '💎',
        diamond: '💠'
      }[item._id];
      const discount = getVIPDiscount(item._id);
      
      console.log(`${emoji} ${item._id.toUpperCase().padEnd(10)} | ${item.count.toString().padEnd(2)} users | Avg: $${Math.round(item.avgSpent).toLocaleString().padEnd(10)} | Discount: ${discount}%`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n✅ VIP Discount System Test Complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testVIPDiscount();
