const mongoose = require('mongoose');

const StyleTemplateSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true }, // e.g., "Math Derivation"
  instruction: { type: String, required: true }, // e.g., "Show step-by-step formulas..."
  createdAt: { type: Date, default: Date.now }
});

// Prevent duplicate style names for the same user
StyleTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StyleTemplate', StyleTemplateSchema);