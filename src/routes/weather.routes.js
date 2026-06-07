// =============================================================================
//  AMDAN ORGANICS – Weather Routes
// =============================================================================

const express            = require('express');
const router             = express.Router();
const WeatherController  = require('../controllers/weather.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// ── Weather dashboard ─────────────────────────────────────────────────────────
router.get(
  '/dashboard',
  authorizeRoles('FarmManager', 'FarmStaff', 'SystemAdmin'),
  WeatherController.getWeatherDashboard
);

// ── Force refresh weather ─────────────────────────────────────────────────────
router.post(
  '/refresh',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  WeatherController.refreshWeather
);

// ── Weather history ───────────────────────────────────────────────────────────
router.get(
  '/history',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  WeatherController.getHistory
);

module.exports = router;
