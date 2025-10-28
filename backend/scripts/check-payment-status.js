// Quick check for paid bookings
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Booking = require('../models/Booking');

async function main() {
  console.log('🔍 Checking payment statuses...\n');
  await connectDB();
  
  const total = await Booking.countDocuments();
  console.log(`Total bookings: ${total}`);
  
  const statuses = await Booking.aggregate([
    { $group: { _id: '$paymentStatus', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log('\n📊 Payment Status Breakdown:');
  statuses.forEach(s => {
    console.log(`   ${s._id}: ${s.count} bookings, $${s.totalAmount.toLocaleString()}`);
  });
  
  const paid = await Booking.find({ paymentStatus: 'paid' }).limit(3);
  console.log(`\n✅ Sample paid bookings (${paid.length}):`);
  paid.forEach(b => {
    console.log(`   - ${b.tourName}: $${b.totalAmount} (${b.status})`);
  });
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
