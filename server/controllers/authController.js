const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Return 404 to trigger "Action can't be completed" on frontend
      return res.status(404).json({ error: "Action can't be completed" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 Hour

    await user.save();

    // Create reset url
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    const message = `
      <p>Hi ${user.name},</p>
      <p>We received a request to reset your password for your Arivagam account.</p>
      <p>Click the button below to choose a new one:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not make this request, please ignore this email or contact support if you have concerns.</p>
      <p>Thanks,<br>The Arivagam Team</p>
    `;

    try {
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        auth: {
          user: process.env.SMTP_MAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `Arivagam <${process.env.SMTP_MAIL}>`,
        to: user.email,
        subject: 'Reset your Arivagam password',
        html: message,
      });

      res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error("🔥 Email send failed:", error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ error: 'Email could not be sent' });
    }
  } catch (error) {
    console.error("🔥 [ForgotPassword] Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const { password } = req.body;

    // Validate new password using the same regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
      });
    }

    // Set new password (the pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error("🔥 [ResetPassword] Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};