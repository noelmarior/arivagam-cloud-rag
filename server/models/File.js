const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, required: true }, // 'pdf', 'txt'
  s3Url: { type: String }, // Optional for now, store local or S3 later
  summary: { type: String }, // AI Generated
  content: { type: String, required: true }, // Extracted text
  pineconeId: { type: String, required: true }, // Link to Vector DB
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', FileSchema);