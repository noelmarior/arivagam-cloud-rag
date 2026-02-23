const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, checkEmail, forgotPassword, resetPassword } = require('../controllers/authController');

// Strict limiter: Max 5 attempts per 15-minute window for login & forgot-password
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `windowMs`
  message: { message: 'Too many attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Standard limiter: Max 3 accounts created per hour from the same IP for register
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 account creations per `windowMs`
  message: { message: 'Too many accounts created from this IP, please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', createAccountLimiter, registerUser);
router.post('/login', strictLimiter, loginUser);
router.post('/forgot-password', strictLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/check-email', checkEmail);

module.exports = router;