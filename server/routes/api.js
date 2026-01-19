const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Store in RAM
const fileController = require('../controllers/fileController');

router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/search', fileController.searchFiles);

module.exports = router;