require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';

const allHotels = [
  // ==================== THAILAND ====================
  {
    name: 'Phuket Paradise Beach Resort',
    location: { country: 'Thailand', city: 'Phuket', address: '99 Patong Beach Road, Phuket', coordinates: [98.2961, 7.8804] },
    details: {
      description: 'Luxurious beachfront resort with stunning ocean views and world-class spa.',
      rating: 4.8,
      images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'beach_access'],
      checkInTime: '14:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Deluxe Ocean View', capacity: 2, pricePerNight: 3500000, available: 15, amenities: ['king_bed', 'ocean_view'], size: 45 },
      { type: 'Beach Villa Suite', capacity: 4, pricePerNight: 6500000, available: 8, amenities: ['king_bed', 'private_pool'], size: 85 }
    ],
    contact: { phone: '+66-76-340-100', email: 'info@phuketparadise.com', website: 'https://phuketparadise.com' }
  },
  {
    name: 'Bangkok Grand City Hotel',
    location: { country: 'Thailand', city: 'Bangkok', address: '123 Sukhumvit Road, Bangkok', coordinates: [100.5577, 13.7307] },
    details: {
      description: 'Modern 5-star hotel in the heart of Bangkok, perfect for shopping.',
      rating: 4.7,
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'rooftop_bar'],
      checkInTime: '15:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
    },
    rooms: [
      { type: 'Superior City View', capacity: 2, pricePerNight: 2500000, available: 20, amenities: ['king_bed', 'city_view'], size: 35 },
      { type: 'Executive Suite', capacity: 3, pricePerNight: 4500000, available: 12, amenities: ['king_bed', 'living_room'], size: 65 }
    ],
    contact: { phone: '+66-2-123-4567', email: 'info@bangkokgrand.com', website: 'https://bangkokgrand.com' }
  },

  // ==================== CANADA ====================
  {
    name: 'Toronto Luxury Downtown Hotel',
    location: { country: 'Canada', city: 'Toronto', address: '100 Front Street West, Toronto', coordinates: [-79.3832, 43.6426] },
    details: {
      description: 'Elegant downtown hotel with CN Tower views and premium amenities.',
      rating: 4.6,
      images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800'],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'business_center'],
      checkInTime: '15:00', checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Deluxe King Room', capacity: 2, pricePerNight: 3200000, available: 18, amenities: ['king_bed', 'city_view'], size: 40 },
      { type: 'Executive Suite', capacity: 4, pricePerNight: 5800000, available: 10, amenities: ['king_bed', 'living_room'], size: 75 }
    ],
    contact: { phone: '+1-416-555-0100', email: 'info@torontoluxury.ca', website: 'https://torontoluxury.ca' }
  },
  {
    name: 'Vancouver Waterfront Resort',
    location: { country: 'Canada', city: 'Vancouver', address: '999 Canada Place, Vancouver', coordinates: [-123.1207, 49.2827] },
    details: {
      description: 'Stunning waterfront location with mountain views and Pacific cuisine.',
      rating: 4.7,
      images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'marina'],
      checkInTime: '16:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 72 hours before check-in'
    },
    rooms: [
      { type: 'Ocean View Room', capacity: 2, pricePerNight: 3800000, available: 15, amenities: ['king_bed', 'ocean_view'], size: 45 },
      { type: 'Mountain Suite', capacity: 3, pricePerNight: 6200000, available: 8, amenities: ['king_bed', 'mountain_view'], size: 80 }
    ],
    contact: { phone: '+1-604-555-0200', email: 'info@vancouverwaterfront.ca', website: 'https://vancouverwaterfront.ca' }
  },

  // ==================== ITALY ====================
  {
    name: 'Rome Imperial Palace Hotel',
    location: { country: 'Italy', city: 'Rome', address: 'Via Veneto 125, Rome', coordinates: [12.4964, 41.9028] },
    details: {
      description: 'Historic luxury hotel near the Spanish Steps and Trevi Fountain.',
      rating: 4.9,
      images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'],
      amenities: ['wifi', 'restaurant', 'bar', 'spa', 'concierge', 'rooftop_terrace'],
      checkInTime: '14:00', checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Classic Double Room', capacity: 2, pricePerNight: 4200000, available: 12, amenities: ['queen_bed', 'city_view'], size: 35 },
      { type: 'Deluxe Suite', capacity: 3, pricePerNight: 7500000, available: 6, amenities: ['king_bed', 'living_room'], size: 70 }
    ],
    contact: { phone: '+39-06-1234-5678', email: 'info@romeimperial.it', website: 'https://romeimperial.it' }
  },
  {
    name: 'Venice Canal View Hotel',
    location: { country: 'Italy', city: 'Venice', address: 'San Marco 1234, Venice', coordinates: [12.3155, 45.4408] },
    details: {
      description: 'Romantic boutique hotel with gondola access and canal views.',
      rating: 4.8,
      images: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800'],
      amenities: ['wifi', 'restaurant', 'bar', 'concierge', 'water_taxi'],
      checkInTime: '15:00', checkOutTime: '10:00',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
    },
    rooms: [
      { type: 'Canal View Room', capacity: 2, pricePerNight: 5200000, available: 8, amenities: ['queen_bed', 'canal_view'], size: 30 },
      { type: 'Romantic Suite', capacity: 2, pricePerNight: 8500000, available: 4, amenities: ['king_bed', 'balcony'], size: 55 }
    ],
    contact: { phone: '+39-041-234-5678', email: 'info@venicecanal.it', website: 'https://venicecanal.it' }
  },

  // ==================== SPAIN ====================
  {
    name: 'Barcelona Gaudi Boutique Hotel',
    location: { country: 'Spain', city: 'Barcelona', address: 'Passeig de Gràcia 92, Barcelona', coordinates: [2.1734, 41.3851] },
    details: {
      description: 'Modern design hotel near Sagrada Familia with rooftop pool.',
      rating: 4.7,
      images: ['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800'],
      amenities: ['wifi', 'pool', 'restaurant', 'bar', 'gym', 'rooftop_bar'],
      checkInTime: '15:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Superior Double', capacity: 2, pricePerNight: 3400000, available: 15, amenities: ['queen_bed', 'city_view'], size: 28 },
      { type: 'Junior Suite', capacity: 3, pricePerNight: 5600000, available: 8, amenities: ['king_bed', 'terrace'], size: 50 }
    ],
    contact: { phone: '+34-93-123-4567', email: 'info@barcelonagaudi.es', website: 'https://barcelonagaudi.es' }
  },

  // ==================== MALAYSIA ====================
  {
    name: 'Kuala Lumpur Twin Towers Hotel',
    location: { country: 'Malaysia', city: 'Kuala Lumpur', address: 'Jalan Ampang, Kuala Lumpur', coordinates: [101.6869, 3.1390] },
    details: {
      description: '5-star hotel with Petronas Towers views and luxury shopping access.',
      rating: 4.6,
      images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'shopping_mall'],
      checkInTime: '15:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
    },
    rooms: [
      { type: 'Deluxe Tower View', capacity: 2, pricePerNight: 2800000, available: 20, amenities: ['king_bed', 'tower_view'], size: 38 },
      { type: 'Executive Suite', capacity: 4, pricePerNight: 5200000, available: 10, amenities: ['king_bed', 'living_room'], size: 65 }
    ],
    contact: { phone: '+60-3-1234-5678', email: 'info@kltowers.my', website: 'https://kltowers.my' }
  },

  // ==================== UNITED KINGDOM ====================
  {
    name: 'London Westminster Grand Hotel',
    location: { country: 'United Kingdom', city: 'London', address: '1 Westminster Bridge Road, London', coordinates: [-0.1276, 51.5074] },
    details: {
      description: 'Iconic hotel overlooking Big Ben and the Thames River.',
      rating: 4.8,
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
      amenities: ['wifi', 'restaurant', 'bar', 'spa', 'gym', 'concierge', 'afternoon_tea'],
      checkInTime: '15:00', checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Classic Double', capacity: 2, pricePerNight: 4500000, available: 18, amenities: ['queen_bed', 'city_view'], size: 32 },
      { type: 'Thames View Suite', capacity: 3, pricePerNight: 8200000, available: 8, amenities: ['king_bed', 'river_view'], size: 68 }
    ],
    contact: { phone: '+44-20-7123-4567', email: 'info@londonwestminster.co.uk', website: 'https://londonwestminster.co.uk' }
  },

  // ==================== INDIA ====================
  {
    name: 'Delhi Taj Palace Hotel',
    location: { country: 'India', city: 'Delhi', address: '2 Sardar Patel Marg, New Delhi', coordinates: [77.2090, 28.6139] },
    details: {
      description: 'Luxury heritage hotel with Mughal architecture and royal service.',
      rating: 4.7,
      images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'cultural_shows'],
      checkInTime: '14:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Deluxe Palace Room', capacity: 2, pricePerNight: 2200000, available: 25, amenities: ['king_bed', 'garden_view'], size: 40 },
      { type: 'Royal Suite', capacity: 4, pricePerNight: 5500000, available: 10, amenities: ['king_bed', 'living_room'], size: 90 }
    ],
    contact: { phone: '+91-11-1234-5678', email: 'info@delhitaj.in', website: 'https://delhitaj.in' }
  },

  // ==================== PORTUGAL ====================
  {
    name: 'Lisbon Riverside Boutique Hotel',
    location: { country: 'Portugal', city: 'Lisbon', address: 'Rua do Alecrim 12, Lisbon', coordinates: [-9.1393, 38.7223] },
    details: {
      description: 'Charming hotel in historic Alfama district with river views.',
      rating: 4.6,
      images: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800'],
      amenities: ['wifi', 'restaurant', 'bar', 'rooftop_terrace', 'wine_cellar'],
      checkInTime: '15:00', checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Classic Double', capacity: 2, pricePerNight: 2400000, available: 12, amenities: ['queen_bed', 'city_view'], size: 28 },
      { type: 'River View Suite', capacity: 3, pricePerNight: 4200000, available: 6, amenities: ['king_bed', 'balcony'], size: 50 }
    ],
    contact: { phone: '+351-21-123-4567', email: 'info@lisbonriverside.pt', website: 'https://lisbonriverside.pt' }
  },

  // ==================== RUSSIA ====================
  {
    name: 'Moscow Red Square Hotel',
    location: { country: 'Russia', city: 'Moscow', address: 'Tverskaya Street 15, Moscow', coordinates: [37.6173, 55.7558] },
    details: {
      description: 'Historic luxury hotel with views of the Kremlin and Red Square.',
      rating: 4.7,
      images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800'],
      amenities: ['wifi', 'restaurant', 'bar', 'spa', 'gym', 'concierge'],
      checkInTime: '14:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Deluxe Room', capacity: 2, pricePerNight: 3200000, available: 15, amenities: ['king_bed', 'city_view'], size: 35 },
      { type: 'Kremlin Suite', capacity: 3, pricePerNight: 6500000, available: 8, amenities: ['king_bed', 'kremlin_view'], size: 70 }
    ],
    contact: { phone: '+7-495-123-4567', email: 'info@moscowredsquare.ru', website: 'https://moscowredsquare.ru' }
  },

  // ==================== GREECE ====================
  {
    name: 'Santorini Sunset Villa Resort',
    location: { country: 'Greece', city: 'Santorini', address: 'Oia Village, Santorini', coordinates: [25.3753, 36.4618] },
    details: {
      description: 'Stunning clifftop resort with infinity pools and caldera views.',
      rating: 4.9,
      images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'],
      amenities: ['wifi', 'pool', 'restaurant', 'bar', 'spa', 'sunset_terrace'],
      checkInTime: '15:00', checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 72 hours before check-in'
    },
    rooms: [
      { type: 'Cave Suite', capacity: 2, pricePerNight: 5500000, available: 10, amenities: ['king_bed', 'caldera_view'], size: 45 },
      { type: 'Private Pool Villa', capacity: 4, pricePerNight: 9500000, available: 5, amenities: ['king_bed', 'private_pool'], size: 85 }
    ],
    contact: { phone: '+30-22860-12345', email: 'info@santorinisunset.gr', website: 'https://santorinisunset.gr' }
  },

  // ==================== GERMANY ====================
  {
    name: 'Berlin Modern City Hotel',
    location: { country: 'Germany', city: 'Berlin', address: 'Unter den Linden 77, Berlin', coordinates: [13.4050, 52.5200] },
    details: {
      description: 'Contemporary hotel near Brandenburg Gate with rooftop views.',
      rating: 4.6,
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
      amenities: ['wifi', 'restaurant', 'bar', 'gym', 'business_center', 'rooftop_bar'],
      checkInTime: '15:00', checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
    },
    rooms: [
      { type: 'Superior Room', capacity: 2, pricePerNight: 2800000, available: 20, amenities: ['queen_bed', 'city_view'], size: 30 },
      { type: 'Executive Suite', capacity: 3, pricePerNight: 4800000, available: 10, amenities: ['king_bed', 'living_room'], size: 60 }
    ],
    contact: { phone: '+49-30-1234-5678', email: 'info@berlinmodern.de', website: 'https://berlinmodern.de' }
  },

  // ==================== NETHERLANDS ====================
  {
    name: 'Amsterdam Canal House Hotel',
    location: { country: 'Netherlands', city: 'Amsterdam', address: 'Herengracht 341, Amsterdam', coordinates: [4.8952, 52.3702] },
    details: {
      description: 'Historic canal house hotel with Dutch Golden Age charm.',
      rating: 4.7,
      images: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800'],
      amenities: ['wifi', 'restaurant', 'bar', 'bike_rental', 'canal_view'],
      checkInTime: '15:00', checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      { type: 'Canal View Room', capacity: 2, pricePerNight: 3200000, available: 12, amenities: ['queen_bed', 'canal_view'], size: 28 },
      { type: 'Deluxe Suite', capacity: 3, pricePerNight: 5500000, available: 6, amenities: ['king_bed', 'living_room'], size: 55 }
    ],
    contact: { phone: '+31-20-123-4567', email: 'info@amsterdamcanal.nl', website: 'https://amsterdamcanal.nl' }
  },

  // ==================== HONG KONG ====================
  {
    name: 'Hong Kong Harbour View Hotel',
    location: { country: 'Hong Kong', city: 'Causeway Bay', address: '1 Harbour Road, Hong Kong', coordinates: [114.1694, 22.3193] },
    details: {
      description: 'Luxury hotel with Victoria Harbour views and shopping access.',
      rating: 4.8,
      images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'harbour_view'],
      checkInTime: '15:00', checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
    },
    rooms: [
      { type: 'Harbour View Room', capacity: 2, pricePerNight: 3800000, available: 18, amenities: ['king_bed', 'harbour_view'], size: 38 },
      { type: 'Executive Suite', capacity: 4, pricePerNight: 6800000, available: 10, amenities: ['king_bed', 'living_room'], size: 75 }
    ],
    contact: { phone: '+852-2123-4567', email: 'info@hkharbour.hk', website: 'https://hkharbour.hk' }
  }
];

