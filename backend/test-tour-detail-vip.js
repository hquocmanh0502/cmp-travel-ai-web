// Prevent server from starting
process.env.SKIP_SERVER = 'true';

const mongoose = require('mongoose');
const User = require('./models/User');
const Tour = require('./models/Tour');
const { applyVIPDiscount } = require('./services/vipService');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function testTourDetailVIP() {
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

    // Get first tour
    const tour = await Tour.findOne();
    if (!tour) {
      console.log('❌ No tour found');
      return;
    }

    console.log('🎯 Testing Tour Detail with VIP Discount\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 User Information:');
    console.log(`   Name: ${diamondUser.fullName}`);
    console.log(`   Username: ${diamondUser.username}`);
    console.log(`   VIP Level: ${diamondUser.membershipLevel.toUpperCase()}`);
    console.log(`   Total Spent: $${diamondUser.totalSpent?.toLocaleString() || 0}`);
    console.log('');

    console.log('🌍 Tour Information:');
    console.log(`   Name: ${tour.name}`);
    console.log(`   Country: ${tour.country}`);
    console.log(`   Duration: ${tour.duration}`);
    console.log(`   Original Price: $${tour.estimatedCost.toLocaleString()}`);
    console.log('');

    // Apply VIP discount
    const discountResult = applyVIPDiscount(tour.estimatedCost, diamondUser.membershipLevel);

    console.log('💰 VIP Pricing:');
    console.log(`   Original Price: $${discountResult.originalPrice.toLocaleString()}`);
    console.log(`   VIP Level: ${diamondUser.membershipLevel.toUpperCase()}`);
    console.log(`   Discount: ${discountResult.discount}%`);
    console.log(`   You Save: $${discountResult.discountAmount.toLocaleString()}`);
    console.log(`   Final Price: $${discountResult.finalPrice.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Simulate API response
    const tourData = tour.toObject();
    tourData.vipInfo = {
      membershipLevel: diamondUser.membershipLevel,
      discount: discountResult.discount,
      originalPrice: discountResult.originalPrice,
      discountAmount: discountResult.discountAmount,
      finalPrice: discountResult.finalPrice,
      savings: discountResult.discountAmount
    };

    console.log('📦 API Response (tour detail with VIP):');
    console.log(JSON.stringify({
      name: tourData.name,
      estimatedCost: tourData.estimatedCost,
      vipInfo: tourData.vipInfo
    }, null, 2));
    console.log('');

    console.log('✅ Frontend will display:');
    console.log(`   • Tour: ${tour.name}`);
    console.log(`   • Original Price: $${discountResult.originalPrice.toLocaleString()} (crossed out)`);
    console.log(`   • Your Price: $${discountResult.finalPrice.toLocaleString()} (green)`);
    console.log(`   • Badge: "💠 VIP ${discountResult.discount}% OFF"`);
    console.log(`   • Savings: "You save $${discountResult.discountAmount.toLocaleString()} with DIAMOND VIP!"`);

    console.log('\n✅ Tour Detail VIP Test Complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTourDetailVIP();
