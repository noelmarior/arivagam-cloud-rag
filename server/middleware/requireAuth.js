const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  // Read token from the cookie, not the authorization header
  let token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.user = await User.findById(decoded.id).select('-password');
    req.auth = { userId: decoded.id }; // Add this back for controllers to read

    // Sliding Window Logic: Check remaining time
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp - now;

    // If less than 30 minutes remain, silently issue a fresh 1-hour cookie
    if (timeRemaining < 30 * 60) {
      const newToken = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1h' });
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 60 * 60 * 1000
      });
      console.log(`[Auth] Session refreshed implicitly for user ID: ${req.user._id}`);
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed or expired' });
  }
};

module.exports = { protect };