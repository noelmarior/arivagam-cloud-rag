const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, required: true }, // e.g., 'application/pdf'
  filePath: { type: String, required: true }, // Path on disk
  size: { type: Number }, // Size in bytes

  // --- CONTENT & AI ---
  content: { type: String }, // Extracted text
  summary: { type: String }, // AI Summary
  pineconeId: { type: String }, // Link to Vector DB

  // --- RELATIONSHIPS ---
  userId: { type: String, required: true, index: true },
  
  // CRITICAL FIX: Added "ref: 'Folder'" so we can get the folder name later
  folderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder', 
    default: null 
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', FileSchema);