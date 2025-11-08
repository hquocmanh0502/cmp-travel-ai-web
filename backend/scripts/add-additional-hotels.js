// Add more hotels for missing countries
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

const additionalHotels = [
  // Maldives
  {
    name: 'Conrad Maldives Rangali Island',
    location: { country: 'Maldives', city: 'Rangali Island', address: 'Rangali Island, Alif Dhaal Atoll', coordinates: [72.8508, 3.9139] },
    details: {
      description: 'Luxury resort featuring the world first underwater hotel residence and restaurant.',
      rating: 4.9, starRating: 5, priceRange: { min: 800, max: 2500 }, currency: 'USD',
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'beach', 'private_beach', 'underwater_restaurant'],
      roomTypes: [
        { type: 'Beach Villa', price: 800, capacity: 2, size: 150, amenities: ['beach_access', 'private_pool'] },
        { type: 'Underwater Suite', price: 2500, capacity: 2, size: 200, amenities: ['underwater_view', 'glass_walls'] }
      ],
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
        'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800'
      ],
      checkInTime: '15:00', checkOutTime: '12:00',
      policies: { cancellation: 'Free cancellation up to 48 hours', petPolicy: 'No pets', childPolicy: 'Children under 16 stay free' }
    },
    reviewsSummary: { totalReviews: 856, averageRating: 4.9, ratingBreakdown: { location: 5.0, cleanliness: 4.9, service: 4.9, value: 4.7 } },
    status: 'active', verifiedPartner: true
  },
  
  {
    name: 'Soneva Fushi',
    location: { country: 'Maldives', city: 'Kunfunadhoo', address: 'Kunfunadhoo Island, Baa Atoll', coordinates: [73.0661, 5.3394] },
    details: {
      description: 'Eco-luxury resort in UNESCO Biosphere Reserve with no shoes no news philosophy.',
      rating: 4.8, starRating: 5, priceRange: { min: 1200, max: 3000 }, currency: 'USD',
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'beach', 'private_beach', 'observatory', 'organic_garden'],
      roomTypes: [
        { type: 'Villa Suite', price: 1200, capacity: 2, size: 410, amenities: ['jungle_views', 'private_pool', 'outdoor_bathroom'] },
        { type: 'Private Reserve', price: 3000, capacity: 8, size: 1500, amenities: ['private_beach', 'multiple_pools', 'chef'] }
      ],
      images: [
        'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800',
        'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800'
      ],
      checkInTime: '15:00', checkOutTime: '12:00',
      policies: { cancellation: 'Free cancellation up to 72 hours', petPolicy: 'No pets', childPolicy: 'Children welcome' }
    },
    reviewsSummary: { totalReviews: 634, averageRating: 4.8, ratingBreakdown: { location: 5.0, cleanliness: 4.8, service: 4.8, value: 4.6 } },
    status: 'active', verifiedPartner: true
  },

  // Add more for Germany, Canada, etc.
  {
    name: 'Hotel Adlon Kempinski Berlin',
    location: { country: 'Germany', city: 'Berlin', address: 'Unter den Linden 77, Berlin', coordinates: [13.3777, 52.5163] },
    details: {
      description: 'Historic luxury hotel next to Brandenburg Gate, symbol of Berlin hospitality.',
      rating: 4.8, starRating: 5, priceRange: { min: 350, max: 1200 }, currency: 'EUR',
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'valet_parking'],
      roomTypes: [
        { type: 'Classic Room', price: 350, capacity: 2, size: 40, amenities: ['city_view', 'marble_bathroom'] },
        { type: 'Brandenburg Suite', price: 1200, capacity: 4, size: 90, amenities: ['brandenburg_gate_view', 'terrace'] }
      ],
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
      ],
      checkInTime: '15:00', checkOutTime: '11:00',
      policies: { cancellation: 'Free cancellation up to 24 hours', petPolicy: 'Pets welcome with fee', childPolicy: 'Children under 16 stay free' }
    },
    reviewsSummary: { totalReviews: 1834, averageRating: 4.8, ratingBreakdown: { location: 5.0, cleanliness: 4.8, service: 4.8, value: 4.5 } },
    status: 'active', verifiedPartner: true
  }
];

async function addAdditionalHotels() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🏨 Adding additional hotels...');
    for (const hotelData of additionalHotels) {
      // Check if exists
      const exists = await Hotel.findOne({ name: hotelData.name });
      if (exists) {
        console.log(`   ⚠️  ${hotelData.name} already exists, skipping...`);
        continue;
      }

      const hotel = new Hotel(hotelData);
      await hotel.save();
      console.log(`   ✅ ${hotel.name} (${hotel.location.city}, ${hotel.location.country})`);
    }

    console.log(`\n🎉 Successfully processed ${additionalHotels.length} hotels`);

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addAdditionalHotels();