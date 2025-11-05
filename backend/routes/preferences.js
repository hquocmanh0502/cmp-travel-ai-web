// backend/routes/preferences.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/preferences/:userId - Lấy preferences của user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return preferences with default values if not set
    const preferences = {
      budgetRange: user.preferences?.budgetRange || { min: 500, max: 10000 },
      travelStyle: user.preferences?.travelStyle || [],
      activities: user.preferences?.activities || [],
      favoriteCountries: user.preferences?.favoriteCountries || [],
      favoriteDestinations: user.preferences?.favoriteDestinations || [],
      climatePreference: user.preferences?.climatePreference || '',
      groupSize: user.preferences?.groupSize || '',
      travelFrequency: user.preferences?.travelFrequency || 'yearly',
      accommodation: user.preferences?.accommodation || {
        type: 'hotel',
        minRating: 3,
        amenities: []
      },
      hotelPreferences: user.preferences?.hotelPreferences || {
        amenities: []
      },
      dietaryRestrictions: user.preferences?.dietaryRestrictions || [],
      languagePreference: user.preferences?.languagePreference || 'en',
      isComplete: user.preferences?.isComplete || false,
      lastUpdated: user.preferences?.lastUpdated || null
    };

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('❌ Error fetching preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT /api/preferences/:userId - Cập nhật preferences của user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferencesData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate required fields
    const requiredFields = ['budgetRange', 'travelStyle', 'activities'];
    const missingFields = requiredFields.filter(field => !preferencesData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate budget range
    if (preferencesData.budgetRange) {
      const { min, max } = preferencesData.budgetRange;
      if (min < 0 || max <= min) {
        return res.status(400).json({
          success: false,
          message: 'Invalid budget range'
        });
      }
    }

    // Update preferences
    const updatedPreferences = {
      ...preferencesData,
      isComplete: true,
      lastUpdated: new Date()
    };

    user.preferences = updatedPreferences;
    await user.save();

    console.log(`✅ Preferences updated for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('❌ Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/preferences/:userId/reset - Reset preferences về mặc định
router.post('/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset to default preferences
    const defaultPreferences = {
      budgetRange: { min: 500, max: 10000 },
      travelStyle: [],
      activities: [],
      favoriteCountries: [],
      favoriteDestinations: [],
      climatePreference: '',
      groupSize: '',
      travelFrequency: 'yearly',
      accommodation: {
        type: 'hotel',
        minRating: 3,
        amenities: []
      },
      hotelPreferences: {
        amenities: []
      },
      dietaryRestrictions: [],
      languagePreference: 'en',
      isComplete: false,
      lastUpdated: new Date()
    };

    user.preferences = defaultPreferences;
    await user.save();

    console.log(`🔄 Preferences reset for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Preferences reset to default',
      preferences: defaultPreferences
    });

  } catch (error) {
    console.error('❌ Error resetting preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/preferences/:userId/summary - Lấy tổng quan preferences
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const preferences = user.preferences;
    const summary = {
      isComplete: preferences?.isComplete || false,
      lastUpdated: preferences?.lastUpdated,
      completionPercentage: 0,
      missingFields: []
    };

    // Calculate completion percentage
    const fields = [
      'budgetRange', 'travelStyle', 'activities', 'climatePreference',
      'groupSize', 'accommodation', 'languagePreference'
    ];

    let completedFields = 0;
    const missingFields = [];

    fields.forEach(field => {
      if (preferences && preferences[field]) {
        if (field === 'travelStyle' || field === 'activities') {
          if (Array.isArray(preferences[field]) && preferences[field].length > 0) {
            completedFields++;
          } else {
            missingFields.push(field);
          }
        } else if (field === 'budgetRange') {
          if (preferences[field].min && preferences[field].max) {
            completedFields++;
          } else {
            missingFields.push(field);
          }
        } else {
          completedFields++;
        }
      } else {
        missingFields.push(field);
      }
    });

    summary.completionPercentage = Math.round((completedFields / fields.length) * 100);
    summary.missingFields = missingFields;

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('❌ Error fetching preferences summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;