// Script to create hotels database with sample data for testing
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

// Sample hotels for key countries (will expand later)
const sampleHotels = [
  // Vietnam hotels
  {
    name: 'InterContinental Hanoi Landmark72',
    location: { country: 'Viet Nam', city: 'Hanoi', address: 'Landmark 72 Tower, Hanoi', coordinates: [105.7938, 21.0275] },
    details: {
      description: 'Luxurious hotel in the tallest building in Vietnam with panoramic city views.',
      rating: 4.7, starRating: 5, priceRange: { min: 150, max: 400 }, currency: 'USD',
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'city_view'],
      roomTypes: [
        { type: 'Deluxe City View', price: 150, capacity: 2, size: 42, amenities: ['city_view', 'minibar'] },
        { type: 'Presidential Suite', price: 400, capacity: 4, size: 150, amenities: ['panoramic_view', 'butler_service'] }
      ],
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
      ],
      checkInTime: '14:00', checkOutTime: '12:00',
      policies: { cancellation: 'Free cancellation up to 24 hours', petPolicy: 'No pets', childPolicy: 'Children under 12 stay free' }
    },
    reviewsSummary: { totalReviews: 1247, averageRating: 4.7, ratingBreakdown: { location: 4.8, cleanliness: 4.7, service: 4.6, value: 4.5 } },
    status: 'active', verifiedPartner: true
  },

  // Japan hotels  
  {
    name: 'Aman Tokyo',
    location: { country: 'Japan', city: 'Tokyo', address: '1-5-6 Otemachi, Chiyoda City, Tokyo', coordinates: [139.7673, 35.6870] },
    details: {
      description: 'Serene urban sanctuary blending traditional Japanese aesthetics with contemporary luxury.',
      rating: 4.9, starRating: 5, priceRange: { min: 800, max: 2000 }, currency: 'USD',
      amenities: ['wifi', 'spa', 'gym', 'restaurant', 'bar', 'zen_garden', 'traditional_baths'],
      roomTypes: [
        { type: 'Deluxe Room', price: 800, capacity: 2, size: 71, amenities: ['garden_view', 'deep_soaking_tub'] },
        { type: 'Aman Suite', price: 2000, capacity: 4, size: 126, amenities: ['imperial_palace_view', 'separate_living_room'] }
      ],
      images: [
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'
      ],
      checkInTime: '15:00', checkOutTime: '12:00',
      policies: { cancellation: 'Free cancellation up to 48 hours', petPolicy: 'No pets', childPolicy: 'Children welcome' }
    },
    reviewsSummary: { totalReviews: 567, averageRating: 4.9, ratingBreakdown: { location: 4.9, cleanliness: 5.0, service: 4.9, value: 4.7 } },
    status: 'active', verifiedPartner: true
  },

  // Thailand hotels
  {
    name: 'Mandarin Oriental Bangkok',
    location: { country: 'Thailand', city: 'Bangkok', address: '48 Oriental Avenue, Bangkok', coordinates: [100.5151, 13.7244] },
    details: {
      description: 'Legendary riverside hotel offering timeless elegance and world-class service since 1876.',
      rating: 4.8, starRating: 5, priceRange: { min: 300, max: 1200 }, currency: 'USD',
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'river_view', 'butler_service'],
      roomTypes: [
        { type: 'Superior Room', price: 300, capacity: 2, size: 45, amenities: ['garden_view', 'marble_bathroom'] },
        { type: 'Royal Suite', price: 1200, capacity: 4, size: 200, amenities: ['river_view', 'private_terrace', 'butler'] }
      ],
      images: [
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'
      ],
      checkInTime: '15:00', checkOutTime: '12:00', 
      policies: { cancellation: 'Free cancellation up to 24 hours', petPolicy: 'No pets', childPolicy: 'Children under 12 stay free' }
    },
    reviewsSummary: { totalReviews: 2341, averageRating: 4.8, ratingBreakdown: { location: 5.0, cleanliness: 4.8, service: 4.8, value: 4.6 } },
    status: 'active', verifiedPartner: true
  },

  // Maldives hotels
  {
    name: 'Conrad Maldives Rangali Island',
    location: { country: 'Maldives', city: 'Rangali Island', address: 'Rangali Island, Alif Dhaal Atoll', coordinates: [72.8508, 3.9139] },
    details: {
      description: 'Luxury resort featuring the world\'s first underwater hotel residence and restaurant.',
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

  // France hotels
  {
    name: 'Hotel Plaza Athénée',
    location: { country: 'France', city: 'Paris', address: '25 Avenue Montaigne, Paris', coordinates: [2.3038, 48.8668] },
    details: {
      description: 'Legendary palace hotel on Avenue Montaigne, epitome of French elegance and luxury.',
      rating: 4.9, starRating: 5, priceRange: { min: 800, max: 2500 }, currency: 'EUR',
      amenities: ['wifi', 'spa', 'gym', 'restaurant', 'bar', 'michelin_restaurant', 'valet_parking'],
      roomTypes: [
        { type: 'Superior Room', price: 800, capacity: 2, size: 35, amenities: ['courtyard_view', 'marble_bathroom'] },
        { type: 'Eiffel Suite', price: 2500, capacity: 4, size: 115, amenities: ['eiffel_tower_view', 'terrace'] }
      ],
      images: [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
      ],
      checkInTime: '15:00', checkOutTime: '12:00',
      policies: { cancellation: 'Free cancellation up to 48 hours', petPolicy: 'Pets welcome', childPolicy: 'Children welcome' }
    },
    reviewsSummary: { totalReviews: 2156, averageRating: 4.9, ratingBreakdown: { location: 5.0, cleanliness: 4.9, service: 4.9, value: 4.7 } },
    status: 'active', verifiedPartner: true
  }
];

async function createSampleHotels() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing hotels
    await Hotel.deleteMany({});
    console.log('🗑️  Cleared existing hotels\n');

    console.log('🏨 Adding sample hotels...');
    for (const hotelData of sampleHotels) {
      const hotel = new Hotel(hotelData);
      await hotel.save();
      console.log(`   ✅ ${hotel.name} (${hotel.location.city}, ${hotel.location.country})`);
    }

    console.log(`\n🎉 Successfully added ${sampleHotels.length} sample hotels`);

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createSampleHotels();