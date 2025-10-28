require('dotenv').config();
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function checkFeedbackQuery() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check what API should return
    console.log('🔍 Checking query that API uses...\n');
    
    const query1 = await Feedback.find({ 
      status: { $in: ['approved', 'resolved'] },
      isPublic: true 
    });
    console.log(`Query 1 (status: approved/resolved, isPublic: true): ${query1.length} results`);

    // Check general_feedback specifically
    const query2 = await Feedback.find({ 
      type: 'general_feedback',
      status: { $in: ['approved', 'resolved'] },
      isPublic: true 
    }).limit(5);
    console.log(`Query 2 (general_feedback + approved + public): ${query2.length} results`);
    
    if (query2.length > 0) {
      console.log('\n📝 Sample results:');
      query2.forEach((f, i) => {
        console.log(`${i + 1}. ${f.title}`);
        console.log(`   Type: ${f.type}`);
        console.log(`   Status: ${f.status}`);
        console.log(`   IsPublic: ${f.isPublic}`);
        console.log(`   Rating: ${f.rating} stars`);
        console.log(`   Content: ${f.content.substring(0, 60)}...`);
        console.log('');
      });
    }

    // Check all general_feedback regardless of status
    const query3 = await Feedback.find({ 
      type: 'general_feedback'
    });
    console.log(`\nQuery 3 (all general_feedback): ${query3.length} results`);
    
    if (query3.length > 0) {
      console.log('\n📊 Breakdown by status:');
      const byStatus = {};
      query3.forEach(f => {
        byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      });
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      console.log('\n📊 Breakdown by isPublic:');
      const publicCount = query3.filter(f => f.isPublic).length;
      const privateCount = query3.filter(f => !f.isPublic).length;
      console.log(`   public: ${publicCount}`);
      console.log(`   private: ${privateCount}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFeedbackQuery();
