const connectDB = require('./config/db');
const Tour = require('./models/Tour');

async function checkTours() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Tìm các tour cụ thể
    const tourNames = ['Paris', 'Venice', 'Maldives', 'Lauterbrunnen', 'Switzerland'];
    
    console.log('🔍 Tìm tours theo tên...\n');
    
    for (const name of tourNames) {
      const tours = await Tour.find({
        $or: [
          { name: { $regex: name, $options: 'i' } },
          { country: { $regex: name, $options: 'i' } }
        ]
      }, 'id name country _id').lean();
      
      if (tours.length > 0) {
        console.log(`\n📍 "${name}":`);
        tours.forEach(tour => {
          console.log(`   - ID: ${tour.id || 'N/A'}, Name: ${tour.name}, Country: ${tour.country}`);
          console.log(`     MongoDB _id: ${tour._id}`);
        });
      } else {
        console.log(`\n❌ Không tìm thấy tour cho "${name}"`);
      }
    }
    
    // Đếm tổng số tours
    const totalCount = await Tour.countDocuments();
    console.log(`\n\n📊 Tổng số tours trong database: ${totalCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTours();
