require('dotenv').config();
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function checkFeedback() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all feedback
    const allFeedback = await Feedback.find({});
    console.log(`📊 Total feedback in database: ${allFeedback.length}\n`);

    if (allFeedback.length > 0) {
      console.log('📝 Recent feedback entries:\n');
      
      // Show last 5 feedback
      const recentFeedback = allFeedback.slice(-5);
      
      recentFeedback.forEach((feedback, index) => {
        console.log(`${index + 1}. ${feedback.title}`);
        console.log(`   Rating: ${'⭐'.repeat(feedback.rating)}`);
        console.log(`   Type: ${feedback.type}`);
        console.log(`   Status: ${feedback.status}`);
        console.log(`   Content: ${feedback.content.substring(0, 100)}${feedback.content.length > 100 ? '...' : ''}`);
        console.log(`   Tags: ${feedback.tags.join(', ') || 'None'}`);
        console.log(`   Created: ${feedback.createdAt}`);
        console.log(`   User ID: ${feedback.userId || 'Anonymous'}`);
        console.log('');
      });

      // Group by type
      const byType = {};
      allFeedback.forEach(f => {
        byType[f.type] = (byType[f.type] || 0) + 1;
      });

      console.log('📈 Feedback by type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      console.log('');

      // Group by status
      const byStatus = {};
      allFeedback.forEach(f => {
        byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      });

      console.log('📊 Feedback by status:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    } else {
      console.log('⚠️ No feedback found in database');
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFeedback();
