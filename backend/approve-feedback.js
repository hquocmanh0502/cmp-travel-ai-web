require('dotenv').config();
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function approveFeedback() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all pending feedback with rating >= 4
    const pendingFeedback = await Feedback.find({ 
      status: 'pending'
    }).populate('userId', 'name email');

    console.log(`📋 Total pending feedback: ${pendingFeedback.length}\n`);

    if (pendingFeedback.length === 0) {
      console.log('⚠️ No high-rated pending feedback found');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Found ${pendingFeedback.length} high-rated feedback(s) to approve:\n`);

    for (const feedback of pendingFeedback) {
      console.log(`📝 ${feedback.title}`);
      console.log(`   Rating: ${'⭐'.repeat(feedback.rating)}`);
      console.log(`   Content: ${feedback.content.substring(0, 100)}...`);
      console.log(`   User: ${feedback.userId?.name || 'Anonymous'}`);
      
      // Approve and make public
      feedback.status = 'approved';
      feedback.isPublic = true;
      await feedback.save();
      
      console.log(`   ✅ Approved and made public\n`);
    }

    console.log(`\n🎉 Successfully approved ${pendingFeedback.length} feedback(s)!`);

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

approveFeedback();
