// =============================================================================
//  AMDAN ORGANICS – Weather Model
// =============================================================================

const pool = require('../db');

const WeatherModel = {

  // ── Save fetched weather data ───────────────────────────────────────────────
  async save({ latitude, longitude, temperature, rainfall, humidity, windSpeed, forecastData, apiStatus }) {
    const result = await pool.query(
      `INSERT INTO weather_data
         (latitude, longitude, temperature, rainfall, humidity, wind_speed, forecast_data, api_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [latitude, longitude, temperature, rainfall, humidity, windSpeed,
       JSON.stringify(forecastData), apiStatus || 'Live']
    );
    return result.rows[0];
  },

  // ── Get latest weather record ───────────────────────────────────────────────
  async getLatest() {
    const result = await pool.query(
      `SELECT * FROM weather_data
       ORDER BY fetched_at DESC
       LIMIT 1`
    );
    return result.rows[0] || null;
  },

  // ── Get weather history (last N records) ───────────────────────────────────
  async getHistory(limit = 10) {
    const result = await pool.query(
      `SELECT * FROM weather_data
       ORDER BY fetched_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },
};

module.exports = WeatherModel;
