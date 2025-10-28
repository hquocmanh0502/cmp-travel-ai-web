require('dotenv').config();
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

const realNames = [
  'Sarah Johnson',
  'Michael Chen',
  'Emily Rodriguez',
  'David Kim',
  'Jessica Martinez',
  'James Anderson',
  'Maria Garcia',
  'Robert Wilson',
  'Linda Taylor',
  'Christopher Lee'
];

async function updateFeedbackWithNames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all website feedback
    const websiteFeedback = await Feedback.find({ 
      type: 'general_feedback'
    }).sort({ createdAt: 1 });

    console.log(`📝 Updating ${websiteFeedback.length} feedback entries with real names...\n`);

    // Get real users
    const users = await User.find().limit(10);

    for (let i = 0; i < websiteFeedback.length; i++) {
      const feedback = websiteFeedback[i];
      
      // Assign user if available, otherwise will use name from transform
      if (users[i % users.length]) {
        feedback.userId = users[i % users.length]._id;
        
        // Update user name to match our real names
        const user = users[i % users.length];
        user.name = realNames[i % realNames.length];
        await user.save();
      }
      
      await feedback.save();
      console.log(`✅ Updated feedback ${i + 1}: ${feedback.title} -> User: ${realNames[i % realNames.length]}`);
    }

    console.log(`\n🎉 Successfully updated all feedback with real user names!`);
    
    // Verify
    console.log('\n📊 Verification:');
    const updated = await Feedback.find({ 
      type: 'general_feedback'
    }).populate('userId', 'name').limit(5);

    updated.forEach((f, i) => {
      console.log(`${i + 1}. ${f.userId?.name || 'Anonymous'} - ${f.title}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateFeedbackWithNames();
