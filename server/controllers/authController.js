const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const crypto = require('crypto');
const { google } = require('googleapis');
const { validateEmailStrict } = require('../utils/emailValidator');

// Initialize the OAuth2 HTTP Client
const oAuth2Client = new google.auth.OAuth2(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });

// Initialize the Gmail HTTP API
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '1h',
  });
};

// Helper to set cookie
const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  console.log(`📝 [Register] Request Received for email: ${req.body.email}`);

  const { name, email, password } = req.body;

  try {
    // 1. Validation
    if (!name || !email || !password) {
      console.log("❌ [Register] Missing fields");
      return res.status(400).json({ error: 'Please add all fields' });
    }

    // Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      console.log("❌ [Register] Weak password");
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
      });
    }

    // Email strictness validation
    try {
      console.log("🔄 [Register] Validating email strictness...");
      await validateEmailStrict(email);
    } catch (error) {
      console.log("❌ [Register] Email validation failed:", error.message);
      return res.status(400).json({ error: error.message });
    }

    // 2. Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log("❌ [Register] User already exists:", email);
      return res.status(400).json({ error: 'User already exists' });
    }

    // 3. Hash password using argon2 (id variant is default)
    console.log("🔄 [Register] Hashing password...");
    let hashedPassword;
    try {
      hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
    } catch (err) {
      throw new Error('Hashing failed');
    }

    // 4. Generate secure token & hash it
    console.log("🔄 [Register] Generating email verification token...");
    const rawToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 5. Create User
    console.log("🔄 [Register] Creating user in DB...");
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      emailVerificationToken: hashedToken,
      emailVerificationExpire: Date.now() + 15 * 60 * 1000 // Expires in 15 minutes
    });

    if (user) {
      console.log("✅ [Register] Success! User ID:", user._id);

      // 6. Build the raw HTML email
      const verifyUrl = `${process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://arivagam.vercel.app' : 'http://localhost:5173')}/verify-email/${rawToken}`;
      const subject = 'Verify your Arivagam Email Address';
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

      const messageRaw = [
        `From: Arivagam <${process.env.EMAIL_USERNAME}>`,
        `To: ${user.email}`,
        'Content-type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        `<h1>Welcome, ${name}!</h1>
         <p>Please verify your email by clicking the link below:</p>
         <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
         <p>This link will expire in 15 minutes.</p>`
      ].join('\n');

      const encodedMessage = Buffer.from(messageRaw).toString('base64url');

      // 7. Send the email using Google Gmail v1 strictly
      console.log("🔄 [Register] Sending verification email...");
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
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

    // Timing attack mitigation: if user not found, perform a dummy hash check
    if (!user) {
      const dummyHash = '$argon2id$v=19$m=4096,t=3,p=1$dummySaltdummySalt$dummyHashdummyHash12345';
      try { await argon2.verify(dummyHash, password); } catch (e) { }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let isMatch = false;

    // Check hash prefix to determine the algorithm
    if (user.password.startsWith('$2')) {
      // Legacy bcrypt hash
      isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        // Opportunistic Hashing: Re-hash with argon2 and update DB
        console.log("🔄 [Login] Opportunistic upgrade from bcrypt to argon2...");
        const newHash = await argon2.hash(password, { type: argon2.argon2id });
        user.password = newHash;
        await user.save();
      }
    } else if (user.password.startsWith('$argon2')) {
      // Modern argon2 hash
      try {
        isMatch = await argon2.verify(user.password, password);
      } catch (err) {
        isMatch = false;
      }
    }

    if (isMatch) {
      if (!user.isEmailVerified) {
        return res.status(401).json({ error: 'Please verify your email before logging in.' });
      }

      console.log(`[Login] Success for: ${user.email}`);
      const token = generateToken(user._id);

      // Attach the HttpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: true, // Required for cross-origin Vercel -> Render
        sameSite: 'none', // Required for cross-origin Vercel -> Render
        maxAge: 60 * 60 * 1000 // 1 hour
      });

      // Do NOT send the token in this JSON body anymore
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
      });
    } else {
      console.log("❌ [Login] Failed: Invalid Credentials");
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("🔥 [Login] CRASH:", error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.status(200).json({ message: 'Logged out successfully' });
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
    const baseUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://arivagam.vercel.app' : 'http://localhost:5173');
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

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
      // 1. Construct the raw email string
      const subject = 'Reset your Arivagam password';
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `From: Arivagam <${process.env.EMAIL_USERNAME}>`,
        `To: ${user.email}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        message // This is your HTML string containing the reset link
      ];

      const messageRaw = messageParts.join('\n');

      // 2. Encode it to base64url format required by Google API
      const encodedMessage = Buffer.from(messageRaw).toString('base64');

      // 3. Send the email via HTTP (Port 443), bypassing Render's SMTP block
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
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

    // Explicitly hash using argon2id since pre-save hook is removed
    const newHash = await argon2.hash(password, { type: argon2.argon2id });

    // Set new password
    user.password = newHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error("🔥 [ResetPassword] Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc    Verify Email
// @route   GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Hash the incoming param token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user where token matches and expire is in the future
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // 3. Nullify token fields and set as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;

    await user.save();

    res.status(200).json({ message: 'Email verified successfully. You may now log in.' });

  } catch (error) {
    console.error('🔥 [VerifyEmail] Error:', error);
    res.status(500).json({ error: 'Server error during email verification' });
  }
};

// @desc    Check Verification Status
// @route   GET /api/auth/verification-status/:email
exports.checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ isVerified: !!user.isEmailVerified });
  } catch (error) {
    console.error('🔥 [CheckVerification] Error:', error);
    res.status(500).json({ error: 'Server error checking verification status' });
  }
};