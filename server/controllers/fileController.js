const fs = require('fs');
const File = require('../models/File');
const aiService = require('../services/aiService');
const vectorService = require('../services/vectorService');
const { v4: uuidv4 } = require('uuid');
const pdf = require('pdf-extraction');

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
      // 🔒 Bulletproof: works for MemoryStorage + DiskStorage
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

  throw new Error('Unsupported file type. Only .txt and .pdf are allowed.');
};

// 1. Upload Logic
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`Processing file: ${req.file.originalname} (${req.file.mimetype})`);

    // 1. Extract
    const content = await extractText(req.file);

    // 2. Process (AI)
    const [summary, embedding] = await Promise.all([
      aiService.generateSummary(content),
      aiService.generateEmbedding(content)
    ]);

    // 3. Vector DB
    const pineconeId = uuidv4();
    await vectorService.upsertVector(pineconeId, embedding, {
      fileName: req.file.originalname,
      summary
    });

    // 4. Mongo DB
    const newFile = new File({
      fileName: req.file.originalname,
      fileType: 'pdf',
      content,
      summary,
      pineconeId
    });

    await newFile.save();

    res.status(200).json({ message: 'File processed', file: newFile });
  } catch (error) {
    console.error("Controller Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Search Logic
exports.searchFiles = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const queryVector = await aiService.generateEmbedding(query);
    const matches = await vectorService.queryVector(queryVector);

    const results = matches.map(match => ({
      score: match.score,
      fileName: match.metadata.fileName,
      summary: match.metadata.summary
    }));

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// 3. Get All Files (For Dashboard)
exports.getAllFiles = async (req, res) => {
  try {
    const files = await File.find()
      .select('fileName summary createdAt fileType');

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Get Single File (For Deep Dive View)
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
