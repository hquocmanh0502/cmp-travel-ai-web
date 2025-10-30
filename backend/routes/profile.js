const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const Hotel = require('../models/Hotel');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// =============================================
// GET USER PROFILE
// =============================================
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Get VIP information
        const { getVIPDiscount, getNextLevelProgress } = require('../services/vipService');
        const vipDiscount = getVIPDiscount(user.membershipLevel);
        const levelProgress = getNextLevelProgress(user.totalSpent || 0);

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                address: user.address,
                avatar: user.avatar,
                verified: user.verified,
                preferences: user.preferences,
                behavior: user.behavior,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                // VIP Membership Info
                vip: {
                    membershipLevel: user.membershipLevel || 'bronze',
                    totalSpent: user.totalSpent || 0,
                    totalBookings: user.totalBookings || 0,
                    vipSince: user.vipSince,
                    discount: vipDiscount,
                    levelProgress: levelProgress
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching profile',
            error: error.message
        });
    }
});

// =============================================
// UPDATE USER PROFILE
// =============================================
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { fullName, phone, dateOfBirth, address, email, avatar, gender } = req.body;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        // Validate email if changed
        if (email) {
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: userId } 
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email already in use' 
                });
            }
        }

        // Validate gender
        if (gender && !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid gender value' 
            });
        }

        // Prepare update data
        const updateData = {
            updatedAt: new Date()
        };

        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
        if (address) updateData.address = address;
        if (email) updateData.email = email;
        if (avatar) updateData.avatar = avatar;
        if (gender) updateData.gender = gender;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                phone: updatedUser.phone,
                dateOfBirth: updatedUser.dateOfBirth,
                address: updatedUser.address,
                gender: updatedUser.gender,
                avatar: updatedUser.avatar,
                updatedAt: updatedUser.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating profile',
            error: error.message
        });
    }
});

// =============================================
// CHANGE PASSWORD
// =============================================
router.put('/:userId/password', async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự' 
            });
        }

        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại.' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Update password
        user.password = hashedPassword;
        user.updatedAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công!'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error changing password' 
        });
    }
});

// =============================================
// GET USER BOOKINGS
// =============================================
router.get('/:userId/bookings', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, limit } = req.query;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        // Build query
        let query = { userId: userId };
        
        if (status) {
            query.status = status;
        }

        // Find bookings
        let bookingsQuery = Booking.find(query)
            .sort({ createdAt: -1 })
            .populate('hotelId', 'name location images rating')
            .populate('tourId', 'name country estimatedCost img');

        if (limit) {
            bookingsQuery = bookingsQuery.limit(parseInt(limit));
        }

        const bookings = await bookingsQuery;

        res.json({
            success: true,
            count: bookings.length,
            bookings: bookings
        });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching bookings',
            error: error.message
        });
    }
});

// =============================================
// GET USER STATISTICS
// =============================================
router.get('/:userId/stats', async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        // Get user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Get bookings count
        const totalBookings = await Booking.countDocuments({ userId: userId });
        const completedBookings = await Booking.countDocuments({ 
            userId: userId, 
            status: 'completed' 
        });
        const pendingBookings = await Booking.countDocuments({ 
            userId: userId, 
            status: 'pending' 
        });

        // Get wishlist count
        const wishlistCount = user.behavior?.wishlist?.length || 0;

        // Get total spent (completed bookings)
        const completedBookingsData = await Booking.find({ 
            userId: userId, 
            status: 'completed' 
        });
        
        const totalSpent = completedBookingsData.reduce((sum, booking) => {
            return sum + (booking.totalPrice || 0);
        }, 0);

        res.json({
            success: true,
            stats: {
                totalBookings,
                completedBookings,
                pendingBookings,
                wishlistCount,
                totalSpent,
                viewHistoryCount: user.behavior?.viewHistory?.length || 0,
                searchHistoryCount: user.behavior?.searchHistory?.length || 0,
                memberSince: user.createdAt
            }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching statistics' 
        });
    }
});

// =============================================
// UPDATE USER PREFERENCES
// =============================================
router.put('/:userId/preferences', async (req, res) => {
    try {
        const { userId } = req.params;
        const preferences = req.body;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                preferences: preferences,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            preferences: updatedUser.preferences
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating preferences',
            error: error.message
        });
    }
});

