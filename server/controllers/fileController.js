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
const PDFDocument = require('pdfkit');

// Helper: Convert content to PDF
const convertToPdf = (content, originalPath, type) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const newFileName = `converted-${Date.now()}.pdf`;
      const newPath = path.join(path.dirname(originalPath), newFileName);
      const writeStream = fs.createWriteStream(newPath);

      doc.pipe(writeStream);

      // Add appropriate content based on type
      if (type === 'image') {
        try {
          // Fit image to page
          doc.image(originalPath, {
            fit: [500, 700],
            align: 'center',
            valign: 'center'
          });
        } catch (imgErr) {
          console.error("Image embed error:", imgErr);
          doc.text("Failed to embed image. Extracted text below:\n\n");
          doc.text(content || "No text extracted.");
        }
      } else {
        // Text-based content (TXT, DOCX, XLSX)
        // Add a title or metadata if needed, but keeping it simple for now
        doc.fontSize(12).text(content || "No text content extracted.", {
          align: 'left'
        });
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve(newPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (err) {
      reject(err);
    }
  });
};

// Helper: Extract text (RAM + Disk safe)
const extractText = async (file) => {
  const mimeType = file.mimetype;

  // Strategy 1: Plain Text
  if (mimeType === 'text/plain') {
    return file.buffer
      ? file.buffer.toString('utf8')
      : fs.readFileSync(file.path, 'utf8');
  }

  // Strategy 2: PDF (Universal Handler)
  if (mimeType === 'application/pdf') {
    try {
      const pdfBuffer = file.buffer
        ? file.buffer
        : fs.readFileSync(file.path);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("PDF buffer is empty");
      }

      const data = await pdf(pdfBuffer);
      const text = data.text ? data.text.trim() : "";

      if (text.length < 10) {
        throw new Error("PDF text is empty. This might be a scanned image.");
      }

      return text;
    } catch (error) {
      console.error("PDF Parsing Error:", error.message);
      throw new Error(error.message || "Failed to parse PDF.");
    }
  }

  // Strategy 3: Images (OCR)
  if (mimeType.startsWith('image/')) {
    try {
      const imageBuffer = file.buffer
        ? file.buffer
        : fs.readFileSync(file.path);

      const result = await Tesseract.recognize(imageBuffer, 'eng');
      return result.data.text.trim();
    } catch (error) {
      console.error("OCR Error:", error.message);
      throw new Error("Failed to extract text from image.");
    }
  }

  // Strategy 4: DOCX (Mammoth)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const buffer = file.buffer
        ? file.buffer
        : fs.readFileSync(file.path);

      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value.trim();
    } catch (error) {
      console.error("DOCX Error:", error.message);
      throw new Error("Failed to extract text from DOCX.");
    }
  }

  // Strategy 5: XLSX (SheetJS)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    try {
      const buffer = file.buffer
        ? file.buffer
        : fs.readFileSync(file.path);

      const workbook = xlsx.read(buffer, { type: 'buffer' });
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

