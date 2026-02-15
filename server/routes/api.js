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

// --- MULTER SETUP (File Uploads) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
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
router.post('/upload', requireAuth, upload.single('file'), fileController.uploadFile);
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