const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');

// 🔍 DEBUG: Enhanced logging for all hotel operations
const debugLog = (action, data, userId = null) => {
  console.log(`[HOTEL-ADMIN] ${new Date().toISOString()}`);
  console.log(`Action: ${action}`);
  console.log(`User: ${userId || 'Unknown'}`);
  console.log(`Data:`, JSON.stringify(data, null, 2));
  console.log('=' + '='.repeat(50));
};

// GET hotel statistics - MUST BE FIRST to avoid /:id conflict
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📊 GET /api/admin/hotels/stats/overview called');
    debugLog('FETCH_HOTEL_STATS', {});

    const total = await Hotel.countDocuments();
    const active = await Hotel.countDocuments({ status: 'active' });
    const inactive = await Hotel.countDocuments({ status: 'inactive' });
    
    const starDistribution = await Hotel.aggregate([
      {
        $group: {
          _id: '$details.starRating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const stats = {
      total,
      active,
      inactive,
      starDistribution: starDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    debugLog('HOTEL_STATS_FETCHED', stats);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    debugLog('FETCH_STATS_ERROR', { error: error.message });
    console.error('Error fetching hotel stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// GET all hotels for admin
router.get('/', async (req, res) => {
  try {
    console.log('🔄 GET /api/admin/hotels called');
    debugLog('FETCH_ALL_HOTELS', { query: req.query });
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { 'location.city': { $regex: req.query.search, $options: 'i' } },
        { 'location.country': { $regex: req.query.search, $options: 'i' } },
        { 'location.address': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.country && req.query.country !== 'all') {
      filter['location.country'] = { $regex: req.query.country, $options: 'i' };
    }
    if (req.query.stars && req.query.stars !== 'all') {
      filter['details.starRating'] = parseInt(req.query.stars);
    }
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const hotels = await Hotel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Hotel.countDocuments(filter);
    
    debugLog('HOTELS_FETCHED', {
      count: hotels.length,
      total,
      page,
      limit,
      filter
    });

    const responseData = {
      success: true,
      hotels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
    console.log('🔍 SENDING RESPONSE:', {
      success: responseData.success,
      hotelsCount: responseData.hotels?.length,
      hotelsExists: !!responseData.hotels,
      responseKeys: Object.keys(responseData)
    });
    
    res.json(responseData);
  } catch (error) {
    debugLog('FETCH_HOTELS_ERROR', { error: error.message });
    console.error('Error fetching hotels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotels',
      error: error.message
    });
  }
});

// GET single hotel by ID
router.get('/:id', async (req, res) => {
  try {
    debugLog('FETCH_SINGLE_HOTEL', { hotelId: req.params.id });
    
    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      debugLog('HOTEL_NOT_FOUND', { hotelId: req.params.id });
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    debugLog('HOTEL_FETCHED', { hotel: hotel.name });

    res.json({
      success: true,
      hotel
    });
  } catch (error) {
    debugLog('FETCH_HOTEL_ERROR', { error: error.message, hotelId: req.params.id });
    console.error('Error fetching hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel',
      error: error.message
    });
  }
});

// POST - Create new hotel
router.post('/', async (req, res) => {
  try {
    debugLog('CREATE_HOTEL', req.body);

    const {
      name,
      description,
      location,
      stars,
      images,
      amenities,
      roomTypes,
      contactInfo,
      policies,
      coordinates
    } = req.body;

    // Validation
    if (!name || !description || !location || !stars) {
      debugLog('VALIDATION_ERROR', { missing: 'required fields' });
      return res.status(400).json({
        success: false,
        message: 'Name, description, location, and stars are required'
      });
    }

    if (stars < 1 || stars > 5) {
      debugLog('VALIDATION_ERROR', { stars });
      return res.status(400).json({
        success: false,
        message: 'Stars must be between 1 and 5'
      });
    }

    // Check if hotel with same name and location exists
    const existingHotel = await Hotel.findOne({
      name: { $regex: name, $options: 'i' },
      location: { $regex: location, $options: 'i' }
    });

    if (existingHotel) {
      debugLog('DUPLICATE_HOTEL', { existing: existingHotel.name });
      return res.status(400).json({
        success: false,
        message: 'Hotel with similar name and location already exists'
      });
    }

    const newHotel = new Hotel({
      name,
      description,
      location,
      stars,
      images: images || [],
      amenities: amenities || [],
      roomTypes: roomTypes || [],
      contactInfo: contactInfo || {},
      policies: policies || {},
      coordinates: coordinates || {},
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedHotel = await newHotel.save();
    
    debugLog('HOTEL_CREATED', { 
      hotelId: savedHotel._id, 
      name: savedHotel.name 
    });

    res.status(201).json({
      success: true,
      message: 'Hotel created successfully',
      hotel: savedHotel
    });
  } catch (error) {
    debugLog('CREATE_HOTEL_ERROR', { error: error.message });
    console.error('Error creating hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create hotel',
      error: error.message
    });
  }
});

// PUT - Update hotel
router.put('/:id', async (req, res) => {
  try {
    debugLog('UPDATE_HOTEL', { hotelId: req.params.id, updates: req.body });

    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      debugLog('HOTEL_NOT_FOUND', { hotelId: req.params.id });
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        hotel[key] = req.body[key];
      }
    });

    hotel.updatedAt = new Date();

    const updatedHotel = await hotel.save();
    
    debugLog('HOTEL_UPDATED', { 
      hotelId: updatedHotel._id, 
      name: updatedHotel.name 
    });

    res.json({
      success: true,
      message: 'Hotel updated successfully',
      hotel: updatedHotel
    });
  } catch (error) {
    debugLog('UPDATE_HOTEL_ERROR', { error: error.message });
    console.error('Error updating hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hotel',
      error: error.message
    });
  }
});

// DELETE - Delete hotel
router.delete('/:id', async (req, res) => {
  try {
    debugLog('DELETE_HOTEL', { hotelId: req.params.id });

    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      debugLog('HOTEL_NOT_FOUND', { hotelId: req.params.id });
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    await Hotel.findByIdAndDelete(req.params.id);
    
    debugLog('HOTEL_DELETED', { 
      hotelId: req.params.id, 
      name: hotel.name 
    });

    res.json({
      success: true,
      message: 'Hotel deleted successfully'
    });
  } catch (error) {
    debugLog('DELETE_HOTEL_ERROR', { error: error.message });
    console.error('Error deleting hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete hotel',
      error: error.message
    });
  }
});

// PATCH - Toggle hotel status
router.patch('/:id/status', async (req, res) => {
  try {
    debugLog('TOGGLE_HOTEL_STATUS', { hotelId: req.params.id, status: req.body.status });

    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      debugLog('HOTEL_NOT_FOUND', { hotelId: req.params.id });
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    hotel.status = req.body.status || (hotel.status === 'active' ? 'inactive' : 'active');
    hotel.updatedAt = new Date();

    await hotel.save();
    
    debugLog('HOTEL_STATUS_UPDATED', { 
      hotelId: req.params.id, 
      newStatus: hotel.status 
    });

    res.json({
      success: true,
      message: `Hotel ${hotel.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      hotel
    });
  } catch (error) {
    debugLog('TOGGLE_STATUS_ERROR', { error: error.message });
    console.error('Error toggling hotel status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hotel status',
      error: error.message
    });
  }
});

module.exports = router;
