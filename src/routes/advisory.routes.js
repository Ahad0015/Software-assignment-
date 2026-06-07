// =============================================================================
//  AMDAN ORGANICS – Advisory Routes
// =============================================================================

const express           = require('express');
const router            = express.Router();
const WeatherController = require('../controllers/weather.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// ── Get all active advisories ─────────────────────────────────────────────────
router.get(
  '/',
  authorizeRoles('FarmManager', 'FarmStaff', 'SystemAdmin'),
  WeatherController.getAdvisories
);

// ── Get single advisory ───────────────────────────────────────────────────────
router.get(
  '/:advisoryID',
  authorizeRoles('FarmManager', 'FarmStaff', 'SystemAdmin'),
  WeatherController.getAdvisoryByID
);

// ── Create advisory – Admin only ──────────────────────────────────────────────
router.post(
  '/',
  authorizeRoles('SystemAdmin'),
  WeatherController.createAdvisory
);

// ── Update advisory – Admin only ──────────────────────────────────────────────
router.put(
  '/:advisoryID',
  authorizeRoles('SystemAdmin'),
  WeatherController.updateAdvisory
);

// ── Delete advisory – Admin only ──────────────────────────────────────────────
router.delete(
  '/:advisoryID',
  authorizeRoles('SystemAdmin'),
  WeatherController.deleteAdvisory
);

module.exports = router;