async function addAllMissingHotels() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let addedCount = 0;
    let skippedCount = 0;

    console.log(`📊 Processing ${allHotels.length} hotels...\n`);

    for (const hotelData of allHotels) {
      // Check if hotel already exists by name
      const exists = await Hotel.findOne({ name: hotelData.name });
      
      if (exists) {
        console.log(`⚠️  "${hotelData.name}" already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Calculate priceRange from rooms
      const roomPrices = hotelData.rooms.map(r => r.pricePerNight);
      hotelData.details.priceRange = {
        min: Math.min(...roomPrices),
        max: Math.max(...roomPrices)
      };

      const hotel = new Hotel(hotelData);
      await hotel.save();
      console.log(`✅ Added: ${hotel.name}`);
      console.log(`   📍 ${hotel.location.city}, ${hotel.location.country}`);
      console.log(`   🆔 ID: ${hotel._id}`);
      console.log(`   ⭐ Rating: ${hotel.details.rating}\n`);
      addedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Summary:`);
    console.log(`   ✅ Added: ${addedCount} hotels`);
    console.log(`   ⚠️  Skipped (already exists): ${skippedCount} hotels`);
    console.log('='.repeat(60));

    // Show final count by country
    const allCountries = await Hotel.aggregate([
      { $group: { _id: '$location.country', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 Hotels by Country:');
    allCountries.forEach(({ _id, count }) => {
      console.log(`   🌍 ${_id}: ${count} hotels`);
    });

    console.log('\n👋 Closing connection...');
    await mongoose.connection.close();
    console.log('✅ Script completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addAllMissingHotels();
