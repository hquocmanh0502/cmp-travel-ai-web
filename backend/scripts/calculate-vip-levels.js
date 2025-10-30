const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { calculateVIPLevel } = require('../services/vipService');

async function calculateUserVIPLevels() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const users = await User.find();
    console.log(`\nFound ${users.length} users`);

    let updatedCount = 0;
    let vipCount = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };

    for (const user of users) {
      // Calculate total spent from paid bookings
      const paidBookings = await Booking.find({
        userId: user._id,
        paymentStatus: 'paid'
      });

      const totalSpent = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
      const totalBookings = await Booking.countDocuments({ userId: user._id });

      // Calculate VIP level
      const newLevel = calculateVIPLevel(totalSpent);
      const oldLevel = user.membershipLevel;

      // Set vipSince date if upgrading from bronze
      const vipSince = (newLevel !== 'bronze' && (!user.vipSince || oldLevel === 'bronze')) 
        ? new Date() 
        : user.vipSince;

      // Update user
      await User.findByIdAndUpdate(user._id, {
        $set: {
          totalSpent: totalSpent,
          totalBookings: totalBookings,
          membershipLevel: newLevel,
          vipSince: vipSince
        }
      });

      vipCount[newLevel]++;
      updatedCount++;

      if (oldLevel !== newLevel) {
        console.log(`✓ ${user.username}: ${oldLevel} → ${newLevel} ($${totalSpent.toLocaleString()})`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} users`);
    console.log('\n=== VIP Level Distribution ===');
    console.log(`🥉 Bronze: ${vipCount.bronze} users`);
    console.log(`🥈 Silver: ${vipCount.silver} users`);
    console.log(`🥇 Gold: ${vipCount.gold} users`);
    console.log(`💎 Platinum: ${vipCount.platinum} users`);
    console.log(`💠 Diamond: ${vipCount.diamond} users`);

    // Show top 5 spenders
    console.log('\n=== Top 5 VIP Users ===');
    const topUsers = await User.find()
      .sort({ totalSpent: -1 })
      .limit(5)
      .select('username fullName membershipLevel totalSpent totalBookings');

    topUsers.forEach((user, index) => {
      const icon = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '💠' }[user.membershipLevel];
      console.log(`${index + 1}. ${icon} ${user.username} (${user.fullName})`);
      console.log(`   Level: ${user.membershipLevel.toUpperCase()}`);
      console.log(`   Spent: $${user.totalSpent.toLocaleString()}`);
      console.log(`   Bookings: ${user.totalBookings}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

calculateUserVIPLevels();
