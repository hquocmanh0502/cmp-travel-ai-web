const mongoose = require('mongoose');

const userViolationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    replyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        required: true,
        index: true
    },
    tourId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: true,
        index: true
    },
    violationType: {
        type: String,
        enum: ['spam', 'toxic', 'inappropriate', 'hate_speech', 'harassment'],
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
        default: 'medium'
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        required: true
    },
    aiClassificationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReplyClassification',
        required: false
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Admin who reviewed this violation
    },
    reviewStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'dismissed', 'appealed'],
        default: 'pending'
    },
    reviewNotes: {
        type: String,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    reviewedAt: {
        type: Date
    }
});

// Index for efficient queries
userViolationSchema.index({ userId: 1, createdAt: -1 });
userViolationSchema.index({ violationType: 1, createdAt: -1 });
userViolationSchema.index({ reviewStatus: 1, createdAt: -1 });

module.exports = mongoose.model('UserViolation', userViolationSchema);
