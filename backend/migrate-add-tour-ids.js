const connectDB = require('./config/db');
const Tour = require('./models/Tour');
const fs = require('fs');
const path = require('path');

async function migrateToursAddId() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Đọc data từ file JSON
    const dataPath = path.join(__dirname, '../data/data.json');
    const toursData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`📂 Loaded ${toursData.length} tours from data.json\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const tourData of toursData) {
      try {
        // Tìm tour trong database theo tên
        const tour = await Tour.findOne({ name: tourData.name });
        
        if (!tour) {
          console.log(`⚠️  Tour không tìm thấy: ${tourData.name}`);
          skipped++;
          continue;
        }
        
        // Kiểm tra xem đã có id chưa
        if (tour.id) {
          console.log(`✓ Tour "${tourData.name}" đã có id: ${tour.id}`);
          skipped++;
          continue;
        }
        
        // Update với id từ JSON
        tour.id = tourData.id;
        await tour.save();
        
        console.log(`✅ Updated "${tourData.name}": id = ${tourData.id}`);
        updated++;
        
      } catch (error) {
        console.error(`❌ Error updating "${tourData.name}":`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Tổng kết:`);
    console.log(`   - Đã cập nhật: ${updated}`);
    console.log(`   - Bỏ qua: ${skipped}`);
    console.log(`   - Lỗi: ${errors}`);
    
    // Verify
    console.log(`\n🔍 Kiểm tra lại các tours quan trọng...`);
    const importantTours = ['Paris', 'Venice', 'Maldives', 'Lauterbrunnen'];
    
    for (const name of importantTours) {
      const tour = await Tour.findOne({ name });
      if (tour) {
        console.log(`   - ${name}: id = ${tour.id || 'CHƯA CÓ!'}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    process.exit(1);
  }
}

migrateToursAddId();
