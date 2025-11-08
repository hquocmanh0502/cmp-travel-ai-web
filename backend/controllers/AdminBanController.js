const UserBanService = require('../services/userBanService');
const UserViolation = require('../models/UserViolation');
const UserBan = require('../models/UserBan');
const User = require('../models/User');

class AdminBanController {
    /**
     * Get dashboard statistics
     */
    static async getDashboardStats(req, res) {
        try {
            const today = new Date();
            const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Active bans count
            const activeBans = await UserBan.countDocuments({ isActive: true });
            
            // New violations this week
            const weeklyViolations = await UserViolation.countDocuments({
                createdAt: { $gte: thisWeek }
            });

            // Bans issued this month
            const monthlyBans = await UserBan.countDocuments({
                createdAt: { $gte: thisMonth }
            });

            // Violation types breakdown
            const violationBreakdown = await UserViolation.aggregate([
                {
                    $match: {
                        createdAt: { $gte: thisMonth }
                    }
                },
                {
                    $group: {
                        _id: '$violationType',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Ban types breakdown
            const banBreakdown = await UserBan.aggregate([
                {
                    $match: {
                        isActive: true
                    }
                },
                {
                    $group: {
                        _id: '$severity',
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    activeBans,
                    weeklyViolations,
                    monthlyBans,
                    violationBreakdown,
                    banBreakdown
                }
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching dashboard statistics',
                error: error.message
            });
        }
    }

    /**
     * Get all active bans with pagination and filters
     */
    static async getActiveBans(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const banType = req.query.banType;
            const severity = req.query.severity;
            const search = req.query.search;

            let filters = {};
            
            if (banType) filters.banType = banType;
            if (severity) filters.severity = severity;

            const result = await UserBanService.getActiveBans(page, limit, filters);

            // If search is provided, filter by username/email
            if (search && result.bans) {
                result.bans = result.bans.filter(ban => 
                    ban.userId.username.toLowerCase().includes(search.toLowerCase()) ||
                    ban.userId.email.toLowerCase().includes(search.toLowerCase()) ||
                    ban.userId.fullName.toLowerCase().includes(search.toLowerCase())
                );
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error fetching active bans:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching active bans',
                error: error.message
            });
        }
    }

    /**
     * Get user details with violation and ban history
     */
    static async getUserDetails(req, res) {
        try {
            const { userId } = req.params;

            // Get user info
            const user = await User.findById(userId).select('-password');
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Get violations
            const violations = await UserBanService.getUserViolations(userId, 100);
            
            // Get bans
            const bans = await UserBanService.getUserBans(userId, 50);

            // Get current ban status
            const currentBan = await UserBanService.isUserBanned(userId);

            // Get violation summary
            const violationSummary = await UserViolation.aggregate([
                { $match: { userId: user._id } },
                {
                    $group: {
                        _id: '$violationType',
                        count: { $sum: 1 },
                        latest: { $max: '$createdAt' }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    user,
                    violations,
                    bans,
                    currentBan,
                    violationSummary
                }
            });
        } catch (error) {
            console.error('Error fetching user details:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching user details',
                error: error.message
            });
        }
    }

    /**
     * Manual ban user
     */
    static async banUser(req, res) {
        try {
            console.log('🚫 Ban user request received:', req.body);
            
            const {
                userId,
                banType = 'reply_ban',
                reason,
                severity,
                duration
            } = req.body;

            // Temporary: Use valid ObjectId for admin (no auth for now)
            const mongoose = require('mongoose');
            const adminId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
            
            console.log('📝 Ban data:', { userId, banType, reason, severity, duration, adminId });

            if (!userId || !reason || !severity) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: userId, reason, severity'
                });
            }

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is already banned
            const existingBan = await UserBanService.isUserBanned(userId, banType);
            if (existingBan) {
                return res.status(400).json({
                    success: false,
                    message: 'User is already banned',
                    data: { existingBan }
                });
            }

            const banData = {
                userId,
                banType,
                reason,
                severity,
                duration: severity === 'temporary' ? duration : null
            };

            console.log('📤 Calling UserBanService.manualBan with:', banData);
            const ban = await UserBanService.manualBan(banData, adminId);
            console.log('✅ Ban created successfully:', ban._id);

            res.json({
                success: true,
                message: 'User banned successfully',
                data: { ban }
            });
        } catch (error) {
            console.error('Error banning user:', error);
            res.status(500).json({
                success: false,
                message: 'Error banning user',
                error: error.message
            });
        }
    }

