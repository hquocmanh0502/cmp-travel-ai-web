const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');

// Get all hotels grouped by country
router.get('/', async (req, res) => {
  try {
    console.log('🏨 Loading all hotels from database...');
    
    // Get all hotels from database
    const hotels = await Hotel.find({ status: 'active' }).lean();
    
    // Group by country
    const hotelsByCountry = {};
    hotels.forEach(hotel => {
      const country = hotel.location.country;
      if (!hotelsByCountry[country]) {
        hotelsByCountry[country] = [];
      }
      hotelsByCountry[country].push(hotel);
    });
    
    console.log(`✅ Found ${hotels.length} hotels across ${Object.keys(hotelsByCountry).length} countries`);
    
    res.json({
      success: true,
      data: hotelsByCountry
    });
  } catch (error) {
    console.error('Error loading hotels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load hotels',
      error: error.message
    });
  }
});

// Get hotels by country
router.get('/country/:country', async (req, res) => {
  try {
    const { country } = req.params;
    console.log(`🏨 Loading hotels for country: ${country}`);
    
    const hotels = await Hotel.find({ 
      'location.country': country,
      status: 'active' 
    }).lean();
    
    console.log(`✅ Found ${hotels.length} hotels in ${country}`);
    
    res.json({
      success: true,
      data: hotels,
      count: hotels.length
    });
  } catch (error) {
    console.error('Error loading hotels for country:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load hotels for country',
      error: error.message
    });
  }
});

// Get hotels by destination (for frontend compatibility)
router.get('/destination/:destination', async (req, res) => {
  try {
    const { destination } = req.params;
    console.log(`🏨 Loading hotels for destination: ${destination}`);
    
    // Search by country or city
    const hotels = await Hotel.find({ 
      $or: [
        { 'location.country': destination },
        { 'location.city': destination }
      ],
      status: 'active' 
    }).lean();
    
    console.log(`✅ Found ${hotels.length} hotels for destination ${destination}`);
    
    res.json(hotels); // Return array directly for frontend compatibility
  } catch (error) {
    console.error('Error loading hotels by destination:', error);
    res.status(500).json([]);
  }
});

// Get specific hotel by ID
router.get('/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    console.log(`🏨 Loading hotel by ID: ${hotelId}`);
    
    const hotel = await Hotel.findById(hotelId).lean();
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }
    
    console.log(`✅ Found hotel: ${hotel.name}`);
    
    res.json({
      success: true,
      data: hotel
    });
  } catch (error) {
    console.error('Error loading hotel by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load hotel',
      error: error.message
    });
  }
});

module.exports = router;