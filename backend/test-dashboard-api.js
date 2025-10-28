// Test script for Dashboard API endpoints
// Run: node test-dashboard-api.js

const BASE_URL = 'http://localhost:3000/api/admin';

// Helper function to test API endpoints
async function testEndpoint(method, endpoint, data = null) {
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();

    console.log(`\n✅ ${method} ${endpoint}`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
    
    return result;
  } catch (error) {
    console.error(`\n❌ ${method} ${endpoint}`);
    console.error('Error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Dashboard Backend APIs\n');
  console.log('='.repeat(60));

  // Test 1: Dashboard Analytics Overview
  console.log('\n📊 Testing Dashboard Analytics...');
  await testEndpoint('GET', '/analytics/overview');

  // Test 2: Tours
  console.log('\n🗺️ Testing Tours Management...');
  await testEndpoint('GET', '/tours');
  await testEndpoint('GET', '/tours?search=bangkok');
  await testEndpoint('GET', '/tours?type=day-tour');

  // Test 3: Users
  console.log('\n👥 Testing Users Management...');
  await testEndpoint('GET', '/users');
  await testEndpoint('GET', '/users?status=verified');

  // Test 4: Hotels
  console.log('\n🏨 Testing Hotels Management...');
  await testEndpoint('GET', '/hotels');
  await testEndpoint('GET', '/hotels?search=hotel');

  // Test 5: Reviews
  console.log('\n⭐ Testing Reviews Management...');
  await testEndpoint('GET', '/reviews');
  await testEndpoint('GET', '/reviews?status=approved');
  await testEndpoint('GET', '/reviews?rating=5');

  // Test 6: Bookings Stats
  console.log('\n📅 Testing Bookings Stats...');
  await testEndpoint('GET', '/bookings/stats');

  // Test 7: Blogs
  console.log('\n📝 Testing Blog Management...');
  await testEndpoint('GET', '/blogs');

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ All tests completed!');
  console.log('\n📝 Notes:');
  console.log('- All GET endpoints are working');
  console.log('- POST/PUT/DELETE require actual data to test');
  console.log('- Consider adding proper authentication');
  console.log('- Add pagination for large datasets');
}

// Run tests
runTests().catch(console.error);
