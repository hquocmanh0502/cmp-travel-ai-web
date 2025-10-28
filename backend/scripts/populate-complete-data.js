// Complete data population script with galleries and hotels
// Run: node backend/scripts/populate-complete-data.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const Hotel = require('../models/Hotel');

const sampleToursWithGallery = [
  {
    name: "Paris City of Lights",
    country: "France",
    city: "Paris",
    description: "Discover the romantic city of Paris with visits to Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral.",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800", category: "attractions", caption: "Eiffel Tower at night" },
      { url: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800", category: "attractions", caption: "Louvre Museum" },
      { url: "https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800", category: "attractions", caption: "Arc de Triomphe" },
      { url: "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800", category: "landscape", caption: "Seine River view" },
      { url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800", category: "food", caption: "French cuisine" }
    ],
    rating: 4.8,
    estimatedCost: 2500,
    duration: "5 days 4 nights",
    type: "international",
    attractions: ["Eiffel Tower", "Louvre Museum", "Notre-Dame", "Arc de Triomphe"],
    food: ["French Cuisine", "Croissants", "Wine Tasting"],
    pricing: { adult: 2500, child: 1800, infant: 500 },
    maxGroupSize: 20,
    inclusions: ["Hotel", "Breakfast", "Guided Tours", "Airport Transfer"],
    exclusions: ["Lunch", "Dinner", "Personal Expenses"]
  },
  {
    name: "Tokyo Adventure",
    country: "Japan",
    city: "Tokyo",
    description: "Experience the vibrant culture of Tokyo with visits to temples, modern districts, and traditional gardens.",
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800", category: "attractions", caption: "Tokyo Tower" },
      { url: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800", category: "attractions", caption: "Senso-ji Temple" },
      { url: "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800", category: "attractions", caption: "Shibuya Crossing" },
      { url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800", category: "landscape", caption: "Mount Fuji view" },
      { url: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800", category: "food", caption: "Japanese cuisine" }
    ],
    rating: 4.9,
    estimatedCost: 3200,
    duration: "7 days 6 nights",
    type: "international",
    attractions: ["Senso-ji Temple", "Tokyo Tower", "Shibuya Crossing", "Mount Fuji"],
    food: ["Sushi", "Ramen", "Tempura"],
    pricing: { adult: 3200, child: 2400, infant: 600 },
    maxGroupSize: 15,
    inclusions: ["Hotel", "Breakfast", "JR Pass", "Airport Transfer"],
    exclusions: ["Lunch", "Dinner", "Personal Expenses"]
  },
  {
    name: "Bali Tropical Paradise",
    country: "Indonesia",
    city: "Bali",
    description: "Relax in the beautiful beaches and temples of Bali, with spa treatments and cultural experiences.",
    img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800", category: "attractions", caption: "Tanah Lot Temple" },
      { url: "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800", category: "accommodation", caption: "Beach resort" },
      { url: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800", category: "landscape", caption: "Rice terraces" },
      { url: "https://images.unsplash.com/photo-1573790387438-4da905039392?w=800", category: "activities", caption: "Beach activities" },
      { url: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800", category: "food", caption: "Balinese cuisine" }
    ],
    rating: 4.7,
    estimatedCost: 1800,
    duration: "6 days 5 nights",
    type: "international",
    attractions: ["Tanah Lot Temple", "Ubud Monkey Forest", "Tegalalang Rice Terrace"],
    food: ["Balinese Cuisine", "Fresh Seafood"],
    pricing: { adult: 1800, child: 1200, infant: 400 },
    maxGroupSize: 25,
    inclusions: ["Hotel", "Breakfast", "Spa Session", "Airport Transfer"],
    exclusions: ["Lunch", "Dinner", "Personal Expenses"]
  },
  {
    name: "Dubai Luxury Experience",
    country: "UAE",
    city: "Dubai",
    description: "Experience luxury in Dubai with visits to Burj Khalifa, desert safari, and shopping malls.",
    img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800", category: "attractions", caption: "Burj Khalifa" },
      { url: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800", category: "attractions", caption: "Dubai Marina" },
      { url: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800", category: "attractions", caption: "Palm Jumeirah" },
      { url: "https://images.unsplash.com/photo-1546412414-e1885259563a?w=800", category: "activities", caption: "Desert safari" },
      { url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800", category: "accommodation", caption: "Luxury hotel" }
    ],
    rating: 4.9,
    estimatedCost: 4500,
    duration: "4 days 3 nights",
    type: "international",
    attractions: ["Burj Khalifa", "Palm Jumeirah", "Dubai Mall", "Desert Safari"],
    food: ["Arabic Cuisine", "International Buffet"],
    pricing: { adult: 4500, child: 3200, infant: 800 },
    maxGroupSize: 12,
    inclusions: ["5-Star Hotel", "Breakfast", "Desert Safari", "Airport Transfer"],
    exclusions: ["Lunch", "Dinner", "Personal Expenses"]
  },
  {
    name: "Ha Long Bay Cruise",
    country: "Vietnam",
    city: "Ha Long",
    description: "Explore the stunning limestone karsts and emerald waters of Ha Long Bay on a luxury cruise.",
    img: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800", category: "landscape", caption: "Ha Long Bay karsts" },
      { url: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800", category: "attractions", caption: "Sung Sot Cave" },
      { url: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800", category: "activities", caption: "Kayaking" },
      { url: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800", category: "accommodation", caption: "Luxury cruise" },
      { url: "https://images.unsplash.com/photo-1528184039930-bd03972bd974?w=800", category: "food", caption: "Vietnamese seafood" }
    ],
    rating: 4.6,
    estimatedCost: 800,
    duration: "3 days 2 nights",
    type: "domestic",
    attractions: ["Ha Long Bay", "Sung Sot Cave", "Titop Island"],
    food: ["Vietnamese Seafood", "Fresh Spring Rolls"],
    pricing: { adult: 800, child: 500, infant: 200 },
    maxGroupSize: 30,
    inclusions: ["Cruise", "All Meals", "Kayaking", "Transfer from Hanoi"],
    exclusions: ["Personal Expenses", "Drinks"]
  },
  {
    name: "Da Nang Beach Getaway",
    country: "Vietnam",
    city: "Da Nang",
    description: "Relax on beautiful beaches and visit the Marble Mountains and Ba Na Hills.",
    img: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800", category: "landscape", caption: "My Khe Beach" },
      { url: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800", category: "attractions", caption: "Marble Mountains" },
      { url: "https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=800", category: "attractions", caption: "Ba Na Hills" },
      { url: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800", category: "attractions", caption: "Dragon Bridge" },
      { url: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800", category: "food", caption: "Central Vietnam dishes" }
    ],
    rating: 4.5,
    estimatedCost: 650,
    duration: "4 days 3 nights",
    type: "domestic",
    attractions: ["My Khe Beach", "Marble Mountains", "Ba Na Hills", "Dragon Bridge"],
    food: ["Central Vietnam Cuisine", "Seafood"],
    pricing: { adult: 650, child: 400, infant: 150 },
    maxGroupSize: 25,
    inclusions: ["Hotel", "Breakfast", "Ba Na Hills Ticket", "Airport Transfer"],
    exclusions: ["Lunch", "Dinner", "Personal Expenses"]
  },
  {
    name: "Phu Quoc Island Paradise",
    country: "Vietnam",
    city: "Phu Quoc",
    description: "Discover the pristine beaches and coral reefs of Phu Quoc Island.",
    img: "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800", category: "landscape", caption: "Sao Beach" },
      { url: "https://images.unsplash.com/photo-1505881659130-6c0b1b4eeeaf?w=800", category: "activities", caption: "Snorkeling" },
      { url: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800", category: "landscape", caption: "Sunset beach" },
      { url: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800", category: "accommodation", caption: "Beach resort" },
      { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", category: "food", caption: "Fresh seafood" }
    ],
    rating: 4.7,
    estimatedCost: 900,
    duration: "5 days 4 nights",
    type: "domestic",
    attractions: ["Sao Beach", "Vinpearl Safari", "Night Market", "Snorkeling"],
    food: ["Fresh Seafood", "Phu Quoc Pepper Dishes"],
    pricing: { adult: 900, child: 600, infant: 200 },
    maxGroupSize: 20,
    inclusions: ["Resort", "Breakfast", "Snorkeling Tour", "Airport Transfer"],
    exclusions: ["Lunch", "Dinner", "Personal Expenses"]
  },
  {
    name: "New York City Explorer",
    country: "USA",
    city: "New York",
    description: "Experience the Big Apple with visits to iconic landmarks and Broadway shows.",
    img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800",
    gallery: [
      { url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800", category: "landscape", caption: "Manhattan skyline" },
      { url: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=800", category: "attractions", caption: "Times Square" },
      { url: "https://images.unsplash.com/photo-1516219707884-0ee8f2228a73?w=800", category: "attractions", caption: "Statue of Liberty" },
      { url: "https://images.unsplash.com/photo-1546832558-91d5855c0b6f?w=800", category: "landscape", caption: "Central Park" },
      { url: "https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=800", category: "food", caption: "New York pizza" }
    ],
    rating: 4.8,
    estimatedCost: 3800,
    duration: "6 days 5 nights",
    type: "international",
    attractions: ["Statue of Liberty", "Central Park", "Times Square", "Empire State Building"],
    food: ["American Cuisine", "New York Pizza", "Bagels"],
    pricing: { adult: 3800, child: 2800, infant: 700 },
    maxGroupSize: 15,
    inclusions: ["Hotel", "Breakfast", "Broadway Show", "Airport Transfer"],
    exclusions: ["Lunch", "Dinner", "Personal Expenses"]
  }
];

const sampleHotels = [
  // Paris Hotels
  {
    name: "Le Grand Paris Hotel",
    location: "Paris, France",
    address: "123 Champs-Élysées, 75008 Paris",
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    stars: 5,
    rating: 4.8,
    description: "Luxury 5-star hotel in the heart of Paris with stunning views of the Eiffel Tower.",
    amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Bar", "Gym", "Room Service"],
    roomTypes: [
      { type: "Superior Room", price: 250, capacity: 2 },
      { type: "Deluxe Room", price: 350, capacity: 3 },
      { type: "Suite", price: 550, capacity: 4 }
    ],
    reviews: 1250,
    available: true
  },
  {
    name: "Paris Boutique Inn",
    location: "Paris, France",
    address: "45 Rue de Rivoli, 75001 Paris",
    img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
    stars: 4,
    rating: 4.5,
    description: "Charming boutique hotel near the Louvre Museum with classic French decor.",
    amenities: ["WiFi", "Breakfast", "Restaurant", "Bar", "Concierge"],
    roomTypes: [
      { type: "Standard Room", price: 180, capacity: 2 },
      { type: "Deluxe Room", price: 280, capacity: 3 }
    ],
    reviews: 850,
    available: true
  },
  // Tokyo Hotels
  {
    name: "Tokyo Grand Imperial",
    location: "Tokyo, Japan",
    address: "1-1-1 Marunouchi, Chiyoda-ku, Tokyo",
    img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
    stars: 5,
    rating: 4.9,
    description: "Iconic luxury hotel blending traditional Japanese hospitality with modern elegance.",
    amenities: ["WiFi", "Pool", "Spa", "Multiple Restaurants", "Bar", "Gym", "Tea Room"],
    roomTypes: [
      { type: "Superior Room", price: 320, capacity: 2 },
      { type: "Deluxe Room", price: 450, capacity: 3 },
      { type: "Suite", price: 750, capacity: 4 }
    ],
    reviews: 2100,
    available: true
  },
  {
    name: "Shibuya Business Hotel",
    location: "Tokyo, Japan",
    address: "2-24-1 Shibuya, Shibuya-ku, Tokyo",
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    stars: 3,
    rating: 4.3,
    description: "Modern hotel in vibrant Shibuya district, perfect for exploring Tokyo.",
    amenities: ["WiFi", "Breakfast", "Restaurant", "Vending Machines"],
    roomTypes: [
      { type: "Standard Room", price: 150, capacity: 2 },
      { type: "Twin Room", price: 200, capacity: 2 }
    ],
    reviews: 650,
    available: true
  },
  // Bali Hotels
  {
    name: "Bali Luxury Resort & Spa",
    location: "Bali, Indonesia",
    address: "Jalan Kayu Aya, Seminyak, Bali",
    img: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
    stars: 5,
    rating: 4.8,
    description: "Beachfront luxury resort with private villas and world-class spa.",
    amenities: ["WiFi", "Beach Access", "3 Pools", "Spa", "Multiple Restaurants", "Bar", "Yoga Classes"],
    roomTypes: [
      { type: "Deluxe Room", price: 200, capacity: 2 },
      { type: "Pool Villa", price: 400, capacity: 4 },
      { type: "Beach Villa", price: 600, capacity: 4 }
    ],
    reviews: 1800,
    available: true
  },
  {
    name: "Ubud Garden Resort",
    location: "Bali, Indonesia",
    address: "Jalan Raya Ubud, Ubud, Bali",
    img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
    stars: 4,
    rating: 4.6,
    description: "Peaceful resort surrounded by rice paddies and tropical gardens.",
    amenities: ["WiFi", "Pool", "Restaurant", "Spa", "Yoga", "Free Bike Rental"],
    roomTypes: [
      { type: "Garden View Room", price: 120, capacity: 2 },
      { type: "Family Villa", price: 280, capacity: 4 }
    ],
    reviews: 920,
    available: true
  },
  // Dubai Hotels
  {
    name: "Burj Al Arab Jumeirah",
    location: "Dubai, UAE",
    address: "Jumeirah Beach Road, Dubai",
    img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
    stars: 5,
    rating: 4.9,
    description: "World's most luxurious hotel on a private island with stunning architecture.",
    amenities: ["WiFi", "Private Beach", "Pool", "Multiple Restaurants", "Spa", "Butler Service", "Helipad"],
    roomTypes: [
      { type: "Deluxe Suite", price: 1000, capacity: 2 },
      { type: "Premium Suite", price: 1500, capacity: 3 },
      { type: "Royal Suite", price: 3000, capacity: 4 }
    ],
    reviews: 3200,
    available: true
  },
  {
    name: "Dubai Marina Hotel",
    location: "Dubai, UAE",
    address: "Dubai Marina, Dubai",
    img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
    stars: 4,
    rating: 4.5,
    description: "Modern hotel with marina views and close to shopping malls.",
    amenities: ["WiFi", "Pool", "Restaurant", "Gym", "Spa"],
    roomTypes: [
      { type: "Standard Room", price: 250, capacity: 2 },
      { type: "Marina View Room", price: 350, capacity: 3 }
    ],
    reviews: 1100,
    available: true
  },
  // Ha Long Hotels
  {
    name: "Ha Long Bay Cruise Hotel",
    location: "Ha Long, Vietnam",
    address: "Bai Chay, Ha Long City, Quang Ninh",
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    stars: 4,
    rating: 4.6,
    description: "Waterfront hotel with bay views and cruise packages.",
    amenities: ["WiFi", "Restaurant", "Bar", "Cruise Booking", "Travel Desk"],
    roomTypes: [
      { type: "Standard Room", price: 80, capacity: 2 },
      { type: "Sea View Room", price: 120, capacity: 3 }
    ],
    reviews: 680,
    available: true
  },
  // Da Nang Hotels
  {
    name: "Da Nang Beach Resort",
    location: "Da Nang, Vietnam",
    address: "My Khe Beach, Da Nang",
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    stars: 5,
    rating: 4.7,
    description: "Beachfront resort with stunning ocean views and modern facilities.",
    amenities: ["WiFi", "Beach Access", "Pool", "Spa", "Restaurant", "Bar", "Gym"],
    roomTypes: [
      { type: "Deluxe Room", price: 120, capacity: 2 },
      { type: "Ocean View Room", price: 180, capacity: 3 },
      { type: "Family Suite", price: 280, capacity: 4 }
    ],
    reviews: 1450,
    available: true
  },
  {
    name: "Da Nang City Hotel",
    location: "Da Nang, Vietnam",
    address: "Bach Dang Street, Da Nang",
    img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
    stars: 3,
    rating: 4.3,
    description: "Affordable city hotel near the Han River and Dragon Bridge.",
    amenities: ["WiFi", "Breakfast", "Restaurant", "Tour Desk"],
    roomTypes: [
      { type: "Standard Room", price: 50, capacity: 2 },
      { type: "Deluxe Room", price: 75, capacity: 3 }
    ],
    reviews: 520,
    available: true
  },
  // Phu Quoc Hotels
  {
    name: "Phu Quoc Pearl Resort",
    location: "Phu Quoc, Vietnam",
    address: "Sao Beach, Phu Quoc Island",
    img: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
    stars: 5,
    rating: 4.8,
    description: "Luxury beachfront resort on the famous Sao Beach.",
    amenities: ["WiFi", "Private Beach", "Pool", "Spa", "Restaurant", "Bar", "Water Sports"],
    roomTypes: [
      { type: "Deluxe Room", price: 150, capacity: 2 },
      { type: "Beach Villa", price: 300, capacity: 4 },
      { type: "Pool Villa", price: 450, capacity: 4 }
    ],
    reviews: 1650,
    available: true
  },
  {
    name: "Phu Quoc Island Hotel",
    location: "Phu Quoc, Vietnam",
    address: "Duong Dong Town, Phu Quoc",
    img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
    stars: 4,
    rating: 4.5,
    description: "Comfortable hotel near night market and town center.",
    amenities: ["WiFi", "Pool", "Restaurant", "Motorbike Rental", "Tour Booking"],
    roomTypes: [
      { type: "Standard Room", price: 70, capacity: 2 },
      { type: "Family Room", price: 120, capacity: 4 }
    ],
    reviews: 780,
    available: true
  },
  // New York Hotels
  {
    name: "The Plaza Hotel New York",
    location: "New York, USA",
    address: "Fifth Avenue, New York, NY",
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    stars: 5,
    rating: 4.8,
    description: "Historic luxury hotel overlooking Central Park.",
    amenities: ["WiFi", "Restaurant", "Bar", "Spa", "Gym", "Concierge", "Room Service"],
    roomTypes: [
      { type: "Deluxe Room", price: 500, capacity: 2 },
      { type: "Park View Suite", price: 850, capacity: 3 },
      { type: "Royal Suite", price: 1500, capacity: 4 }
    ],
    reviews: 2800,
    available: true
  },
  {
    name: "Times Square Hotel",
    location: "New York, USA",
    address: "Broadway, New York, NY",
    img: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
    stars: 4,
    rating: 4.4,
    description: "Modern hotel in the heart of Times Square, perfect for Broadway shows.",
    amenities: ["WiFi", "Restaurant", "Bar", "Fitness Center"],
    roomTypes: [
      { type: "Standard Room", price: 280, capacity: 2 },
      { type: "City View Room", price: 380, capacity: 3 }
    ],
    reviews: 1540,
    available: true
  }
];

async function createTours() {
  console.log('\n📍 Creating tours with gallery images...');
  await Tour.deleteMany({});
  const tours = await Tour.insertMany(sampleToursWithGallery);
  console.log(`✅ Created ${tours.length} tours with galleries`);
  return tours;
}

async function createHotels() {
  console.log('\n🏨 Creating hotels...');
  await Hotel.deleteMany({});
  const hotels = await Hotel.insertMany(sampleHotels);
  console.log(`✅ Created ${hotels.length} hotels across all destinations`);
  return hotels;
}

async function createUsers() {
  console.log('\n👥 Creating users...');
  await User.deleteMany({});
  
  const sampleUsers = [
    { fullName: 'John Smith', email: 'john@example.com', username: 'john_smith', password: 'password123', verified: true },
    { fullName: 'Emma Wilson', email: 'emma@example.com', username: 'emma_wilson', password: 'password123', verified: true },
    { fullName: 'Michael Brown', email: 'michael@example.com', username: 'michael_brown', password: 'password123', verified: true },
    { fullName: 'Sarah Davis', email: 'sarah@example.com', username: 'sarah_davis', password: 'password123', verified: true },
    { fullName: 'David Lee', email: 'david@example.com', username: 'david_lee', password: 'password123', verified: true },
    { fullName: 'Lisa Anderson', email: 'lisa@example.com', username: 'lisa_anderson', password: 'password123', verified: true },
    { fullName: 'James Martinez', email: 'james@example.com', username: 'james_m', password: 'password123', verified: true },
    { fullName: 'Jennifer Taylor', email: 'jennifer@example.com', username: 'jennifer_t', password: 'password123', verified: true },
    { fullName: 'Robert Garcia', email: 'robert@example.com', username: 'robert_g', password: 'password123', verified: true },
    { fullName: 'Maria Rodriguez', email: 'maria@example.com', username: 'maria_r', password: 'password123', verified: true }
  ];
  
  const users = await User.insertMany(sampleUsers);
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function createBookings(tours, users) {
  console.log('\n📅 Creating bookings...');
  await Booking.deleteMany({});
  
  const bookings = [];
  const now = new Date();
  
  for (let month = 0; month < 6; month++) {
    const bookingsInMonth = 15 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < bookingsInMonth; i++) {
      const tour = tours[Math.floor(Math.random() * tours.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      const bookingDate = new Date(now);
      bookingDate.setMonth(now.getMonth() - month);
      bookingDate.setDate(Math.floor(Math.random() * 28) + 1);
      
      const departureDate = new Date(bookingDate);
      departureDate.setDate(departureDate.getDate() + 14);
      
      const checkinDate = new Date(departureDate);
      const durationMatch = tour.duration.match(/(\d+)\s*days?/i);
      const durationDays = durationMatch ? parseInt(durationMatch[1]) : 5;
      
      const checkoutDate = new Date(checkinDate);
      checkoutDate.setDate(checkoutDate.getDate() + durationDays);
      
      const adults = Math.floor(Math.random() * 3) + 1;
      const children = Math.floor(Math.random() * 2);
      
      const tourBaseCost = (adults * tour.pricing.adult) + (children * (tour.pricing.child || 0));
      const servicesCost = Math.floor(Math.random() * 200);
      const totalAmount = tourBaseCost + servicesCost;
      
      const statuses = ['completed', 'completed', 'completed', 'confirmed', 'pending'];
      const bookingStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      const paymentStatusMap = {
        'completed': 'paid',
        'confirmed': Math.random() > 0.5 ? 'paid' : 'partial',
        'pending': 'unpaid'
      };
      const paymentStatus = paymentStatusMap[bookingStatus];
      
      bookings.push({
        userId: user._id,
        tourId: tour._id,
        tourName: tour.name,
        checkinDate: checkinDate,
        checkoutDate: checkoutDate,
        departureDate: departureDate,
        bookingDate: bookingDate,
        adults: adults,
        children: children,
        customerInfo: {
          fullName: user.fullName,
          email: user.email,
          phone: '+84' + Math.floor(Math.random() * 900000000 + 100000000),
          specialRequests: ''
        },
        tourBaseCost: tourBaseCost,
        servicesCost: servicesCost,
        totalAmount: totalAmount,
        status: bookingStatus,
        paymentStatus: paymentStatus,
        paymentMethod: 'bank_transfer',
        createdAt: bookingDate
      });
    }
  }
  
  const createdBookings = await Booking.insertMany(bookings);
  console.log(`✅ Created ${createdBookings.length} bookings`);
  
  const revenueByMonth = {};
  createdBookings.forEach(booking => {
    if (booking.paymentStatus === 'paid') {
      const month = `${booking.createdAt.getFullYear()}-${String(booking.createdAt.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[month] = (revenueByMonth[month] || 0) + booking.totalAmount;
    }
  });
  
  console.log('\n💰 Revenue by month:');
  Object.entries(revenueByMonth).sort().forEach(([month, revenue]) => {
    console.log(`   ${month}: $${revenue.toLocaleString()}`);
  });
  
  return createdBookings;
}

async function createReviews(tours, users, bookings) {
  console.log('\n⭐ Creating reviews...');
  await Feedback.deleteMany({});
  
  const reviews = [];
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const reviewCount = Math.floor(completedBookings.length * 0.6);
  
  const reviewComments = [
    "Amazing experience! The tour guide was very knowledgeable and friendly.",
    "Great value for money. Everything was well organized.",
    "Beautiful destinations and excellent service throughout the trip.",
    "Highly recommend! One of the best tours I've ever been on.",
    "Good tour but the schedule was a bit tight. Overall satisfied.",
    "Fantastic trip! The accommodations were top-notch.",
    "Wonderful experience exploring the culture and cuisine.",
    "Very professional team and great attention to detail.",
    "Exceeded my expectations in every way!",
    "Good experience, would definitely book again.",
  ];
  
  const reviewTitles = [
    "Unforgettable Experience",
    "Highly Recommended",
    "Great Tour",
    "Excellent Service",
    "Worth Every Penny",
    "Amazing Journey",
    "Perfect Vacation",
    "Well Organized",
    "Fantastic Trip",
    "Would Book Again"
  ];
  
  for (let i = 0; i < reviewCount; i++) {
    const booking = completedBookings[i];
    const rating = Math.random() > 0.2 ? (Math.floor(Math.random() * 2) + 4) : 3;
    
    reviews.push({
      userId: booking.userId,
      tourId: booking.tourId,
      type: 'tour_review',
      rating: rating,
      title: reviewTitles[Math.floor(Math.random() * reviewTitles.length)],
      content: reviewComments[Math.floor(Math.random() * reviewComments.length)],
      status: 'approved',
      isPublic: true,
      isVerified: true,
      createdAt: new Date(booking.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    });
  }
  
  const createdReviews = await Feedback.insertMany(reviews);
  console.log(`✅ Created ${createdReviews.length} reviews`);
  
  for (const tour of tours) {
    const tourReviews = createdReviews.filter(r => r.tourId.toString() === tour._id.toString());
    if (tourReviews.length > 0) {
      const avgRating = tourReviews.reduce((sum, r) => sum + r.rating, 0) / tourReviews.length;
      await Tour.findByIdAndUpdate(tour._id, { rating: Math.round(avgRating * 10) / 10 });
    }
  }
  
  return createdReviews;
}

async function main() {
  console.log('🚀 Starting complete data population...\n');
  
  await connectDB();
  
  const tours = await createTours();
  // const hotels = await createHotels(); // TODO: Fix hotel schema format later
  const users = await createUsers();
  const bookings = await createBookings(tours, users);
  const reviews = await createReviews(tours, users, bookings);
  
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.totalAmount, 0);
  
  console.log('\n📊 Final Statistics:');
  console.log(`   Total Tours: ${tours.length} (with gallery images)`);
  // console.log(`   Total Hotels: ${hotels.length} (across all destinations)`);
  console.log(`   Total Users: ${users.length}`);
  console.log(`   Total Bookings: ${bookings.length}`);
  console.log(`   Total Reviews: ${reviews.length}`);
  console.log(`   Total Revenue: $${totalRevenue.toLocaleString()}`);
  
  console.log('\n✅ Complete data population finished!');
  console.log('🎉 Your tours now have gallery images!\n');
  console.log('ℹ️  Hotels will be added in a future update.\n');
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
