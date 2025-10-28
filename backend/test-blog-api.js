// Quick test for Blog API
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/admin';

async function testBlogAPI() {
  try {
    console.log('🔍 Testing Blog API...\n');
    
    // Test GET blogs
    console.log('📖 GET /api/admin/blogs');
    const response = await axios.get(`${API_URL}/blogs`);
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    console.log(`Found ${response.data.data?.length || 0} blogs\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testBlogAPI();
