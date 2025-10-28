require('dotenv').config();
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

async function makePublic() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Update all approved feedback to be public
    const result = await Feedback.updateMany(
      { status: 'approved', rating: { $gte: 4 } },
      { $set: { isPublic: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} feedback(s) to public`);

    // Check result
    const publicFeedback = await Feedback.find({ 
      status: 'approved', 
      isPublic: true,
      rating: { $gte: 4 }
    }).limit(5);

    console.log(`\n📊 Sample of public feedback (${publicFeedback.length}):\n`);
    publicFeedback.forEach((f, i) => {
      console.log(`${i + 1}. ${f.title}`);
      console.log(`   Rating: ${'⭐'.repeat(f.rating)}`);
      console.log(`   Content: ${f.content.substring(0, 80)}...`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

makePublic();
