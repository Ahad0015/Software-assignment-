// =============================================================================
//  AMDAN ORGANICS – Weather & Advisory Controller
// =============================================================================

const WeatherModel   = require('../models/weather.model');
const AdvisoryModel  = require('../models/advisory.model');
const WeatherService = require('../services/weather.service');
const pool           = require('../db');

const WeatherController = {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WEATHER                                                                 ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Get current weather dashboard ──────────────────────────────────────────
  async getWeatherDashboard(req, res) {
    try {
      // Check if we have recent data (less than 30 mins old)
      const latest = await WeatherModel.getLatest();
      const isStale = !latest ||
        (new Date() - new Date(latest.fetched_at)) > 30 * 60 * 1000;

      let weatherData = latest;

      // Fetch fresh data if stale or missing
      if (isStale) {
        weatherData = await WeatherService.fetchAndSave();
      }

      if (!weatherData) {
        return res.status(503).json({
          message: 'Weather data unavailable. Check your API key or internet connection.'
        });
      }

      // Evaluate weather alerts
      const autoAlerts = WeatherService.evaluateAlerts(weatherData);

      // Get active admin-posted advisories
      const advisories = await AdvisoryModel.getActive();

      return res.status(200).json({
        weather: {
          temperature  : weatherData.temperature,
          humidity     : weatherData.humidity,
          rainfall     : weatherData.rainfall,
          windSpeed    : weatherData.wind_speed,
          apiStatus    : weatherData.api_status,
          fetchedAt    : weatherData.fetched_at,
          forecast     : weatherData.forecast_data
        },
        autoAlerts,
        advisories,
        isStale : weatherData.api_status === 'Cached'
      });

    } catch (err) {
      console.error('Weather dashboard error:', err.message);
      return res.status(500).json({ message: 'Server error fetching weather.' });
    }
  },

  // ── Force refresh weather data ──────────────────────────────────────────────
  async refreshWeather(req, res) {
    try {
      const weatherData = await WeatherService.fetchAndSave();

      if (!weatherData) {
        return res.status(503).json({
          message: 'Could not fetch weather. API may be unavailable.'
        });
      }

      return res.status(200).json({
        message    : 'Weather data refreshed successfully.',
        weather    : weatherData,
        autoAlerts : WeatherService.evaluateAlerts(weatherData)
      });

    } catch (err) {
      console.error('Refresh weather error:', err.message);
      return res.status(500).json({ message: 'Server error refreshing weather.' });
    }
  },

  // ── Get weather history ─────────────────────────────────────────────────────
  async getHistory(req, res) {
    try {
      const limit   = parseInt(req.query.limit) || 10;
      const history = await WeatherModel.getHistory(limit);
      return res.status(200).json({ count: history.length, history });
    } catch (err) {
      console.error('Weather history error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ADVISORIES                                                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Get all active advisories ───────────────────────────────────────────────
  async getAdvisories(req, res) {
    try {
      const { cropType, alertType } = req.query;
      const advisories = await AdvisoryModel.getActive({ cropType, alertType });

      return res.status(200).json({
        count: advisories.length,
        advisories
      });
    } catch (err) {
      console.error('Get advisories error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Create advisory (Admin only) ────────────────────────────────────────────
  async createAdvisory(req, res) {
    try {
      const { title, content, alertType, cropType, urgency, validUntil } = req.body;

      if (!title || !content || !alertType || !validUntil) {
        return res.status(400).json({
          message: 'title, content, alertType and validUntil are required.'
        });
      }

      // Validate alertType
      const validTypes = ['Weather Risk', 'Pest Alert', 'Disease Alert', 'Agronomic Recommendation'];
      if (!validTypes.includes(alertType)) {
        return res.status(400).json({
          message: `Invalid alertType. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Validate validUntil is not in the past
      if (new Date(validUntil) < new Date()) {
        return res.status(400).json({
          message: 'validUntil must be today or a future date.'
        });
      }

      const advisory = await AdvisoryModel.create({
        title, content, alertType, cropType,
        urgency   : urgency || 'Info',
        validUntil,
        adminID   : req.user.userID
      });

      // Notify all FarmManagers and FarmStaff
      const users = await pool.query(
        `SELECT user_id FROM users
         WHERE role IN ('FarmManager', 'FarmStaff')
           AND status = 'Approved'`
      );
      for (const user of users.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, reference_id)
           VALUES ($1, 'weather_alert', $2, $3)`,
          [
            user.user_id,
            `New advisory posted: ${title} [${urgency || 'Info'}]`,
            advisory.advisory_id
          ]
        );
      }

      return res.status(201).json({
        message  : 'Advisory posted successfully.',
        advisory
      });

    } catch (err) {
      console.error('Create advisory error:', err.message);
      return res.status(500).json({ message: 'Server error creating advisory.' });
    }
  },

  // ── Update advisory (Admin only) ────────────────────────────────────────────
  async updateAdvisory(req, res) {
    try {
      const { advisoryID } = req.params;

      const existing = await AdvisoryModel.getByID(advisoryID);
      if (!existing) {
        return res.status(404).json({ message: 'Advisory not found.' });
      }

      // Check validUntil not expired
      if (req.body.validUntil && new Date(req.body.validUntil) < new Date()) {
        return res.status(400).json({ message: 'validUntil must be a future date.' });
      }

      const updated = await AdvisoryModel.update(advisoryID, req.body);
      return res.status(200).json({
        message  : 'Advisory updated.',
        advisory : updated
      });

    } catch (err) {
      console.error('Update advisory error:', err.message);
      return res.status(500).json({ message: 'Server error updating advisory.' });
    }
  },

  // ── Delete advisory (Admin only) ────────────────────────────────────────────
  async deleteAdvisory(req, res) {
    try {
      const { advisoryID } = req.params;

      const existing = await AdvisoryModel.getByID(advisoryID);
      if (!existing) {
        return res.status(404).json({ message: 'Advisory not found.' });
      }

      await AdvisoryModel.delete(advisoryID);

      return res.status(200).json({ message: 'Advisory deleted successfully.' });

    } catch (err) {
      console.error('Delete advisory error:', err.message);
      return res.status(500).json({ message: 'Server error deleting advisory.' });
    }
  },

  // ── Get single advisory ─────────────────────────────────────────────────────
  async getAdvisoryByID(req, res) {
    try {
      const { advisoryID } = req.params;
      const advisory = await AdvisoryModel.getByID(advisoryID);

      if (!advisory) {
        return res.status(404).json({ message: 'Advisory not found.' });
      }
      return res.status(200).json({ advisory });

    } catch (err) {
      console.error('Get advisory error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = WeatherController;
