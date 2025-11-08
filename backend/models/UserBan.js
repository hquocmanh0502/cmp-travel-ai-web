const mongoose = require('mongoose');

const userBanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    banType: {
        type: String,
        enum: ['reply_ban', 'comment_ban', 'full_ban', 'shadow_ban'],
        required: true,
        default: 'reply_ban'
    },
    reason: {
        type: String,
        required: true,
        maxlength: 500
    },
    violations: [{
        violationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserViolation'
        },
        violationType: String,
        createdAt: Date
    }],
    severity: {
        type: String,
        enum: ['warning', 'temporary', 'permanent'],
        required: true,
        default: 'temporary'
    },
    duration: {
        type: Number, // Duration in hours
        required: function() {
            return this.severity === 'temporary';
        }
    },
    startDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    endDate: {
        type: Date,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    bannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Admin who issued the ban
        required: true
    },
    bannedByType: {
        type: String,
        enum: ['auto', 'manual'],
        default: 'auto'
    },
    appealStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    },
    appealReason: {
        type: String,
        maxlength: 1000
    },
    appealedAt: {
        type: Date
    },
    appealReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    appealReviewedAt: {
        type: Date
    },
    appealNotes: {
        type: String,
        maxlength: 500
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to calculate end date
userBanSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    if (this.severity === 'temporary' && this.duration && !this.endDate) {
        this.endDate = new Date(this.startDate.getTime() + (this.duration * 60 * 60 * 1000));
    } else if (this.severity === 'permanent') {
        this.endDate = null;
    }
    
    next();
});

// Instance method to check if ban is expired
userBanSchema.methods.isExpired = function() {
    if (this.severity === 'permanent') return false;
    if (!this.endDate) return false;
    return new Date() > this.endDate;
};

// Instance method to get remaining time
userBanSchema.methods.getRemainingTime = function() {
    if (this.severity === 'permanent') return 'Permanent';
    if (!this.endDate) return 'Unknown';
    
    const now = new Date();
    if (now > this.endDate) return 'Expired';
    
    const diff = this.endDate - now;
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        const days = Math.ceil(hours / 24);
        return `${days} day${days > 1 ? 's' : ''}`;
    }
};

// Index for efficient queries
userBanSchema.index({ userId: 1, isActive: 1 });
userBanSchema.index({ endDate: 1, isActive: 1 });
userBanSchema.index({ banType: 1, isActive: 1 });
userBanSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UserBan', userBanSchema);
