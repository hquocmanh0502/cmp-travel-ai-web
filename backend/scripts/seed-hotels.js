// Seed hotels from data/hotels-complete.json and data/hotels-by-destination.json,
// transformed to match the current Hotel schema (backend/models/Hotel.js).
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');

const ROOM_TYPE_ENUM = ['Superior', 'Junior Deluxe', 'Deluxe', 'Suite', 'Family', 'President'];

function mapRoomType(label = '') {
  const lower = label.toLowerCase();
  if (lower.includes('president')) return 'President';
  if (lower.includes('family')) return 'Family';
  if (lower.includes('suite')) return 'Suite';
  if (lower.includes('junior')) return 'Junior Deluxe';
  if (lower.includes('deluxe')) return 'Deluxe';
  return 'Superior';
}

function transformHotel(raw, country) {
  const details = raw.details || {};
  const images = details.images || [];
  const roomTypes = (details.roomTypes && details.roomTypes.length > 0)
    ? details.roomTypes
    : [{ type: 'Standard Room', price: (details.priceRange && details.priceRange.min) || 100, capacity: 2 }];

  return {
    name: raw.name,
    location: {
      address: raw.location?.address || `${raw.name}, ${country}`,
      coordinates: raw.location?.coordinates,
      city: raw.location?.city || country,
      country: raw.location?.country || country,
      distanceToCenter: raw.location?.distanceToCenter
    },
    details: {
      rating: details.rating,
      starRating: details.starRating,
      priceRange: details.priceRange || { min: 100, max: 300 },
      currency: details.currency || 'USD',
      mainImage: images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      amenities: details.amenities || [],
      roomTypes: roomTypes.map((rt) => ({
        type: mapRoomType(rt.type || rt.name),
        name: rt.name || rt.type || 'Standard Room',
        price: rt.price,
        capacity: {
          adults: typeof rt.capacity === 'number' ? rt.capacity : (rt.capacity?.adults || 2),
          children: rt.capacity?.children || 0,
          total: typeof rt.capacity === 'number' ? rt.capacity : (rt.capacity?.total || rt.capacity?.adults || 2)
        },
        size: rt.size,
        amenities: rt.amenities || []
      })),
      images,
      description: details.description,
      checkInTime: details.checkInTime,
      checkOutTime: details.checkOutTime,
      policies: details.policies
    },
    reviewsSummary: raw.reviewsSummary,
    status: 'active',
    verifiedPartner: true
  };
}

async function seedHotels() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');

  const sources = ['hotels-complete.json', 'hotels-by-destination.json'];
  const seenNames = new Set();
  const hotels = [];

  for (const file of sources) {
    const filePath = path.join(__dirname, '../../data', file);
    const byCountry = require(filePath);
    for (const [country, list] of Object.entries(byCountry)) {
      for (const raw of list) {
        if (seenNames.has(raw.name)) continue;
        seenNames.add(raw.name);
        hotels.push(transformHotel(raw, country));
      }
    }
  }

  await Hotel.deleteMany({});
  console.log('🗑️  Cleared existing hotels');

  const inserted = await Hotel.insertMany(hotels, { ordered: false });
  console.log(`✅ ${inserted.length} hotels imported across ${new Set(inserted.map(h => h.location.country)).size} countries`);

  await mongoose.disconnect();
  process.exit(0);
}

seedHotels().catch((err) => {
  console.error('❌ Hotel seed failed:', err.message);
  process.exit(1);
});
