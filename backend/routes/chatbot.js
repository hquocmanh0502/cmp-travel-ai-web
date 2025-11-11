const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const router = express.Router();

// Enable CORS for chatbot routes
router.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8502'],
    credentials: true
}));

/**
 * @route POST /api/chatbot/message
 * @desc Send message to RAG chatbot and get response
 * @access Public
 */
router.post('/message', async (req, res) => {
    try {
        const { message, sessionId, userId, context } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Message is required'
            });
        }

        // For now, return a mock response
        // In production, this would interface with your Python RAG chatbot
        const mockResponse = {
            message: generateMockResponse(message),
            intent: detectIntent(message),
            suggestions: generateSuggestions(message),
            sessionId: sessionId || `session_${Date.now()}`,
            context: context || {}
        };

        res.json(mockResponse);

    } catch (error) {
        console.error('Chatbot API error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Sorry, I encountered an error. Please try again.'
        });
    }
});

/**
 * @route GET /api/chatbot/status
 * @desc Check chatbot service status
 * @access Public
 */
router.get('/status', (req, res) => {
    res.json({
        status: 'active',
        service: 'CMP Travel RAG Chatbot',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * @route POST /api/chatbot/feedback
 * @desc Submit feedback for chatbot response
 * @access Public
 */
router.post('/feedback', async (req, res) => {
    try {
        const { sessionId, messageId, rating, feedback } = req.body;

        // Store feedback in database (implement based on your DB structure)
        // For now, just log it
        console.log('Chatbot feedback received:', {
            sessionId,
            messageId,
            rating,
            feedback,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Thank you for your feedback!'
        });

    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({
            error: 'Failed to submit feedback'
        });
    }
});

// Helper functions
function detectIntent(message) {
    const lower = message.toLowerCase();
    
    if (/(book|booking|reserve|buy)/i.test(lower)) {
        return 'booking_intent';
    } else if (/(tour|trip|travel|destination)/i.test(lower)) {
        return 'tour_inquiry';
    } else if (/(hotel|accommodation|stay|room)/i.test(lower)) {
        return 'hotel_inquiry';
    } else if (/(price|cost|budget|cheap|expensive)/i.test(lower)) {
        return 'price_inquiry';
    } else if (/(hello|hi|hey|greet)/i.test(lower)) {
        return 'greeting';
    } else {
        return 'general';
    }
}

function generateMockResponse(message) {
    const intent = detectIntent(message);
    
    switch (intent) {
        case 'greeting':
            return "🌟 Hello! Welcome to CMP Travel! I'm your AI Travel Assistant. I can help you find amazing tours, recommend hotels, check prices, and plan your perfect trip. What destination interests you? ✈️";
        
        case 'tour_inquiry':
            return "🗺️ Great! I'd love to help you find the perfect tour. We have amazing destinations worldwide including:\n\n🇫🇷 **France Tours** - From €1,200 | 7 days\n🇯🇵 **Japan Adventures** - From $2,500 | 10 days\n🇹🇭 **Thailand Explorer** - From $1,800 | 8 days\n\nWhich region interests you most? I can provide detailed information about specific tours! 🌍";
        
        case 'hotel_inquiry':
            return "🏨 Excellent! We have partnerships with premium hotels worldwide. Here are some popular options:\n\n⭐ **Luxury Hotels** - 5-star properties from $200/night\n🏢 **Business Hotels** - 4-star comfort from $120/night\n🏖️ **Resort Hotels** - All-inclusive from $180/night\n\nWhat's your preferred location and budget? I can recommend the perfect accommodation! 🛏️";
        
        case 'price_inquiry':
            return "💰 I'd be happy to help with pricing information! Our tours typically range:\n\n🌟 **Budget Tours**: $800 - $1,500\n✨ **Standard Tours**: $1,500 - $3,000\n💎 **Luxury Tours**: $3,000 - $8,000\n\nPrices include accommodation, guided tours, and most meals. What's your budget range? I can find options that fit perfectly! 💳";
        
        case 'booking_intent':
            return "🎫 Wonderful! I can help you with the booking process. Here's how it works:\n\n1️⃣ **Select** your preferred tour/hotel\n2️⃣ **Choose** dates and options\n3️⃣ **Secure** payment (multiple methods available)\n4️⃣ **Receive** confirmation & travel documents\n\nWhich tour or hotel caught your interest? I'll guide you through the booking! 📋";
        
        default:
            return "🤔 I understand you're interested in travel! I specialize in:\n\n✈️ **Tour recommendations** - Find your perfect adventure\n🏨 **Hotel bookings** - Comfortable stays worldwide\n💰 **Price comparisons** - Best value for your budget\n📅 **Travel planning** - Complete itinerary assistance\n\nWhat would you like to explore today? 🌟";
    }
}

function generateSuggestions(message) {
    const intent = detectIntent(message);
    
    const suggestionMap = {
        'greeting': [
            'Show me popular tours',
            'Find hotels in Paris',
            'What are your best deals?',
            'Plan a 10-day trip'
        ],
        'tour_inquiry': [
            'Tours under $2000',
            'Luxury European tours',
            'Adventure tours',
            'Family-friendly tours'
        ],
        'hotel_inquiry': [
            '5-star hotels in Tokyo',
            'Budget hotels in Rome',
            'Beach resorts in Thailand',
            'Business hotels in NYC'
        ],
        'price_inquiry': [
            'Budget tours under $1500',
            'Luxury tour packages',
            'Group discounts',
            'Early booking deals'
        ],
        'booking_intent': [
            'Check availability',
            'Payment options',
            'Cancellation policy',
            'Travel insurance'
        ],
        'general': [
            'Popular destinations',
            'Travel tips',
            'Customer reviews',
            'Contact support'
        ]
    };

    return suggestionMap[intent] || suggestionMap['general'];
}

module.exports = router;