/**
 * Revenue Management API Routes
 * Provides analytics and statistics for admin revenue tracking
 */

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const CMPWallet = require('../models/CMPWallet');
const Hotel = require('../models/Hotel');
const User = require('../models/User');

/**
 * GET /api/admin/revenue/stats
 * Get comprehensive revenue statistics
 * Query params:
 * - startDate: ISO date string (default: 30 days ago)
 * - endDate: ISO date string (default: now)
 * - groupBy: 'day' | 'week' | 'month' (default: 'day')
 */
router.get('/stats', async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        // Default date range: last 30 days
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        console.log('📊 Fetching revenue stats:', { start, end, groupBy });

        // 1. Total Revenue from Bookings
        const bookingRevenue = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ['pending', 'confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('💰 Booking revenue aggregation result:', bookingRevenue);

        // 2. Top-up Revenue = Completed deposits + Current wallet balances
        // Use User.wallet (embedded) since wallet transactions are stored on User model
        const topupRevenue = await User.aggregate([
            { $unwind: '$wallet.transactions' },
            {
                $match: {
                    'wallet.transactions.timestamp': { $gte: start, $lte: end },
                    'wallet.transactions.type': { $in: ['topup', 'deposit'] },
                    'wallet.transactions.status': 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$wallet.transactions.amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('💳 Top-up deposits aggregation result (users.wallet):', topupRevenue);

        // Get total wallet balances from users
        const walletBalances = await User.aggregate([
            {
                $match: {
                    'wallet.balance': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: '$wallet.balance' },
                    walletCount: { $sum: 1 }
                }
            }
        ]);

        console.log('💼 Wallet balances aggregation result (users.wallet):', walletBalances);

        const totalTopupDeposits = topupRevenue[0]?.total || 0;
        const totalTopupCount = topupRevenue[0]?.count || 0;
        const totalWalletBalance = walletBalances[0]?.totalBalance || 0;
        const totalTopupRevenue = totalTopupDeposits + totalWalletBalance;

        console.log('💵 Top-up calculation:', {
            deposits: totalTopupDeposits,
            depositsCount: totalTopupCount,
            currentBalance: totalWalletBalance,
            total: totalTopupRevenue
        });

        // 2. Revenue Over Time (grouped by day/week/month)
        let groupByFormat;
        let groupByFormatTopup;
        switch (groupBy) {
            case 'week':
                groupByFormat = { $isoWeek: '$createdAt' };
                groupByFormatTopup = { $isoWeek: '$wallet.transactions.timestamp' };
                break;
            case 'month':
                groupByFormat = { $month: '$createdAt' };
                groupByFormatTopup = { $month: '$wallet.transactions.timestamp' };
                break;
            default: // day
                groupByFormat = { $dayOfMonth: '$createdAt' };
                groupByFormatTopup = { $dayOfMonth: '$wallet.transactions.timestamp' };
        }

        const revenueTimeline = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ['pending', 'confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        period: groupByFormat
                    },
                    bookingRevenue: { $sum: '$totalAmount' },
                    bookingCount: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.period': 1 }
            }
        ]);

        // Top-up timeline from embedded user.wallet.transactions
        const topupTimeline = await User.aggregate([
            { $unwind: '$wallet.transactions' },
            {
                $match: {
                    'wallet.transactions.timestamp': { $gte: start, $lte: end },
                    'wallet.transactions.type': { $in: ['topup', 'deposit'] },
                    'wallet.transactions.status': 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$wallet.transactions.timestamp' },
                        month: { $month: '$wallet.transactions.timestamp' },
                        period: groupByFormatTopup
                    },
                    topupRevenue: { $sum: '$wallet.transactions.amount' },
                    topupCount: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.period': 1 }
            }
        ]);

        // Merge timelines
        const timelineMap = new Map();
        revenueTimeline.forEach(item => {
            const key = `${item._id.year}-${item._id.month}-${item._id.period}`;
            timelineMap.set(key, {
                date: item._id,
                bookingRevenue: item.bookingRevenue,
                bookingCount: item.bookingCount,
                topupRevenue: 0,
                topupCount: 0
            });
        });

        topupTimeline.forEach(item => {
            const key = `${item._id.year}-${item._id.month}-${item._id.period}`;
            const existing = timelineMap.get(key) || {
                date: item._id,
                bookingRevenue: 0,
                bookingCount: 0,
                topupRevenue: 0,
                topupCount: 0
            };
            existing.topupRevenue = item.topupRevenue;
            existing.topupCount = item.topupCount;
            timelineMap.set(key, existing);
        });

        const timeline = Array.from(timelineMap.values()).map(item => ({
            ...item,
            totalRevenue: item.bookingRevenue + item.topupRevenue
        }));

        // 3. Top Hotels by Revenue
        const topHotels = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ['pending', 'confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: '$hotelId',
                    revenue: { $sum: '$totalAmount' },
                    bookings: { $sum: 1 }
                }
            },
            {
                $sort: { revenue: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'hotels',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'hotel'
                }
            },
            {
                $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    hotelId: '$_id',
                    hotelName: { $ifNull: ['$hotel.name', 'Unknown Hotel'] },
                    hotelLocation: { $ifNull: ['$hotel.location', 'N/A'] },
                    revenue: 1,
                    bookings: 1
                }
            }
        ]);

        // 4. Top Users by Spending
        const topUsers = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ['pending', 'confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalSpent: { $sum: '$totalAmount' },
                    bookings: { $sum: 1 }
                }
            },
            {
                $sort: { totalSpent: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    userId: '$_id',
                    userName: { $ifNull: ['$user.username', 'Unknown User'] },
                    userEmail: { $ifNull: ['$user.email', 'N/A'] },
                    totalSpent: 1,
                    bookings: 1
                }
            }
        ]);

        // 5. Payment Method Distribution
        const paymentMethods = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ['pending', 'confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    revenue: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { revenue: -1 }
            }
        ]);

        // 6. Summary Statistics
        const totalBookingRevenue = bookingRevenue[0]?.total || 0;
        const totalRevenue = totalBookingRevenue + totalTopupRevenue;
        const totalTransactions = (bookingRevenue[0]?.count || 0) + (topupRevenue[0]?.count || 0);
        const walletCount = walletBalances[0]?.walletCount || 0;

        // Average transaction value
        const avgBookingValue = bookingRevenue[0]?.count > 0 
            ? totalBookingRevenue / bookingRevenue[0].count 
            : 0;

        console.log('📈 Final stats calculation:', {
            totalRevenue,
            totalBookingRevenue,
            totalTopupRevenue,
            totalTransactions,
            walletCount
        });

        const stats = {
            summary: {
                totalRevenue,
                totalTopupRevenue,
                totalWalletBalance,
                totalTopupDeposits,
                totalTransactions,
                totalBookings: bookingRevenue[0]?.count || 0,
                totalTopups: topupRevenue[0]?.count || 0,
                totalWallets: walletCount,
                avgBookingValue: Math.round(avgBookingValue),
                dateRange: {
                    start: start.toISOString(),
                    end: end.toISOString()
                }
            },
            timeline,
            topUsers
        };

        console.log('✅ Revenue stats calculated:', {
            totalRevenue,
            transactions: totalTransactions,
            timelinePoints: timeline.length,
            topUsersCount: topUsers.length
        });

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Revenue stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue statistics',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/revenue/export
 * Export revenue data as CSV
 */
