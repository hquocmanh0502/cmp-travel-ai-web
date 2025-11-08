const mongoose = require('mongoose');

const newsletterSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'unsubscribed'],
    default: 'active'
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  },
  source: {
    type: String,
    default: 'footer'
  },
  // User info if they're registered
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Additional info for analytics
  ipAddress: String,
  userAgent: String,
  subscribedFrom: String, // URL where they subscribed
  
  // Email preferences
  preferences: {
    promotions: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
    updates: { type: Boolean, default: true }
  },
  
  // Campaign tracking
  campaigns: [{
    campaignId: String,
    sentAt: Date,
    opened: { type: Boolean, default: false },
    openedAt: Date,
    clicked: { type: Boolean, default: false },
    clickedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for better performance
newsletterSubscriptionSchema.index({ email: 1, status: 1 });
newsletterSubscriptionSchema.index({ subscribedAt: -1 });
newsletterSubscriptionSchema.index({ status: 1, subscribedAt: -1 });

// Instance methods
newsletterSubscriptionSchema.methods.unsubscribe = function() {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  return this.save();
};

newsletterSubscriptionSchema.methods.reactivate = function() {
  this.status = 'active';
  this.unsubscribedAt = undefined;
  return this.save();
};

// Static methods
newsletterSubscriptionSchema.statics.getActiveSubscribers = function() {
  return this.find({ status: 'active' });
};

newsletterSubscriptionSchema.statics.getSubscriberStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    active: 0,
    inactive: 0,
    unsubscribed: 0
  };
  
  stats.forEach(stat => {
    result.total += stat.count;
    result[stat._id] = stat.count;
  });
  
  return result;
};

module.exports = mongoose.model('NewsletterSubscription', newsletterSubscriptionSchema);