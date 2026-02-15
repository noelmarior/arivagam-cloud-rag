const express = require('express');
const router = express.Router();
const { registerUser, loginUser, checkEmail } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/check-email', checkEmail);

module.exports = router;