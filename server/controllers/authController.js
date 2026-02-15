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

    // Password Validation
    // Password Validation
    // Regex: At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (any non-alphanumeric)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      console.log("❌ [Register] Weak password");
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
      });
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

// @desc    Check if email exists
// @route   POST /api/auth/check-email
exports.checkEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.json({ exists: true, message: "Email already exists" });
    } else {
      return res.json({ exists: false, message: "Email is available" });
    }
  } catch (error) {
    console.error("🔥 [CheckEmail] Error:", error);
    res.status(500).json({ error: "Server error checking email" });
  }
};