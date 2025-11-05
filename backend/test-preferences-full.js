const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testPreferencesAPI() {
  const baseURL = 'http://localhost:3000/api/preferences';
  const userId = '69006c243a8a7b5d3ddc69ff'; // QuocManh user ID

  console.log('🧪 Testing Preferences API...\n');

  try {
    // Test 1: GET current preferences
    console.log('1️⃣ Testing GET /api/preferences/:userId');
    const getResponse = await fetch(`${baseURL}/${userId}`);
    const getResult = await getResponse.json();
    
    console.log('Status:', getResponse.status);
    console.log('Response:', JSON.stringify(getResult, null, 2));
    
    if (getResult.success) {
      console.log('✅ GET preferences: SUCCESS\n');
    } else {
      console.log('❌ GET preferences: FAILED\n');
      return;
    }

    // Test 2: Update preferences with new data
    console.log('2️⃣ Testing PUT /api/preferences/:userId');
    const updateData = {
      budgetRange: { min: 800, max: 6000 },
      travelStyle: ['adventure', 'cultural', 'relaxation'],
      activities: ['sightseeing', 'shopping', 'hiking'],
      favoriteCountries: ['Thailand', 'Vietnam'],
      climatePreference: 'tropical',
      groupSize: 'large',
      travelFrequency: 'monthly',
      accommodation: {
        type: 'resort',
        minRating: 5,
        amenities: ['wifi', 'pool', 'spa', 'gym', 'breakfast']
      },
      dietaryRestrictions: ['Vegetarian', 'No spicy food'],
      languagePreference: 'vi'
    };

    const putResponse = await fetch(`${baseURL}/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const putResult = await putResponse.json();
    
    console.log('Status:', putResponse.status);
    console.log('Response:', JSON.stringify(putResult, null, 2));
    
    if (putResult.success) {
      console.log('✅ PUT preferences: SUCCESS\n');
    } else {
      console.log('❌ PUT preferences: FAILED\n');
      return;
    }

    // Test 3: Verify the update
    console.log('3️⃣ Testing GET after update');
    const verifyResponse = await fetch(`${baseURL}/${userId}`);
    const verifyResult = await verifyResponse.json();
    
    console.log('Status:', verifyResponse.status);
    if (verifyResult.success) {
      console.log('✅ Verification: SUCCESS');
      console.log('Updated preferences:', JSON.stringify(verifyResult.preferences, null, 2));
      
      // Check specific fields
      const prefs = verifyResult.preferences;
      console.log('\n🔍 Field verification:');
      console.log('- Budget:', prefs.budgetRange);
      console.log('- Climate:', prefs.climatePreference);
      console.log('- Countries:', prefs.favoriteCountries);
      console.log('- Activities:', prefs.activities);
      console.log('- Language:', prefs.languagePreference);
    } else {
      console.log('❌ Verification: FAILED');
    }

    // Test 4: Summary endpoint
    console.log('\n4️⃣ Testing GET /api/preferences/:userId/summary');
    const summaryResponse = await fetch(`${baseURL}/${userId}/summary`);
    const summaryResult = await summaryResponse.json();
    
    console.log('Status:', summaryResponse.status);
    console.log('Summary:', JSON.stringify(summaryResult, null, 2));
    
    if (summaryResult.success) {
      console.log('✅ Summary: SUCCESS\n');
      console.log(`📊 Completion: ${summaryResult.summary.completionPercentage}%`);
      console.log(`📋 Complete: ${summaryResult.summary.isComplete}`);
      console.log(`⚠️ Missing: ${summaryResult.summary.missingFields.join(', ') || 'None'}`);
    } else {
      console.log('❌ Summary: FAILED\n');
    }

    console.log('\n🎯 All API tests completed!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testPreferencesAPI();