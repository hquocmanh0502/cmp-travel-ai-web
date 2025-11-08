const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'read', 'replied', 'resolved'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['general', 'booking', 'complaint', 'suggestion', 'technical', 'other'],
        default: 'general'
    },
    adminResponse: {
        type: String,
        trim: true
    },
    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    respondedAt: {
        type: Date
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for better performance
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ category: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });

module.exports = mongoose.model('Contact', contactSchema);