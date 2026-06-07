// =============================================================================
//  AMDAN ORGANICS – Main Express Application Entry Point
// =============================================================================

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');

// ── Route imports (we will fill these in as we build each module) ─────────────
const authRoutes        = require('./routes/auth.routes');
const cropPlanRoutes    = require('./routes/cropPlan.routes');
const fieldActRoutes    = require('./routes/fieldActivity.routes');
const harvestRoutes     = require('./routes/harvest.routes');
const inventoryRoutes   = require('./routes/inventory.routes');
const weatherRoutes     = require('./routes/weather.routes');
const advisoryRoutes    = require('./routes/advisory.routes');
const marketRoutes      = require('./routes/marketPrice.routes');
const listingRoutes     = require('./routes/listing.routes');
const inquiryRoutes     = require('./routes/inquiry.routes');
const orderRoutes       = require('./routes/order.routes');
const reportRoutes      = require('./routes/report.routes');
const adminRoutes       = require('./routes/admin.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product photos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/cropplans',  cropPlanRoutes);
app.use('/api/activities', fieldActRoutes);
app.use('/api/harvests',   harvestRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/weather',    weatherRoutes);
app.use('/api/advisories', advisoryRoutes);
app.use('/api/prices',     marketRoutes);
app.use('/api/listings',   listingRoutes);
app.use('/api/inquiries',  inquiryRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/admin',      adminRoutes);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message : 'Amdan Organics API is running',
    version : '1.0.0',
    status  : 'OK'
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Amdan Organics server running on http://localhost:${PORT}`);
});

module.exports = app;