    /**
     * Lift/Remove a ban
     */
    static async liftBan(req, res) {
        try {
            const { banId } = req.params;
            const { reason } = req.body;
            const adminId = req.user?.id;

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Reason is required to lift a ban'
                });
            }

            const ban = await UserBanService.liftBan(banId, adminId, reason);

            res.json({
                success: true,
                message: 'Ban lifted successfully',
                data: { ban }
            });
        } catch (error) {
            console.error('Error lifting ban:', error);
            res.status(500).json({
                success: false,
                message: 'Error lifting ban',
                error: error.message
            });
        }
    }

    /**
     * Get recent violations for review
     */
    static async getRecentViolations(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const status = req.query.status || 'pending';
            const violationType = req.query.violationType;

            let query = {};
            if (status) query.reviewStatus = status;
            if (violationType) query.violationType = violationType;

            const violations = await UserViolation.find(query)
                .populate('userId', 'username email fullName')
                .populate('tourId', 'name destination')
                .populate('reviewedBy', 'username email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await UserViolation.countDocuments(query);

            res.json({
                success: true,
                data: {
                    violations,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching violations:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching violations',
                error: error.message
            });
        }
    }

    /**
     * Review a violation (confirm/dismiss)
     */
    static async reviewViolation(req, res) {
        try {
            const { violationId } = req.params;
            const { action, notes } = req.body; // action: 'confirm' or 'dismiss'
            const adminId = req.user?.id;

            if (!['confirm', 'dismiss'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action. Must be "confirm" or "dismiss"'
                });
            }

            const violation = await UserViolation.findById(violationId);
            if (!violation) {
                return res.status(404).json({
                    success: false,
                    message: 'Violation not found'
                });
            }

            violation.reviewStatus = action === 'confirm' ? 'confirmed' : 'dismissed';
            violation.reviewedBy = adminId;
            violation.reviewedAt = new Date();
            violation.reviewNotes = notes;

            await violation.save();

            // If confirmed, check if this triggers a ban
            if (action === 'confirm') {
                await UserBanService.checkAndApplyBan(violation.userId, violation.violationType);
            }

            res.json({
                success: true,
                message: `Violation ${action}ed successfully`,
                data: { violation }
            });
        } catch (error) {
            console.error('Error reviewing violation:', error);
            res.status(500).json({
                success: false,
                message: 'Error reviewing violation',
                error: error.message
            });
        }
    }

    /**
     * Get all users for ban management
     */
    static async getAllUsers(req, res) {
        try {
            const { limit = 100, page = 1 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Get total count
            const totalUsers = await User.countDocuments();

            // Get users with pagination
            const users = await User.find({})
                .select('username email fullName phone createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            // Simplified - just return users without ban status to avoid errors
            const usersData = users.map(user => ({
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                createdAt: user.createdAt,
                isBanned: false // Will add ban checking later
            }));

            res.json({
                success: true,
                data: { 
                    users: usersData,
                    total: totalUsers,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalUsers / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Error fetching all users:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching all users',
                error: error.message
            });
        }
    }

    /**
     * Search users for ban management
     */
    static async searchUsers(req, res) {
        try {
            const { query, limit = 20, page = 1 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);

            let searchCondition = {};
            
            // If query is provided and has at least 2 characters, search
            if (query && query.trim().length >= 2) {
                const searchRegex = new RegExp(query.trim(), 'i');
                searchCondition = {
                    $or: [
                        { username: searchRegex },
                        { email: searchRegex },
                        { fullName: searchRegex },
                        { phone: searchRegex }
                    ]
                };
            }
            // If no query or query is "*", return all users

            // Get total count for pagination
            const total = await User.countDocuments(searchCondition);
            
            const users = await User.find(searchCondition)
                .select('username email fullName phone createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            // Add ban status for each user
            const usersWithBanStatus = await Promise.all(
                users.map(async (user) => {
                    const currentBan = await UserBanService.isUserBanned(user._id);
                    return {
                        ...user.toObject(),
                        isBanned: !!currentBan,
                        currentBan: currentBan ? {
                            type: currentBan.banType,
                            severity: currentBan.severity,
                            endDate: currentBan.endDate,
                            remainingTime: currentBan.getRemainingTime()
                        } : null
                    };
                })
            );

            res.json({
                success: true,
                data: { 
                    users: usersWithBanStatus,
                    total: total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    hasQuery: !!(query && query.trim().length >= 2)
                }
            });
        } catch (error) {
            console.error('Error searching users:', error);
            res.status(500).json({
                success: false,
                message: 'Error searching users',
                error: error.message
            });
        }
    }

    /**
     * Cleanup expired bans
     */
    static async cleanupExpiredBans(req, res) {
        try {
            const result = await UserBanService.cleanupExpiredBans();
            
            res.json({
                success: true,
                message: `Cleaned up ${result.modifiedCount} expired bans`,
                data: { cleanedCount: result.modifiedCount }
            });
        } catch (error) {
            console.error('Error cleaning up bans:', error);
            res.status(500).json({
                success: false,
                message: 'Error cleaning up expired bans',
                error: error.message
            });
        }
    }
}

module.exports = AdminBanController;