const express = require('express');
const router = express.Router();
const multer = require('multer');

// Your existing temporary storage setup
const upload = multer({ dest: 'uploads/' }); 
// Note: Changed from memoryStorage() to dest: 'uploads/' 
// because our fileController expects "req.file.path" (a physical file), 
// not a buffer in RAM. This prevents the "Path argument must be of type string" error.

const fileController = require('../controllers/fileController');

// Health Check (Optional but good to have)
router.get('/health', (req, res) => res.json({ status: 'OK' }));

// 1. Upload Route
router.post('/upload', upload.single('file'), fileController.uploadFile);

// 2. Search Route (Kept pointing to fileController as per your previous setup)
router.post('/search', fileController.searchFiles);

// 3. NEW: Get All Files (For Dashboard)
router.get('/files', fileController.getAllFiles);

// 4. NEW: Get Single File (For Deep Dive)
router.get('/files/:id', fileController.getFileById);

module.exports = router;