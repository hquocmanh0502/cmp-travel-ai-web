// Create a completed booking for testing Write Review functionality
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function createCompletedBooking() {
    try {
        const MONGODB_URI = 'mongodb+srv://hoangquocmanh2004_db_user:NuB0wKG7gc3QiGn0@cluster0.gs9owka.mongodb.net/traveldb?retryWrites=true&w=majority';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get tour (Toronto - the one we added reviews to)
        const tour = await Tour.findOne({ name: 'Toronto' });
        if (!tour) {
            console.log('❌ Toronto tour not found');
            return;
        }
        console.log('🎯 Tour:', tour.name, '(ID:', tour._id, ')');

        // Get user
        const user = await User.findOne({ username: 'demo' });
        if (!user) {
            console.log('❌ Demo user not found');
            return;
        }
        console.log('👤 User:', user.username, '(ID:', user._id, ')');

        // Check if completed booking already exists
        const existing = await Booking.findOne({
            userId: user._id,
            tourId: tour._id,
            status: 'completed'
        });

        if (existing) {
            console.log('⚠️ Completed booking already exists for this user and tour');
            console.log('Booking ID:', existing._id);
            console.log('Has Reviewed:', existing.hasReviewed);
            return;
        }

        // Create completed booking
        const booking = await Booking.create({
            userId: user._id,
            tourId: tour._id,
            tourName: tour.name,
            
            // Required dates
            checkinDate: new Date('2024-10-01'),
            checkoutDate: new Date('2024-10-10'),
            departureDate: new Date('2024-10-01'),
            bookingDate: new Date('2024-09-15'),
            
            // Required guest info
            adults: 2,
            children: 0,
            infants: 0,
            
            // Required rooms
            rooms: {
                superior: 1,
                juniorDeluxe: 0,
                deluxe: 0,
                suite: 0
            },
            
            // Required pricing
            tourBaseCost: tour.prices?.adult || 1000,
            totalAmount: (tour.prices?.adult * 2) || 2000,
            
            // User info
            customerInfo: {
                fullName: user.fullName || user.username,
                email: user.email,
                phone: '+84123456789',
                address: 'Ho Chi Minh City, Vietnam'
            },
            
            // Payment info
            payment: {
                method: 'creditCard',
                status: 'completed',
                transactionId: 'TEST_' + Date.now()
            },
            
            // Status
            status: 'completed',
            hasReviewed: false,
            
            // Special requests
            specialRequests: 'Test booking for review functionality',
            
            // Dates
            lastModifiedDate: new Date('2024-10-10')
        });

        console.log('✅ Created completed booking:', booking._id);
        console.log('\n📊 Summary:');
        console.log(`User: ${user.username}`);
        console.log(`Tour: ${tour.name}`);
        console.log(`Booking ID: ${booking._id}`);
        console.log(`Status: ${booking.status}`);
        console.log(`Has Reviewed: ${booking.hasReviewed}`);
        console.log(`\n🎯 Test URL: http://localhost:5500/frontend/my-bookings.html`);
        console.log('👉 Login as "demo" user to see the "Write Review" button');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createCompletedBooking();
