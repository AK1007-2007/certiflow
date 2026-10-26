const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./src/config/db');
const apiRoutes = require('./src/routes/apiRoutes');
const legacyRoutes = require('./src/routes/legacyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// Backwards-compatibility legacy PHP routes
app.use('/', legacyRoutes);

// Page Routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    storage: db.isUsingFallback() ? 'JSON File Storage (Fallback)' : 'MongoDB (certificate_portal)'
  });
});

// Fallback 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.'
  });
});

// Initialize database and start Express server
async function startServer() {
  try {
    console.log('Initializing CertiFlow Backend Services...');
    await db.init();

    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(` CertiFlow Node.js (Express) Server is Running!`);
      console.log(` > Local:    http://localhost:${PORT}`);
      console.log(` > Student:  http://localhost:${PORT}/`);
      console.log(` > Admin:    http://localhost:${PORT}/admin`);
      console.log(` > Database: ${db.isUsingFallback() ? 'JSON File Storage (Fallback)' : 'MongoDB (certificate_portal)'}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
