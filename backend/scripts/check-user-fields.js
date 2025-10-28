/**
 * Check User Fields Script
 * Check which fields are missing in existing users
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

async function checkUserFields() {
    try {
        console.log('🔍 Checking user fields...\n');
        
        // Connect to database
        await connectDB();
        console.log('');  // Add blank line after connection
        
        // Get all users
        const users = await User.find({}).select('-password');
        console.log(`📊 Total users: ${users.length}\n`);
        
        if (users.length === 0) {
            console.log('⚠️  No users found in database');
            process.exit(0);
        }
        
        // Check each user
        users.forEach((user, index) => {
            console.log(`\n👤 User ${index + 1}: ${user.username}`);
            console.log('─'.repeat(50));
            console.log(`   Email:       ${user.email}`);
            console.log(`   Full Name:   ${user.fullName}`);
            console.log(`   Phone:       ${user.phone || '❌ Not set'}`);
            console.log(`   Birthday:    ${user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : '❌ Not set'}`);
            console.log(`   Gender:      ${user.gender || '❌ Not set'}`);
            console.log(`   Address:     ${user.address !== undefined && user.address !== null ? (user.address === '' ? '⚠️  Empty string' : user.address) : '❌ Not set'}`);
            console.log(`   Avatar:      ${user.avatar ? '✅ Set' : '❌ Not set'}`);
            console.log(`   Created:     ${new Date(user.createdAt).toLocaleDateString()}`);
            
            // Show raw field existence
            console.log(`   Raw Check:   dateOfBirth=${user.dateOfBirth}, address="${user.address}", gender=${user.gender}`);
            
            // Check missing fields
            const missingFields = [];
            if (!user.phone) missingFields.push('phone');
            if (!user.dateOfBirth) missingFields.push('dateOfBirth');
            if (!user.gender) missingFields.push('gender');
            if (!user.address) missingFields.push('address');
            if (!user.avatar) missingFields.push('avatar');
            
            if (missingFields.length > 0) {
                console.log(`   ⚠️  Missing:   ${missingFields.join(', ')}`);
            } else {
                console.log(`   ✅ Status:    All fields complete`);
            }
        });
        
        // Summary
        console.log('\n\n📊 Summary:');
        console.log('─'.repeat(50));
        
        const stats = {
            hasPhone: users.filter(u => u.phone).length,
            hasBirthday: users.filter(u => u.dateOfBirth).length,
            hasGender: users.filter(u => u.gender).length,
            hasAddress: users.filter(u => u.address).length,
            hasAvatar: users.filter(u => u.avatar).length
        };
        
        console.log(`   Phone:       ${stats.hasPhone}/${users.length} users`);
        console.log(`   Birthday:    ${stats.hasBirthday}/${users.length} users`);
        console.log(`   Gender:      ${stats.hasGender}/${users.length} users`);
        console.log(`   Address:     ${stats.hasAddress}/${users.length} users`);
        console.log(`   Avatar:      ${stats.hasAvatar}/${users.length} users`);
        
        console.log('\n💡 To add missing fields, run:');
        console.log('   node scripts/migrate-user-fields.js');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

// Run check
checkUserFields();
