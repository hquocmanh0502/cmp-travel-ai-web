const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Set or update wallet PIN
router.post('/set-pin', async (req, res) => {
    try {
        const { userId, newPin, currentPin } = req.body;

        // Validate PIN format
        if (!/^\d{6}$/.test(newPin)) {
            return res.status(400).json({
                success: false,
                error: 'PIN must be exactly 6 digits'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // If PIN already exists, verify current PIN
        if (user.wallet.pin && user.wallet.pinEnabled) {
            if (!currentPin) {
                return res.status(400).json({
                    success: false,
                    error: 'Current PIN required to change PIN'
                });
            }

            const isValidPin = await bcrypt.compare(currentPin, user.wallet.pin);
            if (!isValidPin) {
                return res.status(401).json({
                    success: false,
                    error: 'Current PIN is incorrect'
                });
            }
        }

        // Hash the new PIN
        const hashedPin = await bcrypt.hash(newPin, 10);

        // Update user wallet PIN
        user.wallet.pin = hashedPin;
        user.wallet.pinEnabled = true;
        await user.save();

        res.json({
            success: true,
            message: 'Wallet PIN set successfully',
            pinEnabled: true
        });

    } catch (error) {
        console.error('Set PIN error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set PIN'
        });
    }
});

// Verify wallet PIN
router.post('/verify-pin', async (req, res) => {
    try {
        const { userId, pin } = req.body;

        if (!/^\d{6}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PIN format'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!user.wallet.pin || !user.wallet.pinEnabled) {
            return res.status(400).json({
                success: false,
                error: 'PIN not set for this wallet'
            });
        }

        const isValidPin = await bcrypt.compare(pin, user.wallet.pin);
        if (!isValidPin) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect PIN'
            });
        }

        res.json({
            success: true,
            message: 'PIN verified successfully'
        });

    } catch (error) {
        console.error('Verify PIN error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify PIN'
        });
    }
});

// Toggle PIN enabled/disabled
router.post('/toggle-pin', async (req, res) => {
    try {
        const { userId, enabled, pin } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!user.wallet.pin) {
            return res.status(400).json({
                success: false,
                error: 'PIN not set. Please set a PIN first.'
            });
        }

        // Verify PIN when toggling
        if (pin) {
            const isValidPin = await bcrypt.compare(pin, user.wallet.pin);
            if (!isValidPin) {
                return res.status(401).json({
                    success: false,
                    error: 'Incorrect PIN'
                });
            }
        }

        user.wallet.pinEnabled = enabled;
        await user.save();

        res.json({
            success: true,
            pinEnabled: user.wallet.pinEnabled,
            message: `PIN ${enabled ? 'enabled' : 'disabled'} successfully`
        });

    } catch (error) {
        console.error('Toggle PIN error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle PIN'
        });
    }
});

// Get PIN status
router.get('/pin-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            hasPin: !!user.wallet.pin,
            pinEnabled: user.wallet.pinEnabled || false
        });

    } catch (error) {
        console.error('Get PIN status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get PIN status'
        });
    }
});

module.exports = router;
