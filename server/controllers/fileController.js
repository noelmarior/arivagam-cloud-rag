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

const chunkTextWithQuota = (text, maxChunkSize = 1000) => {
  const charsPerToken = 4;
  const tokenLimit = 25000;
  const charLimit = tokenLimit * charsPerToken; // 100,000 chars safely

  let isTruncated = false;
  let textToProcess = text;

  if (text.length > charLimit) {
    textToProcess = text.substring(0, charLimit);
    isTruncated = true;
    console.warn(`[QUOTA] Text truncated at ${charLimit} chars. Original: ${text.length}`);
  }

  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < textToProcess.length) {
    let nextIndex = currentIndex + maxChunkSize;

    if (nextIndex < textToProcess.length) {
      let lastSpaceIndex = textToProcess.lastIndexOf(' ', nextIndex);
      if (lastSpaceIndex > currentIndex) {
        nextIndex = lastSpaceIndex;
      }
    }

    chunks.push(textToProcess.substring(currentIndex, nextIndex).trim());
    currentIndex = nextIndex + 1;
  }

  return { safeChunks: chunks, isTruncated };
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

// 1. Upload File (Async Background Pipeline)
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No file uploaded or missing memory buffer" });
    }

    const sessionId = req.body.sessionId || req.query.sessionId || null;
    let folderId = req.body.folderId === 'root' || req.body.folderId === 'null' ? null : req.body.folderId;

    // A. Text Extraction (Happens instantly via RAM buffer)
    const content = await extractText(req.file);

    if (!content || content.trim().length === 0) {
      throw new Error("Extracted text is empty. Cannot process.");
    }

    // B. Space-Aware Quota Chunker
    const { safeChunks, isTruncated } = chunkTextWithQuota(content, 1000);

    // C. Initial Database Save
    const fileId = new mongoose.Types.ObjectId();
    const newFile = new File({
      _id: fileId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size,
      userId: req.auth.userId,
      folderId,
      pineconeId: fileId.toString(),
      sessionId: sessionId,
      status: 'processing',
      isTruncated: isTruncated,
      errorMessage: null,
      originalPath: "processing", // Placeholder until Cloudinary finishes
      viewablePath: "processing"
    });

    await newFile.save();

    // D. Instant Client Release 
    res.status(202).json({
      message: 'File received and processing initiated',
      fileId: newFile._id,
      status: newFile.status,
      isTruncated: newFile.isTruncated
    });

    // =====================================================================
    // 3. BACKGROUND ASYNC PIPELINE
    // =====================================================================
    (async () => {
      let cloudinaryPublicId = null;

      try {
        console.log(`[BACKGROUND] Processing ${fileId}`);
        const textForSummarizer = safeChunks.join(" ");

        const uploadToCloudinary = () => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { resource_type: "auto", folder: "arivagam_uploads" },
              (error, result) => {
                if (error) reject(error);
                else {
                  cloudinaryPublicId = result.public_id;
                  resolve(result);
                }
              }
            );
            uploadStream.end(req.file.buffer);
          });
        };

        const results = await Promise.allSettled([
          uploadToCloudinary(),
          aiService.generateSummary(textForSummarizer),
          aiService.generateBatchEmbeddings(safeChunks)
        ]);

        const failedTasks = results.filter(r => r.status === 'rejected');
        if (failedTasks.length > 0) {
          throw new Error(failedTasks[0].reason?.message || "AI or Upload task failed");
        }

        const uploadedAsset = results[0].value;
        const summary = results[1].value;
        const embeddingsBatch = results[2].value;

        const vectorsToUpsert = [];
        for (let i = 0; i < embeddingsBatch.length; i++) {
          const embedding = embeddingsBatch[i];
          if (embedding && embedding.length > 0 && !embedding.every(n => n === 0)) {
            vectorsToUpsert.push({
              id: `${fileId}_${i}`,
              values: embedding,
              metadata: {
                text: safeChunks[i],
                fileId: fileId.toString(),
                sessionId: sessionId || "",
                fileName: req.file.originalname,
                chunkIndex: i,
                userId: req.auth.userId,
                folderId: folderId || ""
              }
            });
          }
        }

        if (vectorsToUpsert.length > 0) {
          await vectorService.upsertBatch(vectorsToUpsert);
          console.log(`✅ Upserted ${vectorsToUpsert.length} vectors for ${fileId}`);
        }

        await File.findByIdAndUpdate(fileId, {
          content: content,
          summary: summary,
          originalPath: uploadedAsset.secure_url,
          viewablePath: uploadedAsset.secure_url,
          publicId: uploadedAsset.public_id,
          status: 'completed'
        });

        console.log(`[BACKGROUND END] Success for ${fileId}`);

      } catch (backgroundError) {
        console.error(`[BACKGROUND FATAL] Process failed for ${fileId}:`, backgroundError.message);

        if (cloudinaryPublicId) {
          cloudinary.uploader.destroy(cloudinaryPublicId)
            .catch(e => console.error("Cloud cleanup failed:", e.message));
        }

        vectorService.deleteVector?.(fileId.toString())
          .catch(e => console.error("Pinecone cleanup failed:", e.message));

        File.findByIdAndUpdate(fileId, {
          status: 'failed',
          errorMessage: backgroundError.message
        }).catch(e => console.error("MongoDB status update failed:", e.message));
      }
    })();

  } catch (syncError) {
    console.error("❌ Blocking Upload Error:", syncError.message);
    res.status(500).json({ error: syncError.message });
  }
};

// 1.5 Get File Status (Polling endpoint)
exports.getFileStatus = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.auth.userId })
      .select('status errorMessage fileName isTruncated');
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Get All Files
exports.getAllFiles = async (req, res) => {
  try {
    const files = await File.find({ userId: req.auth.userId })
      .select('fileName summary createdAt fileType originalPath viewablePath status errorMessage');

    // --- AUTO-CORRECT STUCK PROCESSING FILES ---
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    for (let file of files) {
      if (file.status === 'processing' && file.createdAt < tenMinutesAgo) {
        file.status = file.summary ? 'completed' : 'failed';
        file.errorMessage = file.summary ? null : 'Processing timed out. Please delete and re-upload.';

        await File.updateOne(
          { _id: file._id },
          { $set: { status: file.status, errorMessage: file.errorMessage } }
        );
      }
    }
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