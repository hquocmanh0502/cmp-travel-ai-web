const mongoose = require('mongoose');
const path = require('path');

// Load .env với đường dẫn chính xác
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    console.log('🔍 Environment check:');
    console.log('Current directory:', __dirname);
    console.log('Env file path:', path.join(__dirname, '../.env'));
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('MONGODB_URI starts with:', process.env.MONGODB_URI?.substring(0, 20) + '...');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found');
      return;
    }
    
    console.log('\n🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully!');
    
    // Lấy thông tin database
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📍 Database name: ${dbName}`);
    
    // Lấy danh sách collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 Collections in database:');
    
    if (collections.length === 0) {
      console.log('  ⚠️  No collections found');
    } else {
      collections.forEach(col => console.log(`  - ${col.name}`));
    }
    
    // Kiểm tra số lượng documents trong mỗi collection
    console.log('\n📊 Document counts:');
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count} documents`);
      
      // Lấy sample document nếu có data
      if (count > 0) {
        const sample = await mongoose.connection.db.collection(col.name).findOne();
        console.log(`  📝 Sample ${col.name} structure:`, Object.keys(sample));
      }
    }
    
    // Kiểm tra cụ thể collection tours
    const tourCount = await mongoose.connection.db.collection('tours').countDocuments();
    if (tourCount > 0) {
      console.log('\n🎯 Sample tour document:');
      const sampleTour = await mongoose.connection.db.collection('tours').findOne();
      console.log(JSON.stringify(sampleTour, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from database');
    }
  }
};

connectDB();