const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// --- CONTROLLERS ---
const sessionController = require('../controllers/sessionController');
const chatController = require('../controllers/chatController');
const fileController = require('../controllers/fileController');
const folderController = require('../controllers/folderController');
const styleController = require('../controllers/styleController');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// --- MULTER SETUP CLOUDINARY (File Uploads) ---
// Configure Cloudinary with your keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // 1. Initialize logic variables
    let resourceType = 'auto'; // Default: let Cloudinary decide

    // 2. FORCE "raw" for specific non-image types
    // Cloudinary sometimes fails to "auto-detect" these correctly from Multer
    if (file.mimetype === 'text/plain' ||                // .txt
      file.mimetype === 'application/pdf' ||             // .pdf  
      file.mimetype.includes('msword') ||              // .doc
      file.mimetype.includes('wordprocessingml') ||    // .docx
      file.mimetype.includes('spreadsheet') ||         // .xlsx
      file.mimetype.includes('presentation')) {        // .pptx
      resourceType = 'raw';
    }

    return {
      folder: 'arivagam_uploads',
      resource_type: resourceType,
      // 3. CRITICAL: We REMOVED 'allowed_formats'. 
      // Why? Because the library validates 'txt' against IMAGE formats and crashes.
      // We accept the file here, and let your Controller handle the logic.
      public_id: file.originalname.split('.')[0] + '-' + Date.now()
    };
  },
});

const upload = multer({ storage: storage });

// --- MIDDLEWARE ---
const requireAuth = require('../middleware/requireAuth');

// const {
//   testDbConnection,
//   testPineconeConnection,
//   testOpenAIConnection,
//   debugUserContext,
// } = require('../controllers/apiController');

// Using the new cookie-based 'protect' middleware
const { protect } = require('../middleware/requireAuth');

// --- Health Check Routes (Public) ---
// router.get('/health', testDbConnection);
// router.get('/health/pinecone', testPineconeConnection);
// router.get('/health/openai', testOpenAIConnection);

// --- PROTECTED ROUTES ---

// 1. Diagnostics
// router.get('/test-db', protect, testDbConnection);
// router.get('/test-pinecone', protect, testPineconeConnection);
// router.get('/test-openai', protect, testOpenAIConnection);
// router.get('/debug-user', protect, debugUserContext);

// 2. Files
// Upload (Includes chunking logic)
router.post('/upload', protect, (req, res, next) => {
  // console.log("Incoming file upload request..."); 
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error("❌ MULTER/CLOUDINARY CRASH:", err);
      return res.status(500).json({ error: err.message, details: err });
    }
    next();
  });
}, fileController.uploadFile);
router.get('/files', protect, fileController.getAllFiles);
router.get('/files/search', protect, fileController.searchFiles);
router.get('/files/:id', protect, fileController.getFileById);
router.put('/files/:id', protect, fileController.updateFile); // ✅ Keep only this PUT route
router.delete('/files/:id', protect, fileController.deleteFile);


// 3. Chat & Session Routes (Consolidated)
// Initialization (Start Session)
router.post('/sessions/init', protect, chatController.initializeSession);

// Messaging
router.post('/chat/message', protect, chatController.sendMessage);
router.put('/chat/message', protect, chatController.updateLastMessage); // Update last message

// Get all sessions
router.get('/sessions', protect, sessionController.getSessions);

// Search sessions explicitly (Must be before /:id)
router.get('/sessions/search', protect, sessionController.searchSessions);

// Get a specific session explicitly
router.get('/sessions/:id', protect, sessionController.getSession);

// Update/rename session explicitly
router.put('/sessions/:id', protect, sessionController.updateSessionName);

// Pin/Unpin session
router.patch('/sessions/:id/pin', protect, sessionController.togglePinSession);

// Archive/Unarchive session
router.patch('/sessions/:id/archive', protect, sessionController.toggleArchiveSession);

// Add Sources to session
router.post('/sessions/:id/sources', protect, sessionController.addSourcesToSession);

// Delete session explicitly
router.delete('/sessions/:id', protect, sessionController.deleteSession);

// Clear session messages explicitly
router.patch('/sessions/:id/clear', protect, sessionController.clearSessionMessages);


// 4. Folders

router.post('/folders', protect, folderController.createFolder);
router.get('/folders/:folderId', protect, folderController.getFolderContents);
router.put('/folders/:id', protect, folderController.updateFolder); // ✅ Added PUT route
router.delete('/folders/:id', protect, folderController.deleteFolder);

// 5. Style Template Routes
router.get('/styles', protect, styleController.getStyles);
router.post('/styles', protect, styleController.createStyle);
router.delete('/styles/:id', protect, styleController.deleteStyle);

module.exports = router;