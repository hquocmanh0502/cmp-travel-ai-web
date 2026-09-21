// backend/routes/public-tour-guides.js
//
// Thông tin hướng dẫn viên mà khách hàng được xem (trang chi tiết tour).
//
// Tách riêng khỏi routes/tour-guides.js vì file đó nằm dưới /api/admin và nay đã
// yêu cầu quyền quản trị. Ở đây chỉ có GET, và chỉ trả những field công khai -
// email, số điện thoại, lương... của hướng dẫn viên không được lộ ra ngoài.

const express = require('express');
const router = express.Router();
const TourGuide = require('../models/TourGuide');
const GuideReview = require('../models/GuideReview');

// Danh sách field an toàn để hiển thị công khai.
const PUBLIC_FIELDS = 'name avatar bio specialties languages experience rating totalReviews status availability';

// GET /api/tour-guides - danh sách hướng dẫn viên đang hoạt động
router.get('/', async (req, res) => {
  try {
    const guides = await TourGuide.find({ status: 'active' })
      .select(PUBLIC_FIELDS)
      .sort({ rating: -1 });

    res.json({ success: true, data: guides, count: guides.length });
  } catch (error) {
    console.error('Error fetching public tour guides:', error);
    res.status(500).json({ success: false, error: 'Error fetching tour guides' });
  }
});

// GET /api/tour-guides/:id - chi tiết một hướng dẫn viên kèm đánh giá đã duyệt
router.get('/:id', async (req, res) => {
  try {
    const guide = await TourGuide.findById(req.params.id).select(PUBLIC_FIELDS);

    if (!guide) {
      return res.status(404).json({ success: false, error: 'Tour guide not found' });
    }

    const reviews = await GuideReview.find({
      guideId: req.params.id,
      status: 'approved'
    })
      .populate('userId', 'fullName')
      .populate('tourId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: { ...guide.toObject(), recentReviews: reviews }
    });
  } catch (error) {
    console.error('Error fetching public tour guide:', error);
    res.status(500).json({ success: false, error: 'Error fetching tour guide' });
  }
});

module.exports = router;
