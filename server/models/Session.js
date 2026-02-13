const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  name: { type: String, default: "New Study Session" },
  userId: { type: String, required: true, index: true },
  
  sourceFiles: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'File' 
  }],
  
  aiTitle: { type: String },
  aiSummary: { type: String },
  messages: [MessageSchema],
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);