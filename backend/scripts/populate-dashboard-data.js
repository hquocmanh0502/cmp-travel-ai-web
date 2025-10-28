// Script to populate dashboard with sample data
// Run: node backend/scripts/populate-dashboard-data.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Tour = require('../models/Tour');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Feedback = require('../models/Feedback');
const Hotel = require('../models/Hotel');

const sampleTours = [
  {
    name: "Paris City of Lights",
    country: "France",
    city: "Paris",
    description: "Discover the romantic city of Paris with visits to Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral.",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",
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

async function createTours() {
  console.log('\n📍 Creating tours...');
  
  // Delete existing tours to avoid duplicates
  await Tour.deleteMany({});
  
  const tours = await Tour.insertMany(sampleTours);
  console.log(`✅ Created ${tours.length} tours`);
  return tours;
}

async function createUsers() {
  console.log('\n👥 Creating users...');
  
  // Delete existing users to avoid duplicates
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
  
  // Create bookings for last 6 months
  for (let month = 0; month < 6; month++) {
    const bookingsInMonth = 15 + Math.floor(Math.random() * 20); // 15-35 bookings per month
    
    for (let i = 0; i < bookingsInMonth; i++) {
      const tour = tours[Math.floor(Math.random() * tours.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Random date in the month
      const bookingDate = new Date(now);
      bookingDate.setMonth(now.getMonth() - month);
      bookingDate.setDate(Math.floor(Math.random() * 28) + 1);
      
      // Departure date is 2 weeks after booking
      const departureDate = new Date(bookingDate);
      departureDate.setDate(departureDate.getDate() + 14);
      
      // Check-in same as departure
      const checkinDate = new Date(departureDate);
      
      // Extract duration (e.g., "5 days 4 nights" -> 5 days)
      const durationMatch = tour.duration.match(/(\d+)\s*days?/i);
      const durationDays = durationMatch ? parseInt(durationMatch[1]) : 5;
      
      // Check-out is duration days after check-in
      const checkoutDate = new Date(checkinDate);
      checkoutDate.setDate(checkoutDate.getDate() + durationDays);
      
      const adults = Math.floor(Math.random() * 3) + 1; // 1-3 adults
      const children = Math.floor(Math.random() * 2); // 0-1 children
      
      const tourBaseCost = (adults * tour.pricing.adult) + (children * (tour.pricing.child || 0));
      const servicesCost = Math.floor(Math.random() * 200); // Random services 0-200
      const totalAmount = tourBaseCost + servicesCost;
      
      const statuses = ['completed', 'completed', 'completed', 'confirmed', 'pending'];
      const bookingStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Payment status: paid for completed, partial/unpaid for others
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
  
  // Show revenue by month
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
  
  // Create reviews for 60% of completed bookings
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
    const rating = Math.random() > 0.2 ? (Math.floor(Math.random() * 2) + 4) : 3; // Most 4-5 stars
    
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
      createdAt: new Date(booking.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days after booking
    });
  }
  
  const createdReviews = await Feedback.insertMany(reviews);
  console.log(`✅ Created ${createdReviews.length} reviews`);
  
  // Update tour ratings
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
  console.log('🚀 Starting to populate dashboard data...\n');
  
  await connectDB();
  
  const tours = await createTours();
  const users = await createUsers();
  const bookings = await createBookings(tours, users);
  const reviews = await createReviews(tours, users, bookings);
  
  // Calculate statistics
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'completed')
    .reduce((sum, b) => sum + b.totalPrice, 0);
  
  console.log('\n📊 Final Statistics:');
  console.log(`   Total Tours: ${tours.length}`);
  console.log(`   Total Users: ${users.length}`);
  console.log(`   Total Bookings: ${bookings.length}`);
  console.log(`   Total Reviews: ${reviews.length}`);
  console.log(`   Total Revenue: $${totalRevenue.toLocaleString()}`);
  
  console.log('\n✅ Dashboard data population completed!');
  console.log('🎉 Your dashboard should now look beautiful with real data!\n');
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
