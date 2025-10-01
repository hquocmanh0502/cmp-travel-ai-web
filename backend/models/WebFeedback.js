const mongoose = require('mongoose');

const webFeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Feedback content
  type: { 
    type: String, 
    required: true,
    enum: ['bug_report', 'feature_request', 'general_feedback', 'ui_ux', 'performance', 'content_issue']
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  content: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    stepsToReproduce: String, // for bug reports
    expectedBehavior: String,
    actualBehavior: String,
    screenshots: [String],
    attachments: [String]
  },
  
  // Context information
  context: {
    page: String, // URL where feedback was submitted
    userAgent: String,
    screenResolution: String,
    browser: String,
    device: { type: String, enum: ['desktop', 'tablet', 'mobile'] },
    sessionId: String
  },
  
  // Contact info (for anonymous feedback)
  contactInfo: {
    email: String,
    phone: String,
    preferredContact: { type: String, enum: ['email', 'phone', 'none'] }
  },
  
  // Processing
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed', 'duplicate'],
    default: 'new'
  },
  
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  
  // Response
  adminResponse: {
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    response: String,
    respondedAt: Date,
    internalNotes: String
  },
  
  // Tracking
  resolution: {
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: String,
    userSatisfaction: { type: Number, min: 1, max: 5 }
  },
  
  // Analytics
  analytics: {
    responseTime: Number, // hours
    resolutionTime: Number, // hours
    reopened: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false }
  },
  
  // AI Analysis
  aiAnalysis: {
    category: String, // auto-categorized
    sentiment: String, // positive, negative, neutral
    urgency: Number, // 0-1 scale
    similarIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WebFeedback' }]
  },
  
  tags: [String], // custom tags for organization
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
webFeedbackSchema.index({ type: 1, status: 1 });
webFeedbackSchema.index({ userId: 1 });
webFeedbackSchema.index({ createdAt: -1 });
webFeedbackSchema.index({ severity: 1, priority: 1 });

webFeedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WebFeedback', webFeedbackSchema);