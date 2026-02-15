const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header (Format: "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

      // 🔍 BRUTAL DEBUG LOGS
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 Token (last 10):', token.slice(-10));
      console.log('👤 ID from Token:', decoded.id);
      console.log('📍 Endpoint:', req.method, req.path);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Get user from the token
      req.auth = { userId: decoded.id }; // Attach to request object

      next();
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

module.exports = requireAuth;