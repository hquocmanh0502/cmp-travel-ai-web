// backend/routes/smart-tour.js
//
// POST /api/smart-tour/plan  - SmartTour Level A + B (xem services/smartTourService.js)
// Cong khai: khach chua dang nhap cung len ke hoach duoc, chi can dang nhap khi dat.

const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const { planTrip } = require('../services/smartTourService');
const { SMARTTOUR_INTERESTS, AUDIENCES } = require('../config/travel-vocabulary');

// Tu vung cho form - frontend lay tu day de khong lech voi backend.
// tours: cho o "Must include" (chon tour bat buoc).
router.get('/options', async (req, res) => {
  try {
    const tours = await Tour.find({ status: { $ne: 'inactive' } }, { name: 1, country: 1, durationDays: 1 })
      .sort({ country: 1, name: 1 }).lean();
    res.json({
      success: true,
      interests: SMARTTOUR_INTERESTS,
      travelParties: AUDIENCES,
      tours: tours.map(t => ({ id: String(t._id), name: t.name, country: t.country, durationDays: t.durationDays }))
    });
  } catch (err) {
    console.error('SmartTour options error:', err);
    res.status(500).json({ success: false, message: 'Could not load options' });
  }
});

router.post('/plan', async (req, res) => {
  try {
    const result = await planTrip(req.body || {});
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    console.error('SmartTour error:', err);
    res.status(500).json({ success: false, message: 'Could not build a plan right now' });
  }
});

module.exports = router;
