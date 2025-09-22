// backend/models/ChatConversation.js
const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  messages: [{
    sender: { type: String, enum: ['user', 'bot'], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    intent: String,
    entities: Object
  }],
  
  isResolved: { type: Boolean, default: false },
  satisfaction: { type: Number, min: 1, max: 5 },
  
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatConversation', chatConversationSchema);