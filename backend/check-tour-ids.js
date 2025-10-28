require('dotenv').config();
const mongoose = require('mongoose');
const Tour = require('./models/Tour');

async function checkTours() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const tours = await Tour.find({
      name: { $regex: /paris|switzerland|venice/i }
    }, 'id name country').lean();
    
    console.log('\n📍 Found tours:');
    tours.forEach(tour => {
      console.log(`- ID: ${tour.id}, Name: ${tour.name}, Country: ${tour.country}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTours();
