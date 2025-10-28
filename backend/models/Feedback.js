const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Allow anonymous feedback
  },
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: false
  },
  type: {
    type: String,
    enum: ['tour_review', 'general_feedback', 'bug_report', 'suggestion'],
    default: 'general_feedback'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: function() {
      return this.type === 'tour_review';
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'rejected', 'approved'],
    default: 'pending'
  },
  adminResponse: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ tourId: 1, rating: -1 });
feedbackSchema.index({ type: 1, status: 1 });
feedbackSchema.index({ isPublic: 1, isVerified: 1 });
feedbackSchema.index({ 'metadata.location.coordinates': '2dsphere' });

// Virtual for average rating per tour
feedbackSchema.virtual('isReview').get(function() {
  return this.type === 'tour_review';
});

// Virtual for comment (alias for content)
feedbackSchema.virtual('comment').get(function() {
  return this.content;
});

// Pre-save middleware
feedbackSchema.pre('save', function(next) {
  // Auto-verify feedback from verified users
  if (this.isNew && this.userId) {
    this.constructor.findOne({ userId: this.userId })
      .populate('userId', 'isVerified')
      .then(user => {
        if (user && user.userId && user.userId.isVerified) {
          this.isVerified = true;
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

// Static methods
feedbackSchema.statics.getAverageRating = function(tourId) {
  return this.aggregate([
    {
      $match: {
        tourId: mongoose.Types.ObjectId(tourId),
        type: 'tour_review',
        status: { $in: ['reviewed', 'resolved'] }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratings: {
          $push: '$rating'
        }
      }
    },
    {
      $project: {
        averageRating: { $round: ['$averageRating', 1] },
        totalReviews: 1,
        ratingDistribution: {
          5: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 5] }
              }
            }
          },
          4: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 4] }
              }
            }
          },
          3: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 3] }
              }
            }
          },
          2: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 2] }
              }
            }
          },
          1: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 1] }
              }
            }
          }
        }
      }
    }
  ]);
};

feedbackSchema.statics.getFeedbackStats = function(timeframe = 'month') {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status'
        },
        count: { $sum: 1 },
        averageRating: {
          $avg: {
            $cond: [
              { $eq: ['$type', 'tour_review'] },
              '$rating',
              null
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' },
        averageRating: { $first: '$averageRating' }
      }
    }
  ]);
};

// Instance methods
feedbackSchema.methods.markAsHelpful = function(userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count = this.helpful.users.length;
    return this.save();
  }
  return Promise.resolve(this);
};

feedbackSchema.methods.removeHelpful = function(userId) {
  const index = this.helpful.users.indexOf(userId);
  if (index > -1) {
    this.helpful.users.splice(index, 1);
    this.helpful.count = this.helpful.users.length;
    return this.save();
  }
  return Promise.resolve(this);
};

feedbackSchema.methods.addAdminResponse = function(content, adminId) {
  this.adminResponse = {
    content: content,
    respondedBy: adminId,
    respondedAt: new Date()
  };
  this.status = 'reviewed';
  return this.save();
};

// Export model
module.exports = mongoose.model('Feedback', feedbackSchema);