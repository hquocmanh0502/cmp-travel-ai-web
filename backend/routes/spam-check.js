const express = require('express');
const router = express.Router();
const RealTimeSpamFilter = require('../middleware/realTimeSpamFilter');

// POST /api/spam-check - Check if content is spam/toxic before submission
router.post('/', async (req, res) => {
  try {
    const { text, userId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }

    console.log('🔍 Checking content for spam/toxic:', text.substring(0, 50) + '...');

    // Use existing spam filter to analyze content
    const filterResult = await RealTimeSpamFilter.filterReply(
      text.trim(),
      userId || 'anonymous',
      'temp-comment-id', // temporary ID for checking
      'temp-review-id'   // temporary ID for checking
    );

    console.log('📊 Spam check result:', {
      isSpam: filterResult.detection?.isSpam,
      isToxic: filterResult.detection?.isToxic,
      confidence: filterResult.detection?.confidence,
      reasons: filterResult.detection?.reasons
    });

    // Determine if content should be flagged
    const isProblematic = filterResult.detection?.isSpam || filterResult.detection?.isToxic;
    const confidence = filterResult.detection?.confidence || 0;
    const reasons = filterResult.detection?.reasons || [];

    // Create warning message based on detection
    let warningMessage = '';
    let warningType = '';

    if (filterResult.detection?.isSpam && filterResult.detection?.isToxic) {
      warningType = 'spam_toxic';
      warningMessage = 'This content appears to contain both spam and toxic language. Are you sure you want to post this? It will be flagged for admin review.';
    } else if (filterResult.detection?.isSpam) {
      warningType = 'spam';
      warningMessage = 'This content appears to be spam or promotional. Are you sure you want to post this? It will be flagged for admin review.';
    } else if (filterResult.detection?.isToxic) {
      warningType = 'toxic';
      warningMessage = 'This content appears to contain inappropriate or harmful language. Are you sure you want to post this? It will be flagged for admin review.';
    }

    res.json({
      success: true,
      isProblematic,
      warningType,
      warningMessage,
      confidence: Math.round(confidence * 100),
      reasons,
      detection: {
        isSpam: filterResult.detection?.isSpam || false,
        isToxic: filterResult.detection?.isToxic || false,
        confidence
      }
    });

  } catch (error) {
    console.error('❌ Error checking spam:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check content',
      details: error.message
    });
  }
});

module.exports = router;