// =============================================
// DELETE USER ACCOUNT
// =============================================
router.delete('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { password } = req.body;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        if (!password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password is required to delete account' 
            });
        }

        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Password is incorrect' 
            });
        }

        // Delete user's bookings (optional - or mark as deleted)
        // await Booking.deleteMany({ userId: userId });

        // Delete user
        await User.findByIdAndDelete(userId);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting account',
            error: error.message
        });
    }
});

// =============================================
// WISHLIST MANAGEMENT
// =============================================

// Get user wishlist
router.get('/:userId/wishlist', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        const user = await User.findById(userId).select('behavior.wishlist');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Populate wishlist with tour details
        const wishlistIds = user.behavior?.wishlist?.map(item => item.tourId) || [];
        const tours = await Tour.find({ _id: { $in: wishlistIds } });

        res.json({
            success: true,
            count: tours.length,
            wishlist: tours
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching wishlist',
            error: error.message
        });
    }
});

// Add to wishlist
router.post('/:userId/wishlist', async (req, res) => {
    try {
        const { userId } = req.params;
        const { tourId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        if (!tourId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tour ID is required' 
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Initialize behavior.wishlist if not exists
        if (!user.behavior) user.behavior = {};
        if (!user.behavior.wishlist) user.behavior.wishlist = [];

        // Check if already in wishlist
        const alreadyExists = user.behavior.wishlist.some(
            item => item.tourId?.toString() === tourId
        );

        if (alreadyExists) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tour already in wishlist' 
            });
        }

        // Add to wishlist
        user.behavior.wishlist.push({
            tourId: tourId,
            addedAt: new Date()
        });

        await user.save();

        res.json({
            success: true,
            message: 'Added to wishlist successfully'
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error adding to wishlist',
            error: error.message
        });
    }
});

// Remove from wishlist
router.delete('/:userId/wishlist/:tourId', async (req, res) => {
    try {
        const { userId, tourId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Remove from wishlist
        if (user.behavior?.wishlist) {
            user.behavior.wishlist = user.behavior.wishlist.filter(
                item => item.tourId?.toString() !== tourId
            );
            await user.save();
        }

        res.json({
            success: true,
            message: 'Removed from wishlist successfully'
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error removing from wishlist',
            error: error.message
        });
    }
});

// =============================================
// TRAVEL HISTORY
// =============================================

// Get travel history (view history)
router.get('/:userId/travel-history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        const user = await User.findById(userId).select('behavior.viewHistory');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Get view history
        const viewHistory = user.behavior?.viewHistory || [];
        
        // Get unique tour IDs
        const tourIds = [...new Set(viewHistory.map(item => item.tourId))];
        
        // Populate with tour details
        const tours = await Tour.find({ _id: { $in: tourIds } }).limit(parseInt(limit));

        res.json({
            success: true,
            count: tours.length,
            history: tours
        });
    } catch (error) {
        console.error('Error fetching travel history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching travel history',
            error: error.message
        });
    }
});

// =============================================
// SEARCH HISTORY
// =============================================

// Get search history
router.get('/:userId/search-history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        const user = await User.findById(userId).select('behavior.searchHistory');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const searchHistory = user.behavior?.searchHistory || [];
        
        // Get recent searches
        const recentSearches = searchHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            count: recentSearches.length,
            searches: recentSearches
        });
    } catch (error) {
        console.error('Error fetching search history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching search history',
            error: error.message
        });
    }
});

// Clear search history
router.delete('/:userId/search-history', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        await User.findByIdAndUpdate(userId, {
            'behavior.searchHistory': []
        });

        res.json({
            success: true,
            message: 'Search history cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing search history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error clearing search history',
            error: error.message
        });
    }
});

// =============================================
// AVATAR UPLOAD (Base64)
// =============================================

router.put('/:userId/avatar', async (req, res) => {
    try {
        const { userId } = req.params;
        const { avatar } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        if (!avatar) {
            return res.status(400).json({ 
                success: false, 
                message: 'Avatar data is required' 
            });
        }

        // Validate base64 or URL
        if (!avatar.startsWith('data:image') && !avatar.startsWith('http')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid avatar format. Must be base64 or URL' 
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: avatar, updatedAt: new Date() },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            message: 'Avatar updated successfully',
            avatar: user.avatar
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating avatar',
            error: error.message
        });
    }
});

