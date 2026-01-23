const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 1. Keep your existing modules
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api'); // Or './routes/fileRoutes' if that's what you named it

// 2. Import the new Safety Nets
const validateEnv = require('./config/validateEnv');
const errorHandler = require('./middleware/errorHandler');

// Load Env
dotenv.config();

// 3. Run Validation BEFORE starting anything
validateEnv();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 4. Connect DB (Keep your existing function)
connectDB();

// Routes
// Ensure this path matches your actual route file name
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// 5. Global Error Handler (Must be LAST, after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));