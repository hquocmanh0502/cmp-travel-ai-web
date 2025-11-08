const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Block/Unblock user endpoint
router.post('/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body; // action: 'block' or 'unblock'

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user blocked status
    const isBlocking = action === 'block';
    user.blocked = isBlocking;
    user.blockReason = isBlocking ? reason : null;
    user.blockedAt = isBlocking ? new Date() : null;
    
    await user.save();

    res.json({
      success: true,
      message: `User ${isBlocking ? 'blocked' : 'unblocked'} successfully`,
      data: {
        userId: user._id,
        blocked: user.blocked,
        reason: user.blockReason
      }
    });

  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Check if user is blocked
router.get('/:userId/block-status', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('blocked blockReason blockedAt');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        blocked: user.blocked || false,
        reason: user.blockReason,
        blockedAt: user.blockedAt
      }
    });

  } catch (error) {
    console.error('Error checking user block status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;