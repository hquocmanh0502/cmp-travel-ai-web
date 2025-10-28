const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/analytics/overview',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✅ API Response:');
      console.log('Total Revenue:', json.data?.totalRevenue || 0);
      console.log('Total Bookings:', json.data?.totalBookings || 0);
      console.log('Total Users:', json.data?.totalUsers || 0);
      console.log('Revenue Growth:', json.data?.revenueGrowth || 0);
      console.log('\nRevenue by Month:', json.data?.revenueByMonth?.length || 0, 'months');
      console.log('Top Tours:', json.data?.topTours?.length || 0, 'tours');
      process.exit(0);
    } catch (e) {
      console.error('Parse error:', e);
      console.log('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});

req.end();
