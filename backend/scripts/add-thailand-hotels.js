require('dotenv').config();
const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');

const thailandHotels = [
  {
    name: 'Phuket Paradise Beach Resort',
    location: {
      country: 'Thailand',
      city: 'Phuket',
      address: '99 Patong Beach Road, Patong, Phuket 83150',
      coordinates: [98.2961, 7.8804]
    },
    details: {
      description: 'Luxurious beachfront resort with stunning ocean views, infinity pools, and world-class spa facilities. Perfect for tropical getaways.',
      rating: 4.8,
      images: [
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
      ],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'beach_access', 'airport_shuttle', 'room_service'],
      checkInTime: '14:00',
      checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
    },
    rooms: [
      {
        type: 'Deluxe Ocean View',
        capacity: 2,
        pricePerNight: 3500000,
        available: 15,
        amenities: ['king_bed', 'balcony', 'ocean_view', 'minibar', 'safe'],
        size: 45
      },
      {
        type: 'Beach Villa Suite',
        capacity: 4,
        pricePerNight: 6500000,
        available: 8,
        amenities: ['king_bed', 'sofa_bed', 'private_pool', 'ocean_view', 'kitchenette'],
        size: 85
      },
      {
        type: 'Family Pool Villa',
        capacity: 6,
        pricePerNight: 9500000,
        available: 5,
        amenities: ['two_king_beds', 'private_pool', 'ocean_view', 'kitchen', 'living_room'],
        size: 120
      }
    ],
    contact: {
      phone: '+66-76-340-100',
      email: 'info@phuketparadise.com',
      website: 'https://phuketparadise.com'
    }
  },
  {
    name: 'Bangkok Grand City Hotel',
    location: {
      country: 'Thailand',
      city: 'Bangkok',
      address: '123 Sukhumvit Road, Watthana, Bangkok 10110',
      coordinates: [100.5577, 13.7307]
    },
    details: {
      description: 'Modern 5-star hotel in the heart of Bangkok, steps from BTS Skytrain. Perfect for shopping and nightlife exploration.',
      rating: 4.7,
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'
      ],
      amenities: ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'gym', 'business_center', 'rooftop_bar', 'airport_shuttle'],
      checkInTime: '15:00',
      checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
    },
    rooms: [
      {
        type: 'Superior City View',
        capacity: 2,
        pricePerNight: 2500000,
        available: 20,
        amenities: ['king_bed', 'city_view', 'work_desk', 'minibar'],
        size: 35
      },
      {
        type: 'Executive Suite',
        capacity: 3,
        pricePerNight: 4500000,
        available: 12,
        amenities: ['king_bed', 'living_room', 'city_view', 'work_desk', 'coffee_machine'],
        size: 65
      },
      {
        type: 'Premium Family Room',
        capacity: 4,
        pricePerNight: 5500000,
        available: 8,
        amenities: ['king_bed', 'twin_beds', 'city_view', 'minibar', 'safe'],
        size: 55
      }
    ],
    contact: {
      phone: '+66-2-123-4567',
      email: 'reservations@bangkokgrand.com',
      website: 'https://bangkokgrand.com'
    }
  },
  {
    name: 'Phuket Boutique Beach Hotel',
    location: {
      country: 'Thailand',
      city: 'Phuket',
      address: '88 Kata Beach Road, Karon, Phuket 83100',
      coordinates: [98.2943, 7.8138]
    },
    details: {
      description: 'Charming boutique hotel with direct beach access, Thai traditional design, and personalized service. Ideal for romantic escapes.',
      rating: 4.6,
      images: [
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
        'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800'
      ],
      amenities: ['wifi', 'pool', 'restaurant', 'bar', 'beach_access', 'spa', 'bicycle_rental', 'yoga_classes'],
      checkInTime: '14:00',
      checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 72 hours before check-in'
    },
    rooms: [
      {
        type: 'Garden View Room',
        capacity: 2,
        pricePerNight: 2200000,
        available: 10,
        amenities: ['queen_bed', 'garden_view', 'balcony', 'minibar'],
        size: 30
      },
      {
        type: 'Beach Front Bungalow',
        capacity: 2,
        pricePerNight: 4200000,
        available: 6,
        amenities: ['king_bed', 'beach_access', 'private_terrace', 'outdoor_shower'],
        size: 50
      },
      {
        type: 'Honeymoon Pool Villa',
        capacity: 2,
        pricePerNight: 6800000,
        available: 3,
        amenities: ['king_bed', 'private_pool', 'beach_view', 'jacuzzi', 'butler_service'],
        size: 75
      }
    ],
    contact: {
      phone: '+66-76-398-200',
      email: 'hello@phuketboutique.com',
      website: 'https://phuketboutique.com'
    }
  }
];

async function addThailandHotels() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check existing Thailand hotels
    const existingHotels = await Hotel.find({ 'location.country': 'Thailand' });
    console.log(`📊 Found ${existingHotels.length} existing hotels in Thailand\n`);

    // Insert new hotels
    console.log('➕ Adding new Thailand hotels...\n');
    
    for (const hotelData of thailandHotels) {
      // Check if hotel already exists
      const exists = await Hotel.findOne({ name: hotelData.name });
      
      if (exists) {
        console.log(`⚠️  Hotel "${hotelData.name}" already exists, skipping...`);
        continue;
      }

      const hotel = new Hotel(hotelData);
      await hotel.save();
      console.log(`✅ Added: ${hotel.name} (${hotel.location.city})`);
      console.log(`   ID: ${hotel._id}`);
      console.log(`   Rooms: ${hotel.rooms.length} types`);
      console.log(`   Rating: ${hotel.details.rating}⭐\n`);
    }

    // Show updated count
    const updatedHotels = await Hotel.find({ 'location.country': 'Thailand' });
    console.log(`\n🎉 Total Thailand hotels now: ${updatedHotels.length}`);

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

addThailandHotels();
