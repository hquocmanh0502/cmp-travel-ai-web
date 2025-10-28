require('dotenv').config();
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function checkFeedbackTypes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const allFeedback = await Feedback.find({});
    console.log(`📊 Total feedback in database: ${allFeedback.length}\n`);

    // Group by type
    const byType = {};
    allFeedback.forEach(f => {
      byType[f.type || 'null'] = (byType[f.type || 'null'] || 0) + 1;
    });

    console.log('Feedback by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    // Check general_feedback
    console.log('\n🔍 Checking general_feedback entries:');
    const generalFeedback = await Feedback.find({ type: 'general_feedback' });
    console.log(`Count: ${generalFeedback.length}`);

    if (generalFeedback.length > 0) {
      console.log('\nSample general_feedback entry:');
      console.log(JSON.stringify({
        id: generalFeedback[0]._id,
        type: generalFeedback[0].type,
        title: generalFeedback[0].title,
        rating: generalFeedback[0].rating,
        status: generalFeedback[0].status,
        isPublic: generalFeedback[0].isPublic
      }, null, 2));
    }

    // Check what API query would return
    console.log('\n🔍 Checking what API query returns:');
    const apiResult = await Feedback.find({ 
      type: 'general_feedback',
      status: { $in: ['approved', 'resolved'] },
      isPublic: true
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`API would return: ${apiResult.length} results`);

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFeedbackTypes();
