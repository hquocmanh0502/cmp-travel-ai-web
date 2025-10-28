/**
 * Reset User Password
 * Force reset a user's password (for admin/testing)
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

async function resetPassword() {
    try {
        console.log('🔄 Resetting user password...\n');
        
        // Connect to database
        await connectDB();
        
        // Get userId and new password from command line
        const userId = process.argv[2];
        const newPassword = process.argv[3];
        
        if (!userId || !newPassword) {
            console.log('❌ Usage: node reset-user-password.js <userId> <newPassword>');
            console.log('   Example: node reset-user-password.js 68e286d4983181b367b26535 newpass123\n');
            process.exit(1);
        }
        
        console.log(`👤 User ID: ${userId}`);
        console.log(`🔑 New Password: ${newPassword}\n`);
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('❌ Invalid user ID format');
            process.exit(1);
        }
        
        // Validate password length
        if (newPassword.length < 6) {
            console.log('❌ Password must be at least 6 characters');
            process.exit(1);
        }
        
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('❌ User not found');
            process.exit(1);
        }
        
        console.log('📊 User Info:');
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Full Name: ${user.fullName}\n`);
        
        // Hash new password
        console.log('🔐 Hashing new password...');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Update password directly (bypass pre-save hook)
        console.log('💾 Updating database...');
        await User.findByIdAndUpdate(userId, {
            password: hashedPassword,
            updatedAt: new Date()
        });
        
        console.log('\n✅ Password reset successfully! ✅\n');
        console.log('💡 New login credentials:');
        console.log(`   Email/Username: ${user.email} or ${user.username}`);
        console.log(`   Password: ${newPassword}\n`);
        console.log('🔍 Verify the new password:');
        console.log(`   node backend/check-password.js ${userId} ${newPassword}`);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

console.log('═══════════════════════════════════════════');
console.log('   PASSWORD RESET TOOL');
console.log('═══════════════════════════════════════════\n');
console.log('⚠️  WARNING: This will overwrite the user\'s password!\n');

resetPassword();
