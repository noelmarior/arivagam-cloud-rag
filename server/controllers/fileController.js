const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const File = require('../models/File');
const Folder = require('../models/Folder');
const aiService = require('../services/aiService');
const vectorService = require('../services/vectorService');
const { v4: uuidv4 } = require('uuid');
const pdf = require('pdf-extraction');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const Tesseract = require('tesseract.js');
const axios = require('axios');

// ✅ FIX 1: Import Cloudinary
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (Safe to call multiple times)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const chunkText = (text, size = 1000) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
};

const extractText = async (file) => {
  const mimeType = file.mimetype;
  let fileBuffer = file.buffer;

  // 1. Unified Buffer Loader
  if (!fileBuffer) {
    if (file.path.startsWith('http')) {
      try {
        console.log(`☁️ Fetching buffer from Cloudinary: ${file.path}`);
        const response = await axios.get(file.path, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        fileBuffer = Buffer.from(response.data);
      } catch (err) {
        throw new Error(`Failed to download file from Cloud: ${err.message}`);
      }
    } else {
      fileBuffer = fs.readFileSync(file.path);
    }
  }

  // Strategy 1: Plain Text
  if (mimeType === 'text/plain') {
    return fileBuffer.toString('utf8');
  }

  // Strategy 2: PDF
  if (mimeType === 'application/pdf') {
    try {
      if (!fileBuffer || fileBuffer.length === 0) throw new Error("PDF buffer is empty");
      const data = await pdf(fileBuffer);
      const text = data.text ? data.text.trim() : "";
      if (text.length < 10) throw new Error("PDF text is empty. This might be a scanned image.");
      return text;
    } catch (error) {
      console.error("PDF Parsing Error:", error.message);
      throw new Error(error.message || "Failed to parse PDF.");
    }
  }

  // Strategy 3: Images (OCR)
  if (mimeType.startsWith('image/')) {
    try {
      const result = await Tesseract.recognize(fileBuffer, 'eng');
      return result.data.text.trim();
    } catch (error) {
      console.error("OCR Error:", error.message);
      throw new Error("Failed to extract text from image.");
    }
  }

  // Strategy 4: DOCX
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value.trim();
    } catch (error) {
      console.error("DOCX Error:", error.message);
      throw new Error("Failed to extract text from DOCX.");
    }
  }

  // Strategy 5: XLSX
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      let text = "";
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        text += `Sheet: ${sheetName}\n`;
        text += xlsx.utils.sheet_to_csv(sheet);
        text += "\n\n";
      });
      return text.trim();
    } catch (error) {
      console.error("XLSX Error:", error.message);
      throw new Error("Failed to extract text from Excel file.");
    }
  }

  throw new Error('Unsupported file type. Allowed: .txt, .pdf, .docx, .xlsx, images');
};

