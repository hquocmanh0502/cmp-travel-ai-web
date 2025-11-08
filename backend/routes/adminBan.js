const express = require('express');
const router = express.Router();
const AdminBanController = require('../controllers/AdminBanController');

// Dashboard stats
router.get('/stats', AdminBanController.getDashboardStats);

// Active bans management
router.get('/bans', AdminBanController.getActiveBans);
router.post('/bans', AdminBanController.banUser);
router.delete('/bans/:banId', AdminBanController.liftBan);

// User management - IMPORTANT: Specific routes MUST come BEFORE parameterized routes
router.get('/users/search', AdminBanController.searchUsers);
router.get('/users/:userId', AdminBanController.getUserDetails);

// Violations management
router.get('/violations', AdminBanController.getRecentViolations);
router.patch('/violations/:violationId/review', AdminBanController.reviewViolation);

// Maintenance
router.post('/cleanup', AdminBanController.cleanupExpiredBans);

module.exports = router;