// Helper: Convert Excel to HTML
const convertToHtml = (originalPath) => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.readFile(originalPath);
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { bg-color: #f2f2f2; }
            h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          </style>
        </head>
        <body>
      `;

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const htmlTable = xlsx.utils.sheet_to_html(sheet);
        if (htmlTable) {
          htmlContent += `<h2>${sheetName}</h2>`;
          htmlContent += htmlTable;
        }
      });

      htmlContent += '</body></html>';

      const newFileName = `converted-${Date.now()}.html`;
      const newPath = path.join(path.dirname(originalPath), newFileName);

      fs.writeFileSync(newPath, htmlContent);
      resolve(newPath);
    } catch (err) {
      reject(err);
    }
  });
};

// ... (existing convertToPdf function remains unchanged) ...

// Helper: Chunk text
const chunkText = (text, size = 1000) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
};

// 1. Upload File
exports.uploadFile = async (req, res) => {
  try {
    // 0. Guard
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1. Params
    console.log("Full Request Body:", req.body); // DEBUG LOG
    // Capture Session ID (Body or Query)
    const sessionId = req.body.sessionId || req.query.sessionId;

    // Validation Guard: REMOVED (Allow global uploads from Dashboard)
    // if (!sessionId) {
    //   return res.status(400).json({ error: "Session ID is required..." });
    // }

    let { folderId } = req.body;
    if (!folderId || folderId === 'root' || folderId === 'null') folderId = null;

    console.log(`📄 Processing: ${req.file.originalname} (${req.file.mimetype}) for Session: ${sessionId}`);

    // 2. Extract text (Original Content)
    const content = await extractText(req.file);
    // Explicit Check: Ensure text is not empty before proceeding
    if (!content || content.trim().length === 0) {
      throw new Error("Extracted text is empty. Cannot process empty file.");
    }

    console.log(`✅ Extracted ${content.length} characters.`);

    // 3. AI Summary
    let summary = "";
    try {
      summary = await aiService.generateSummary(content);
    } catch (aiError) {
      console.warn("Summary generation failed:", aiError.message);
      summary = "Summary unavailable.";
    }

    // 4. Conversion Logic (PDF or HTML)
    let finalFilePath = req.file.path;
    let finalMimeType = req.file.mimetype;

    if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      try {
        const htmlPath = await convertToHtml(req.file.path);
        finalFilePath = htmlPath;
        finalMimeType = 'text/html';
      } catch (e) { console.error("Excel conversion failed", e); }
    }
    else if (req.file.mimetype !== 'application/pdf') {
      try {
        const type = req.file.mimetype.startsWith('image/') ? 'image' : 'text';
        finalFilePath = await convertToPdf(content, req.file.path, type);
        finalMimeType = 'application/pdf';
      } catch (e) { console.error("PDF conversion failed", e); }
    }

    // 5. Create Mongo Document
    const fileId = new mongoose.Types.ObjectId();
    const newFile = new File({
      _id: fileId,
      fileName: req.file.originalname,
      fileType: finalMimeType,
      size: req.file.size,
      content,
      summary,
      userId: req.auth.userId,
      folderId,
      filePath: finalFilePath,
      pineconeId: fileId.toString() // Base ID, but vectors will be chunked
    });

    // 6. Chunking & Embedding (The Core Logic Fix)
    const chunks = chunkText(content, 1000);
    const vectorsToUpsert = [];

    console.log(`🧩 Chunking content into ${chunks.length} parts...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await aiService.generateEmbedding(chunk);

        // Safety Gate: Ensure valid embedding 
        if (embedding && embedding.length > 0 && !embedding.every(n => n === 0)) {
          vectorsToUpsert.push({
            id: `${fileId}_${i}`, // Unique ID for each chunk
            values: embedding,
            metadata: {
              text: chunk, // CRITICAL: The actual text for RAG
              fileId: fileId.toString(),
              sessionId: sessionId, // Explicitly set from validated variable
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

    // 7. Batch Upsert to Pinecone
    if (vectorsToUpsert.length > 0) {
      await vectorService.upsertBatch(vectorsToUpsert);
      console.log(`✅ Successfully upserted ${vectorsToUpsert.length} vector chunks.`);
    } else {
      console.warn("⚠️ No valid vectors generated. Skipping Pinecone upsert.");
    }

    // 8. Save to DB
    await newFile.save();
    console.log("✅ File saved to MongoDB.");

    res.status(200).json({ message: 'File processed', file: newFile });

  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Files (For Dashboard)
exports.getAllFiles = async (req, res) => {
  try {
    const files = await File.find()
      .select('fileName summary createdAt fileType');

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get Single File (For Deep Dive View)
exports.getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Delete File (Physical + Pinecone + Mongo)
exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    // 1. Find the file
    const file = await File.findOne({ _id: id, userId });
    if (!file) return res.status(404).json({ error: "File not found" });

    // 2. Delete Physical File
    if (file.filePath) {
      const absolutePath = path.resolve(file.filePath);
      console.log(`🗑️ Attempting to delete: ${absolutePath}`);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log("✅ Physical file deleted.");
      } else {
        console.warn("⚠️ File not found on disk:", absolutePath);
      }
    }

    // 3. Delete from Pinecone
    if (file.pineconeId && file.pineconeId !== "pending") {
      try {
        await vectorService.deleteVector(file.pineconeId);
        console.log("✅ Pinecone vector deleted.");
      } catch (e) {
        console.error("❌ Pinecone delete failed:", e.message);
      }
    }

    // 4. Delete from MongoDB
    await File.deleteOne({ _id: id });
    console.log("✅ Database record deleted.");

    res.json({ message: "File permanently deleted" });

  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 5. Search Files and Folders ✅ FIXED - ONLY ONE VERSION
exports.searchFiles = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.auth.userId;

    if (!query || !query.trim()) {
      return res.json({ files: [], folders: [] });
    }

    console.log(`🔎 Searching for: "${query}" by user: ${userId}`);

    // Search files
    const files = await File.find({
      userId,
      fileName: { $regex: query, $options: 'i' }
    }).select('fileName fileType size createdAt folderId');

    // Search folders
    const folders = await Folder.find({
      userId,
      name: { $regex: query, $options: 'i' }
    }).select('name createdAt parentId');

    console.log(`✅ Found ${files.length} files and ${folders.length} folders`);

    res.json({ files, folders });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 6. Update File (Rename or Move)
exports.updateFile = async (req, res) => {
  try {
    const updates = {};
    if (req.body.fileName) updates.fileName = req.body.fileName;
    if (req.body.folderId !== undefined) {
      // Allow null for moving to root
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