// 1. Upload File
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log("Full Request Body:", req.body);
    const sessionId = req.body.sessionId || req.query.sessionId;
    let { folderId } = req.body;
    if (!folderId || folderId === 'root' || folderId === 'null') folderId = null;

    console.log(`📄 Processing: ${req.file.originalname} (${req.file.mimetype}) for Session: ${sessionId}`);
    console.log(`🔗 Cloudinary URL: ${req.file.path}`);

    const content = await extractText(req.file);

    if (!content || content.trim().length === 0) {
      throw new Error("Extracted text is empty. Cannot process empty file.");
    }
    console.log(`✅ Extracted ${content.length} characters.`);

    let summary = "";
    try {
      summary = await aiService.generateSummary(content);
    } catch (aiError) {
      console.warn("Summary generation failed:", aiError.message);
      summary = "Summary unavailable.";
    }

    const fileId = new mongoose.Types.ObjectId();
    const newFile = new File({
      _id: fileId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size,
      content,
      summary,
      userId: req.auth.userId,
      folderId,
      originalPath: req.file.path,
      viewablePath: req.file.path,
      publicId: req.file.filename,
      pineconeId: fileId.toString(),
      sessionId: sessionId || null
    });

    const chunks = chunkText(content, 1000);
    const vectorsToUpsert = [];

    console.log(`🧩 Chunking content into ${chunks.length} parts...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await aiService.generateEmbedding(chunk);
        if (embedding && embedding.length > 0 && !embedding.every(n => n === 0)) {
          vectorsToUpsert.push({
            id: `${fileId}_${i}`,
            values: embedding,
            metadata: {
              text: chunk,
              fileId: fileId.toString(),
              sessionId: sessionId,
              fileName: req.file.originalname,
              chunkIndex: i,
              userId: req.auth.userId,
              folderId: folderId || ""
            }
          });
        }
      } catch (e) {
        console.error(`❌ Failed to embed chunk ${i}:`, e.message);
      }
    }

    if (vectorsToUpsert.length > 0) {
      await vectorService.upsertBatch(vectorsToUpsert);
      console.log(`✅ Successfully upserted ${vectorsToUpsert.length} vector chunks.`);
    } else {
      console.warn("⚠️ No valid vectors generated. Skipping Pinecone upsert.");
    }

    await newFile.save();
    console.log("✅ File saved to MongoDB.");
    res.status(200).json({ message: 'File processed', file: newFile });

  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Files
exports.getAllFiles = async (req, res) => {
  try {
    const files = await File.find({ userId: req.auth.userId })
      .select('fileName summary createdAt fileType originalPath viewablePath');
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get Single File
exports.getFileById = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.auth.userId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Delete File (CLOUD UPDATED) ☁️
// ✅ FIX 2: Changed 'const deleteFile' to 'exports.deleteFile' so Router can find it
exports.deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.auth.userId;

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    console.log(`🗑️ Requesting delete for: ${file.fileName}`);

    // 1. Determine Resource Type
    const resourceType = file.fileType.startsWith('image/') ? 'image' : 'raw';

    // 2. Resolve Public ID (The Fix)
    let publicId = file.publicId;

    // 🚨 FALLBACK: If publicId is missing in DB, extract it from the URL
    if (!publicId && file.originalPath) {
      console.warn("⚠️ Missing Public ID in DB. Attempting to extract from URL...");
      try {
        // Example URL: .../upload/v123456/arivagam_uploads/File-Name.pdf
        const urlParts = file.originalPath.split('/');
        // Find the part that looks like a version (v123...)
        const versionIndex = urlParts.findIndex(part => part.startsWith('v') && !isNaN(Number(part.substring(1))));

        if (versionIndex !== -1) {
          // The ID is everything AFTER the version
          let extractedId = urlParts.slice(versionIndex + 1).join('/');

          // Remove file extension (Cloudinary IDs usually don't have them, but URLs do)
          // Note: For Raw files, sometimes we need to keep checking.
          // We try stripping the extension first as that's the standard naming convention we used.
          if (extractedId.lastIndexOf('.') > -1) {
            extractedId = extractedId.substring(0, extractedId.lastIndexOf('.'));
          }
          publicId = extractedId;
          console.log(`🔍 Extracted ID from URL: ${publicId}`);
        }
      } catch (err) {
        console.error("❌ Failed to extract ID from URL:", err);
      }
    }

    // 3. DELETE FROM CLOUDINARY
    if (publicId) {
      try {
        console.log(`☁️ Deleting from Cloudinary (${resourceType}): ${publicId}`);
        const cloudResult = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
          invalidate: true
        });
        console.log("☁️ Cloudinary Response:", cloudResult);
      } catch (cloudErr) {
        console.error("⚠️ Failed to delete from Cloudinary:", cloudErr.message);
      }
    } else {
      console.error("❌ Could not determine Public ID. Cloud file orphan created.");
    }

    // 4. DELETE VECTORS (Connected)
    try {
      // We pass 'fileId' because your vectorService queries by metadata: { fileId: { $eq: fileId } }
      // Note: ensure vectorService is imported at the top of this file!
      await vectorService.deleteVector(fileId);
      console.log("✅ Pinecone vectors cleanup initiated.");
    } catch (vecErr) {
      console.error("⚠️ Pinecone cleanup warning:", vecErr.message);
      // We do NOT throw error here, so DB delete proceeds even if Pinecone fails
    }

    // 5. DELETE FROM DB
    await File.deleteOne({ _id: fileId });
    console.log("✅ Database record deleted.");

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error("❌ Delete Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 5. Search Files
exports.searchFiles = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.auth.userId;

    if (!query || !query.trim()) {
      return res.json({ files: [], folders: [] });
    }

    const files = await File.find({
      userId,
      fileName: { $regex: query, $options: 'i' }
    }).select('fileName fileType size createdAt folderId');

    const folders = require('../models/Folder').find({
      userId,
      name: { $regex: query, $options: 'i' }
    }).select('name createdAt parentId');

    const [foundFiles, foundFolders] = await Promise.all([files, folders]);

    res.json({ files: foundFiles, folders: foundFolders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Update File
exports.updateFile = async (req, res) => {
  try {
    const updates = {};
    if (req.body.fileName) updates.fileName = req.body.fileName;
    if (req.body.folderId !== undefined) {
      updates.folderId = req.body.folderId === 'root' ? null : req.body.folderId;
    }

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      { $set: updates },
      { new: true }
    );

    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};