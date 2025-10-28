/**
 * Migration Script: Add missing fields to existing users
 * Adds: dateOfBirth, gender, address to all existing users
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

async function migrateUserFields() {
    try {
        console.log('🔄 Starting user fields migration...');
        
        // Connect to database
        await connectDB();
        console.log('');  // Add blank line
        
        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to migrate`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const user of users) {
            let needsUpdate = false;
            const updates = {};
            
            // Add dateOfBirth if missing
            if (!user.dateOfBirth) {
                // Set a default date (optional - you can leave it null)
                updates.dateOfBirth = null;
                needsUpdate = true;
            }
            
            // Add gender if missing
            if (!user.gender) {
                updates.gender = 'male'; // Default to male
                needsUpdate = true;
            }
            
            // Add address if missing
            if (!user.address) {
                updates.address = '';
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await User.findByIdAndUpdate(user._id, updates);
                console.log(`✅ Updated user: ${user.username} (${user.email})`);
                console.log(`   - Added fields: ${Object.keys(updates).join(', ')}`);
                updatedCount++;
            } else {
                console.log(`⏭️  Skipped user: ${user.username} (already has all fields)`);
                skippedCount++;
            }
        }
        
        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Updated: ${updatedCount} users`);
        console.log(`   ⏭️  Skipped: ${skippedCount} users`);
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
}

// Run migration
migrateUserFields();
