require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// --- IMPORTS ---
// If you have these files, keep them. If not, comment them out.
// const validateEnv = require('./config/validateEnv'); 
// const errorHandler = require('./middleware/errorHandler'); 
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/api');

// --- 1. VALIDATION ---
// Run this before the app starts (Optional)
// if (validateEnv) validateEnv(); 

const app = express();

// --- 2. MIDDLEWARE ---

// Configure CORS (Only once!)
app.use(cors({
  origin: '*', // Frontend URL
  credentials: true
}));

// Parse JSON
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.path}`);
  next();
});

// Serve Static Files (Uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 3. ROUTES ---
app.use('/api/auth', authRoutes); // Auth routes first
app.use('/api', apiRoutes);       // General API routes second

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// server/server.js (Add this near your other routes)
app.get('/', (req, res) => {
  res.send('🚀 Arivagam API is live and healthy!');
});

// --- 4. ERROR HANDLING ---
// (Uncomment if you have the errorHandler file)
// app.use(errorHandler);

// --- 5. DATABASE & SERVER START ---
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    // Only start server AFTER database connects
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB Connection Error:', err);
    process.exit(1); // Stop process if DB fails
  });