const express = require('express');
const router = express.Router();
const { registerUser, loginUser, checkEmail, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/check-email', checkEmail);

module.exports = router;