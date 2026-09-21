const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    console.log('🔄 Testing MongoDB Atlas connection...');
    await mongoose.connect(uri);
    console.log('✅ Connected successfully!');
    
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📍 Database: ${dbName}`);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Collections (${collections.length}):`, collections.map(c => c.name));
    
    // Lấy sample data từ mỗi collection
    for (const col of collections) {
      console.log(`\n=== ${col.name.toUpperCase()} ===`);
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`Count: ${count}`);
      
      if (count > 0) {
        const sample = await mongoose.connection.db.collection(col.name).findOne();
        console.log('Sample structure:', Object.keys(sample));
        
        // Hiển thị 1 document mẫu đầy đủ (chỉ collection đầu tiên)
        if (col.name === collections[0].name) {
          console.log('Full sample document:');
          console.log(JSON.stringify(sample, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
};

testConnection();