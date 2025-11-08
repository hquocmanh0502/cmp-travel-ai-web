const UserViolation = require('../models/UserViolation');
const UserBan = require('../models/UserBan');
const User = require('../models/User');

class UserBanService {
    static BAN_RULES = {
        spam: {
            thresholds: [
                { violations: 3, duration: 24, severity: 'temporary' },
                { violations: 6, duration: 72, severity: 'temporary' },
                { violations: 10, duration: 168, severity: 'temporary' },
                { violations: 15, duration: 720, severity: 'temporary' },
                { violations: 20, duration: null, severity: 'permanent' }
            ]
        },
        toxic: {
            thresholds: [
                { violations: 2, duration: 24, severity: 'temporary' },
                { violations: 4, duration: 72, severity: 'temporary' },
                { violations: 7, duration: 168, severity: 'temporary' },
                { violations: 10, duration: 720, severity: 'temporary' },
                { violations: 12, duration: null, severity: 'permanent' }
            ]
        }
    };

    static async recordViolation(violationData) {
        try {
            const violation = new UserViolation(violationData);
            await violation.save();
            await this.checkAndApplyBan(violationData.userId, violationData.violationType);
            return violation;
        } catch (error) {
            console.error('Error recording violation:', error);
            throw error;
        }
    }

    static async checkAndApplyBan(userId, violationType) {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const violationCount = await UserViolation.countDocuments({
                userId: userId,
                violationType: violationType,
                reviewStatus: { $in: ['pending', 'confirmed'] },
                createdAt: { $gte: thirtyDaysAgo }
            });

            const existingBan = await UserBan.findOne({
                userId: userId,
                isActive: true,
                $or: [
                    { endDate: { $gt: new Date() } },
                    { severity: 'permanent' }
                ]
            });

            if (existingBan) {
                return await this.extendExistingBan(existingBan, violationType, violationCount);
            }

            const rules = this.BAN_RULES[violationType] || this.BAN_RULES.spam;
            const applicableRule = rules.thresholds
                .reverse()
                .find(rule => violationCount >= rule.violations);

            if (applicableRule) {
                return await this.applyBan(userId, violationType, violationCount, applicableRule);
            }

            return null;
        } catch (error) {
            console.error('Error checking ban conditions:', error);
            throw error;
        }
    }

    static async applyBan(userId, violationType, violationCount, rule) {
        try {
            const recentViolations = await UserViolation.find({
                userId: userId,
                violationType: violationType,
                reviewStatus: { $in: ['pending', 'confirmed'] }
            }).sort({ createdAt: -1 }).limit(10);

            const banData = {
                userId: userId,
                banType: 'reply_ban',
                reason: `Automatic ban due to ${violationCount} ${violationType} violations`,
                violations: recentViolations.map(v => ({
                    violationId: v._id,
                    violationType: v.violationType,
                    createdAt: v.createdAt
                })),
                severity: rule.severity,
                duration: rule.duration,
                bannedBy: userId,
                bannedByType: 'auto'
            };

            const ban = new UserBan(banData);
            await ban.save();
            await this.notifyUserOfBan(userId, ban);

            console.log(`User ${userId} banned for ${violationType}`);
            return ban;
        } catch (error) {
            console.error('Error applying ban:', error);
            throw error;
        }
    }

    static async extendExistingBan(existingBan, violationType, violationCount) {
        try {
            const rules = this.BAN_RULES[violationType] || this.BAN_RULES.spam;
            const newRule = rules.thresholds
                .reverse()
                .find(rule => violationCount >= rule.violations);

            if (newRule && newRule.severity === 'permanent' && existingBan.severity !== 'permanent') {
                existingBan.severity = 'permanent';
                existingBan.endDate = null;
                existingBan.reason += ` | Upgraded to permanent due to ${violationCount} violations`;
                await existingBan.save();
                console.log(`User ${existingBan.userId} ban upgraded to permanent`);
                return existingBan;
            }
            return existingBan;
        } catch (error) {
            console.error('Error extending ban:', error);
            throw error;
        }
    }

    static async isUserBanned(userId, banType = 'reply_ban') {
        try {
            const activeBan = await UserBan.findOne({
                userId: userId,
                banType: { $in: [banType, 'full_ban'] },
                isActive: true,
                $or: [
                    { endDate: { $gt: new Date() } },
                    { severity: 'permanent' }
                ]
            }).populate('bannedBy', 'username email');

            if (activeBan && activeBan.isExpired()) {
                activeBan.isActive = false;
                await activeBan.save();
                return null;
            }

            return activeBan;
        } catch (error) {
            console.error('Error checking ban status:', error);
            throw error;
        }
    }

    static async manualBan(banData, adminId) {
        try {
            const ban = new UserBan({
                ...banData,
                bannedBy: adminId,
                bannedByType: 'manual'
            });

            await ban.save();
            await this.notifyUserOfBan(banData.userId, ban);
            console.log(`User ${banData.userId} manually banned by admin ${adminId}`);
            return ban;
        } catch (error) {
            console.error('Error applying manual ban:', error);
            throw error;
        }
    }

    static async liftBan(banId, adminId, reason) {
        try {
            const ban = await UserBan.findById(banId);
            if (!ban) {
                throw new Error('Ban not found');
            }

            ban.isActive = false;
            ban.appealStatus = 'approved';
            ban.appealReviewedBy = adminId;
            ban.appealReviewedAt = new Date();
            ban.appealNotes = reason;
            await ban.save();
            
            console.log(`Ban ${banId} lifted by admin ${adminId}`);
            return ban;
        } catch (error) {
            console.error('Error lifting ban:', error);
            throw error;
        }
    }

    static async getActiveBans(page = 1, limit = 20, filters = {}) {
        try {
            const query = { isActive: true, ...filters };

            const bans = await UserBan.find(query)
                .populate('userId', 'username email fullName')
                .populate('bannedBy', 'username email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await UserBan.countDocuments(query);

            return {
                bans,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching active bans:', error);
            throw error;
        }
    }

    static async getUserViolations(userId, limit = 50) {
        try {
            return await UserViolation.find({ userId })
                .populate('tourId', 'name destination')
                .populate('reviewedBy', 'username email')
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error fetching user violations:', error);
            throw error;
        }
    }

    static async getUserBans(userId, limit = 20) {
        try {
            return await UserBan.find({ userId })
                .populate('bannedBy', 'username email')
                .populate('appealReviewedBy', 'username email')
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error fetching user bans:', error);
            throw error;
        }
    }

    static async notifyUserOfBan(userId, ban) {
        try {
            console.log(`Notification sent to user ${userId} about ban ${ban._id}`);
        } catch (error) {
            console.error('Error sending ban notification:', error);
        }
    }

    static async cleanupExpiredBans() {
        try {
            const result = await UserBan.updateMany(
                {
                    isActive: true,
                    severity: 'temporary',
                    endDate: { $lt: new Date() }
                },
                { $set: { isActive: false } }
            );

            console.log(`Cleaned up ${result.modifiedCount} expired bans`);
            return result;
        } catch (error) {
            console.error('Error cleaning up expired bans:', error);
            throw error;
        }
    }
}

module.exports = UserBanService;