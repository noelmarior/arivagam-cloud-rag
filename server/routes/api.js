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

// --- ROUTES ---

// Health Check
router.get('/health', (req, res) => res.json({ status: 'OK' }));

// 1. Folder Routes
router.post('/folders', requireAuth, folderController.createFolder);
router.get('/folders/:folderId', requireAuth, folderController.getFolderContents);
router.put('/folders/:id', requireAuth, folderController.updateFolder); // ✅ Add this for folder rename
router.delete('/folders/:id', requireAuth, folderController.deleteFolder); // ✅ Add this for folder delete

// 2. File Routes
router.post('/upload', requireAuth, (req, res, next) => {
  console.log("📨 Request received at /upload endpoint");

  upload.single('file')(req, res, (err) => {
    if (err) {
      // This is the error log you are missing!
      console.error("❌ MULTER/CLOUDINARY CRASH:", err);
      return res.status(500).json({ error: err.message, details: err });
    }
    console.log("✅ Multer accepted file, passing to controller...");
    next();
  });
}, fileController.uploadFile);
router.get('/files', requireAuth, fileController.getAllFiles);
router.get('/files/search', requireAuth, fileController.searchFiles);
router.get('/files/:id', requireAuth, fileController.getFileById);
router.put('/files/:id', requireAuth, fileController.updateFile); // ✅ Keep only this PUT route
router.delete('/files/:id', requireAuth, fileController.deleteFile);

// 3. Chat & Session Routes (Consolidated)
// Initialization (Start Session)
router.post('/sessions/init', requireAuth, chatController.initializeSession);
// Messaging
router.post('/chat/message', requireAuth, chatController.sendMessage);
// Session Management
router.get('/sessions', requireAuth, sessionController.getSessions);      // Sidebar List
router.get('/sessions/:id', requireAuth, sessionController.getSession);   // Single Session
router.put('/sessions/:id', requireAuth, sessionController.updateSessionName); // Rename
router.patch('/sessions/:id/pin', requireAuth, sessionController.togglePinSession); // Pin/Unpin
router.post('/sessions/:id/sources', requireAuth, sessionController.addSourcesToSession); // Add Sources
router.delete('/sessions/:id', requireAuth, sessionController.deleteSession); // Delete

// 4. Style Template Routes
router.get('/styles', requireAuth, styleController.getStyles);
router.post('/styles', requireAuth, styleController.createStyle);
router.delete('/styles/:id', requireAuth, styleController.deleteStyle);

module.exports = router; 