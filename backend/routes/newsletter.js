const express = require('express');
const router = express.Router();
const NewsletterSubscription = require('../models/NewsletterSubscription');

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 3; // Max 3 subscriptions per IP per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  
  // Remove old requests outside the time window
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Subscribe to newsletter (public endpoint)
router.post('/subscribe', async (req, res) => {
  try {
    const { email, source = 'footer' } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Too many subscription requests. Please try again later.'
      });
    }

    // Check if email already exists
    const existing = await NewsletterSubscription.findOne({ email });
    
    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Reactivate if previously unsubscribed
        await existing.reactivate();
        return res.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.',
          data: { email: existing.email, status: existing.status }
        });
      } else {
        return res.status(409).json({
          success: false,
          message: 'This email is already subscribed to our newsletter.'
        });
      }
    }

    // Create new subscription
    const subscription = new NewsletterSubscription({
      email,
      source,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      subscribedFrom: req.get('Referer')
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter! You will receive updates about our latest tours and promotions.',
      data: {
        email: subscription.email,
        status: subscription.status,
        subscribedAt: subscription.subscribedAt
      }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This email is already subscribed.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: error.message
    });
  }
});

// Unsubscribe from newsletter (public endpoint)
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const subscription = await NewsletterSubscription.findOne({ email });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our subscription list.'
      });
    }

    await subscription.unsubscribe();

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter.',
      data: { email: subscription.email, status: subscription.status }
    });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all subscriptions (admin only)
router.get('/admin/subscriptions', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status = 'all', 
      search = '',
      sortBy = 'subscribedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [subscriptions, total] = await Promise.all([
      NewsletterSubscription.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'fullName username'),
      NewsletterSubscription.countDocuments(query)
    ]);

    // Get stats
    const stats = await NewsletterSubscription.getSubscriberStats();

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        stats
      }
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update subscription status (admin only)
router.patch('/admin/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, preferences } = req.body;

    const subscription = await NewsletterSubscription.findById(id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (status) {
      subscription.status = status;
      if (status === 'unsubscribed') {
        subscription.unsubscribedAt = new Date();
      } else if (subscription.status === 'unsubscribed' && status !== 'unsubscribed') {
        subscription.unsubscribedAt = undefined;
      }
    }

    if (preferences) {
      subscription.preferences = { ...subscription.preferences, ...preferences };
    }

    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete subscription (admin only)
router.delete('/admin/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await NewsletterSubscription.findByIdAndDelete(id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription deleted successfully',
      data: { deletedEmail: subscription.email }
    });

  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Bulk operations (admin only)
router.post('/admin/bulk-action', async (req, res) => {
  try {
    const { action, emails, status } = req.body;

    if (!action || !emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format'
      });
    }

    let result;
    
    switch (action) {
      case 'update_status':
        if (!status) {
          return res.status(400).json({
            success: false,
            message: 'Status is required for update_status action'
          });
        }
        
        result = await NewsletterSubscription.updateMany(
          { email: { $in: emails } },
          { 
            status,
            ...(status === 'unsubscribed' ? { unsubscribedAt: new Date() } : { $unset: { unsubscribedAt: 1 } })
          }
        );
        break;
        
      case 'delete':
        result = await NewsletterSubscription.deleteMany({ email: { $in: emails } });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        modifiedCount: result.modifiedCount || result.deletedCount,
        emails: emails
      }
    });

  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Export active subscribers list (admin only)
router.get('/admin/export', async (req, res) => {
  try {
    const { format = 'json', status = 'active' } = req.query;
    
    const query = status === 'all' ? {} : { status };
    const subscriptions = await NewsletterSubscription.find(query)
      .select('email status subscribedAt source')
      .sort({ subscribedAt: -1 });

    if (format === 'csv') {
      const csv = [
        'Email,Status,Subscribed At,Source',
        ...subscriptions.map(sub => 
          `${sub.email},${sub.status},${sub.subscribedAt.toISOString()},${sub.source}`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="newsletter_subscribers.csv"');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        subscribers: subscriptions,
        exportedAt: new Date(),
        count: subscriptions.length
      }
    });

  } catch (error) {
    console.error('Export subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
