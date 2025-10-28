require('dotenv').config();
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

const websiteFeedbackSamples = [
  {
    title: 'Website Feedback - design',
    rating: 5,
    content: 'The website design is absolutely stunning! The interface is modern, clean, and easy to navigate. Love the color scheme and animations.',
    category: 'design'
  },
  {
    title: 'Website Feedback - navigation',
    rating: 5,
    content: 'Navigation is incredibly smooth. I can find everything I need within seconds. The menu structure is very intuitive.',
    category: 'navigation'
  },
  {
    title: 'Website Feedback - ai-chatbot',
    rating: 5,
    content: 'The AI chatbot is amazing! It helped me find the perfect tour based on my preferences. Very intelligent and helpful responses.',
    category: 'ai-chatbot'
  },
  {
    title: 'Website Feedback - booking',
    rating: 5,
    content: 'Booking process is super easy and straightforward. Love how everything is explained clearly at each step.',
    category: 'booking'
  },
  {
    title: 'Website Feedback - mobile',
    rating: 4,
    content: 'Mobile version works great! Responsive design adapts perfectly to my phone screen. Very convenient for booking on the go.',
    category: 'mobile'
  },
  {
    title: 'Website Feedback - speed',
    rating: 5,
    content: 'Website loads incredibly fast! No lag or waiting time. The performance is excellent.',
    category: 'speed'
  },
  {
    title: 'Website Feedback - search',
    rating: 4,
    content: 'Search functionality is powerful. The filters help me narrow down exactly what I\'m looking for. Very useful feature.',
    category: 'search'
  },
  {
    title: 'Website Feedback - content',
    rating: 5,
    content: 'Content is very detailed and informative. Beautiful photos and comprehensive tour descriptions help me make informed decisions.',
    category: 'content'
  },
  {
    title: 'Website Feedback - design',
    rating: 5,
    content: 'Best travel website I\'ve used! Everything from design to functionality is top-notch. Highly recommend!',
    category: 'design'
  },
  {
    title: 'Website Feedback - navigation',
    rating: 5,
    content: 'User experience is fantastic. The website anticipates what I need and makes everything accessible. Great job!',
    category: 'navigation'
  }
];

async function addWebsiteFeedback() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a sample user or use the first user
    const users = await User.find().limit(5);
    if (users.length === 0) {
      console.log('⚠️ No users found. Creating feedback as anonymous...');
    }

    console.log('📝 Creating website feedback samples...\n');

    let created = 0;
    for (const sample of websiteFeedbackSamples) {
      const feedbackData = {
        userId: users[Math.floor(Math.random() * users.length)]?._id || null,
        type: 'general_feedback',
        rating: sample.rating,
        title: sample.title,
        content: sample.content,
        tags: [sample.category],
        status: 'approved',
        isPublic: true,
        metadata: {
          source: 'web'
        }
      };

      const feedback = new Feedback(feedbackData);
      await feedback.save();
      
      console.log(`✅ Created: ${sample.title} - ${'⭐'.repeat(sample.rating)}`);
      created++;
    }

    console.log(`\n🎉 Successfully created ${created} website feedback samples!`);

    // Verify
    const webFeedback = await Feedback.find({ 
      type: 'general_feedback',
      status: 'approved',
      isPublic: true
    });

    console.log(`\n📊 Total website feedback in database: ${webFeedback.length}`);
    console.log(`   - 5 stars: ${webFeedback.filter(f => f.rating === 5).length}`);
    console.log(`   - 4 stars: ${webFeedback.filter(f => f.rating === 4).length}`);

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addWebsiteFeedback();