// =============================================
// =============================================
// RECENT ACTIVITY
// =============================================

router.get('/:userId/recent-activity', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const activities = [];

        // 1. BOOKING ACTIVITIES
        const recentBookings = await Booking.find({ userId: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('tourId', 'name country img price')
            .populate('hotelId', 'name location.city images');

        recentBookings.forEach(booking => {
            const itemName = booking.tourId?.name || booking.hotelId?.name || 'Unknown';
            const itemType = booking.tourId ? 'tour' : 'hotel';
            
            activities.push({
                type: 'booking',
                icon: 'fa-plane',
                title: `Đặt ${itemType === 'tour' ? 'tour' : 'khách sạn'}`,
                description: itemName,
                status: booking.status,
                timestamp: booking.createdAt,
                time: getTimeAgo(booking.createdAt),
                data: {
                    bookingId: booking._id,
                    itemType: itemType,
                    itemName: itemName,
                    status: booking.status,
                    totalPrice: booking.totalPrice
                }
            });
        });

        // 2. WISHLIST ACTIVITIES
        const wishlistItems = user.behavior?.wishlist || [];
        const recentWishlist = wishlistItems
            .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
            .slice(0, 5);

        for (const item of recentWishlist) {
            try {
                const tour = await Tour.findById(item.tourId).select('name country img');
                if (tour) {
                    activities.push({
                        type: 'wishlist',
                        icon: 'fa-heart',
                        title: 'Thêm vào yêu thích',
                        description: `${tour.name} - ${tour.country}`,
                        timestamp: item.addedAt,
                        time: getTimeAgo(item.addedAt),
                        data: {
                            tourId: item.tourId,
                            tourName: tour.name,
                            country: tour.country
                        }
                    });
                }
            } catch (err) {
                console.log('Error loading wishlist item:', err.message);
            }
        }

        // 3. SEARCH HISTORY
        const searchHistory = user.behavior?.searchHistory || [];
        const recentSearches = searchHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        recentSearches.forEach(search => {
            activities.push({
                type: 'search',
                icon: 'fa-search',
                title: 'Tìm kiếm',
                description: search.query || 'Tour du lịch',
                timestamp: search.timestamp,
                time: getTimeAgo(search.timestamp),
                data: {
                    query: search.query,
                    filters: search.filters
                }
            });
        });

        // 4. VIEW HISTORY (if exists)
        const viewHistory = user.behavior?.viewHistory || [];
        const recentViews = viewHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 3);

        for (const view of recentViews) {
            try {
                const tour = await Tour.findById(view.tourId).select('name country');
                if (tour) {
                    activities.push({
                        type: 'view',
                        icon: 'fa-eye',
                        title: 'Xem chi tiết tour',
                        description: tour.name,
                        timestamp: view.timestamp,
                        time: getTimeAgo(view.timestamp),
                        data: {
                            tourId: view.tourId,
                            tourName: tour.name,
                            duration: view.duration
                        }
                    });
                }
            } catch (err) {
                console.log('Error loading view history:', err.message);
            }
        }

        // 5. PROFILE UPDATES
        if (user.updatedAt && user.createdAt && 
            new Date(user.updatedAt) > new Date(user.createdAt)) {
            activities.push({
                type: 'profile_update',
                icon: 'fa-user-edit',
                title: 'Cập nhật thông tin',
                description: 'Đã cập nhật thông tin cá nhân',
                timestamp: user.updatedAt,
                time: getTimeAgo(user.updatedAt),
                data: {}
            });
        }

        // Sort all activities by timestamp (newest first)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Return limited results
        const limitedActivities = activities.slice(0, parseInt(limit));

        res.json({
            success: true,
            count: limitedActivities.length,
            totalActivities: activities.length,
            activities: limitedActivities
        });
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tải hoạt động gần đây',
            error: error.message
        });
    }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} tuần trước`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} tháng trước`;
    return `${Math.floor(seconds / 31536000)} năm trước`;
}

module.exports = router;
