const File = require('../models/File');
const aiService = require('../services/aiService');
const vectorService = require('../services/vectorService');
const { v4: uuidv4 } = require('uuid');
const pdf = require('pdf-extraction'); // <--- NEW LIBRARY

// Helper: Extract text
const extractText = async (file) => {
  const mimeType = file.mimetype;

  // Strategy 1: Plain Text
  if (mimeType === 'text/plain') {
    return file.buffer.toString('utf8');
  }

  // Strategy 2: PDF (Using pdf-extraction)
  if (mimeType === 'application/pdf') {
    try {
      // pdf-extraction takes the buffer directly and returns a promise
      const data = await pdf(file.buffer);
      
      // Validation: Check if text was actually found
      const text = data.text ? data.text.trim() : "";
      if (text.length < 10) {
        throw new Error("PDF text is empty. This might be a scanned image.");
      }
      
      return text;
    } catch (error) {
      console.error("PDF Parsing Error:", error.message);
      // Pass the specific error up
      throw new Error(error.message || "Failed to parse PDF.");
    }
  }

  throw new Error('Unsupported file type. Only .txt and .pdf are allowed.');
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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

exports.searchFiles = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });
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
    //res.status(500).json({ error: error.message });
  }
};