const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  console.log("📝 [Register] Request Received:", req.body); // DEBUG LOG 1

  const { name, email, password } = req.body;

  try {
    // 1. Validation
    if (!name || !email || !password) {
      console.log("❌ [Register] Missing fields");
      return res.status(400).json({ error: 'Please add all fields' });
    }

    // 2. Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log("❌ [Register] User already exists:", email);
      return res.status(400).json({ error: 'User already exists' });
    }

    // 3. Create User
    console.log("🔄 [Register] Creating user in DB...");
    const user = await User.create({ name, email, password });

    if (user) {
      console.log("✅ [Register] Success! User ID:", user._id);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      console.log("❌ [Register] Invalid user data (Creation failed)");
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    console.error("🔥 [Register] CRASH:", error); // DEBUG LOG 2 (Crucial)
    res.status(500).json({ error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  console.log("🔑 [Login] Request Received:", req.body.email); // DEBUG LOG

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // TIMING ATTACK DISTINCTION MITIGATION
    // If user is not found, compare against a dummy hash to consume similar time
    if (!user) {
      // Valid bcrypt hash (cost 10) to ensure substantial comparison time
      const dummyHash = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa';
      await bcrypt.compare(password, dummyHash);
    }

    if (user && (await user.matchPassword(password))) {
      console.log("✅ [Login] Success");
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      console.log("❌ [Login] Failed: Invalid Credentials");
      // GENERIC MESSAGE for both cases as requested for security
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("🔥 [Login] CRASH:", error);
    res.status(500).json({ error: error.message });
  }
};