router.get('/export', async (req, res) => {
    try {
        const { startDate, endDate, format = 'csv' } = req.query;

        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Get all transactions
        const bookings = await Booking.find({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ['pending', 'confirmed', 'completed'] }
        })
        .populate('userId', 'username email')
        .populate('hotelId', 'name location')
        .sort({ createdAt: -1 })
        .lean();

        // Get all wallet transactions from users (embedded)
        const users = await User.find({})
            .select('username email wallet')
            .lean();

        const topups = [];
        users.forEach(user => {
            const transactions = user.wallet?.transactions || [];
            transactions.forEach(tx => {
                const txDate = tx.createdAt || tx.timestamp;
                if ((tx.type === 'deposit' || tx.type === 'topup') && txDate) {
                    if (new Date(txDate) >= start && new Date(txDate) <= end && tx.status === 'completed') {
                        topups.push({
                            ...tx,
                            userId: { _id: user._id, username: user.username, email: user.email }
                        });
                    }
                }
            });
        });

        topups.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));

        if (format === 'json') {
            return res.json({
                success: true,
                data: {
                    bookings,
                    topups,
                    dateRange: { start, end }
                }
            });
        }

        // CSV Export
        const csvRows = [];
        csvRows.push('Date,Type,User,Email,Description,Amount,Payment Method,Status');

        // Add bookings
        bookings.forEach(booking => {
            const row = [
                new Date(booking.createdAt).toISOString().split('T')[0],
                'Booking',
                booking.userId?.username || 'N/A',
                booking.userId?.email || 'N/A',
                `${booking.hotelId?.name || 'Unknown Hotel'} - ${booking.nights} nights`,
                booking.totalAmount,
                booking.paymentMethod || 'N/A',
                booking.status
            ];
            csvRows.push(row.join(','));
        });

        // Add topups
        topups.forEach(topup => {
            const row = [
                new Date(topup.createdAt).toISOString().split('T')[0],
                'Top-up',
                topup.userId?.username || 'N/A',
                topup.userId?.email || 'N/A',
                topup.description || 'Wallet top-up',
                topup.amount,
                topup.paymentMethod || 'N/A',
                topup.status
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('❌ Revenue export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export revenue data',
            error: error.message
        });
    }
});

module.exports = router;
