const mongoose = require('mongoose');

const replyClassificationSchema = new mongoose.Schema({
    // Basic Reply Information
    replyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment', // Assuming replies are stored in Comment model
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Made optional since some replies might not have direct userId
        index: true
    },
    tourId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: false, // Made optional for flexibility
        index: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },

    // AI Classification Results
    classification: {
        isSpam: {
            type: Boolean,
            required: true,
            default: false,
            index: true
        },
        label: {
            type: String,
            required: true,
            enum: ['spam', 'ham', 'error'],
            default: 'ham'
        },
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
            default: 0
        },
        scores: [{
            label: String,
            score: Number
        }],
        modelUsed: {
            type: String,
            required: true,
            default: 'bert-tiny-finetuned-sms-spam-detection'
        },
        processedAt: {
            type: Date,
            default: Date.now
        },
        fallback: {
            type: Boolean,
            default: false
        }
    },

    // Moderation Status
    moderation: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'flagged', 'auto-approved'],
            default: 'pending',
            index: true
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Admin user
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        adminNotes: {
            type: String,
            maxlength: 500,
            default: ''
        },
        autoModerated: {
            type: Boolean,
            default: false
        }
    },

    // Priority & Flags
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    flags: [{
        type: {
            type: String,
            enum: ['spam', 'inappropriate', 'fake', 'offensive', 'promotional'],
            required: true
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1
        },
        flaggedAt: {
            type: Date,
            default: Date.now
        },
        flaggedBy: {
            type: String,
            enum: ['ai', 'admin', 'user-report'],
            default: 'ai'
        }
    }],

    // Metadata
    metadata: {
        ipAddress: String,
        userAgent: String,
        replyLength: {
            type: Number,
            default: function() {
                return this.content ? this.content.length : 0;
            }
        },
        hasLinks: {
            type: Boolean,
            default: function() {
                return this.content ? /https?:\/\//.test(this.content) : false;
            }
        },
        hasEmails: {
            type: Boolean,
            default: function() {
                return this.content ? /\S+@\S+\.\S+/.test(this.content) : false;
            }
        },
        hasPhones: {
            type: Boolean,
            default: function() {
                return this.content ? /(\+\d{1,3}[- ]?)?\d{10,}/.test(this.content) : false;
            }
        }
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
replyClassificationSchema.index({ 'classification.isSpam': 1, 'moderation.status': 1 });
replyClassificationSchema.index({ 'classification.confidence': -1 });
replyClassificationSchema.index({ createdAt: -1 });
replyClassificationSchema.index({ priority: 1, 'moderation.status': 1 });

// Virtual properties
replyClassificationSchema.virtual('riskScore').get(function() {
    let risk = 0;
    
    // Spam confidence
    if (this.classification.isSpam) {
        risk += this.classification.confidence * 40;
    }
    
    // Flags
    risk += this.flags.length * 15;
    
    // Suspicious metadata
    if (this.metadata.hasLinks) risk += 10;
    if (this.metadata.hasEmails) risk += 15;
    if (this.metadata.hasPhones) risk += 20;
    
    // Very short or very long content
    if (this.metadata.replyLength < 10 || this.metadata.replyLength > 1000) {
        risk += 10;
    }
    
    return Math.min(risk, 100);
});

replyClassificationSchema.virtual('needsReview').get(function() {
    return this.classification.isSpam && 
           this.classification.confidence > 0.7 && 
           this.moderation.status === 'pending';
});

// Static methods
replyClassificationSchema.statics.getSpamStatistics = async function(dateRange = {}) {
    const matchStage = {};
    
    if (dateRange.start && dateRange.end) {
        matchStage.createdAt = {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
        };
    }
    
    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                spam: { $sum: { $cond: ['$classification.isSpam', 1, 0] } },
                avgConfidence: { $avg: '$classification.confidence' },
                pending: { $sum: { $cond: [{ $eq: ['$moderation.status', 'pending'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$moderation.status', 'approved'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$moderation.status', 'rejected'] }, 1, 0] } }
            }
        }
    ]);
    
    return stats[0] || {
        total: 0, spam: 0, avgConfidence: 0,
        pending: 0, approved: 0, rejected: 0
    };
};

replyClassificationSchema.statics.getPendingReviews = function(limit = 50) {
    return this.find({
        'moderation.status': 'pending',
        $or: [
            { 'classification.isSpam': true },
            { 'classification.confidence': { $lt: 0.5 } },
            { flags: { $exists: true, $not: { $size: 0 } } }
        ]
    })
    .populate('userId', 'name email')
    .populate('tourId', 'name country')
    .sort({ 'classification.confidence': -1, createdAt: -1 })
    .limit(limit);
};

// Instance methods
replyClassificationSchema.methods.approve = function(adminId, notes = '') {
    this.moderation.status = 'approved';
    this.moderation.reviewedBy = adminId;
    this.moderation.reviewedAt = new Date();
    this.moderation.adminNotes = notes;
    return this.save();
};

replyClassificationSchema.methods.reject = function(adminId, notes = '') {
    this.moderation.status = 'rejected';
    this.moderation.reviewedBy = adminId;
    this.moderation.reviewedAt = new Date();
    this.moderation.adminNotes = notes;
    return this.save();
};

replyClassificationSchema.methods.addFlag = function(type, confidence = 1, flaggedBy = 'ai') {
    this.flags.push({
        type,
        confidence,
        flaggedBy,
        flaggedAt: new Date()
    });
    
    // Auto-update priority based on flags
    if (this.flags.length >= 3) {
        this.priority = 'urgent';
    } else if (this.flags.length >= 2) {
        this.priority = 'high';
    }
    
    return this.save();
};

// Pre-save middleware
replyClassificationSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Auto-set priority based on classification
    if (this.classification.isSpam && this.classification.confidence > 0.8) {
        this.priority = 'high';
    }
    
    // Auto-moderate obvious spam
    if (this.classification.isSpam && 
        this.classification.confidence > 0.9 && 
        !this.classification.fallback) {
        this.moderation.status = 'rejected';
        this.moderation.autoModerated = true;
    }
    
    // Auto-approve obvious ham
    if (!this.classification.isSpam && 
        this.classification.confidence > 0.9 && 
        this.flags.length === 0) {
        this.moderation.status = 'auto-approved';
        this.moderation.autoModerated = true;
    }
    
    next();
});

const ReplyClassification = mongoose.model('ReplyClassification', replyClassificationSchema);

module.exports = ReplyClassification;