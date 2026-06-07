// =============================================================================
//  AMDAN ORGANICS – Market Price Model
// =============================================================================

const pool = require('../db');

const MarketPriceModel = {

  // ── Create price entry ──────────────────────────────────────────────────────
  async create({ cropName, pricePerUnit, unitType, marketLocation, dateRecorded, adminID }) {
    const result = await pool.query(
      `INSERT INTO market_prices
         (crop_name, price_per_unit, unit_type, market_location, date_recorded, entered_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [cropName, pricePerUnit, unitType, marketLocation, dateRecorded, adminID]
    );
    return result.rows[0];
  },

  // ── Get all active prices ───────────────────────────────────────────────────
  async getAll({ cropName, marketLocation } = {}) {
    let query  = `SELECT * FROM market_prices WHERE is_deleted = FALSE`;
    const params = [];

    if (cropName) {
      params.push(`%${cropName}%`);
      query += ` AND crop_name ILIKE $${params.length}`;
    }
    if (marketLocation) {
      params.push(`%${marketLocation}%`);
      query += ` AND market_location ILIKE $${params.length}`;
    }

    query += ` ORDER BY date_recorded DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get price trend for a crop ──────────────────────────────────────────────
  async getTrend(cropName, from, to) {
    const result = await pool.query(
      `SELECT date_recorded, price_per_unit, unit_type, market_location
       FROM market_prices
       WHERE crop_name ILIKE $1
         AND is_deleted = FALSE
         AND date_recorded BETWEEN $2 AND $3
       ORDER BY date_recorded ASC`,
      [`%${cropName}%`, from, to]
    );
    return result.rows;
  },

  // ── Get single price by ID ──────────────────────────────────────────────────
  async getByID(priceID) {
    const result = await pool.query(
      `SELECT * FROM market_prices WHERE price_id = $1 AND is_deleted = FALSE`,
      [priceID]
    );
    return result.rows[0] || null;
  },

  // ── Update price entry ──────────────────────────────────────────────────────
  async update(priceID, { cropName, pricePerUnit, unitType, marketLocation, dateRecorded }) {
    const result = await pool.query(
      `UPDATE market_prices
       SET crop_name        = COALESCE($1, crop_name),
           price_per_unit   = COALESCE($2, price_per_unit),
           unit_type        = COALESCE($3, unit_type),
           market_location  = COALESCE($4, market_location),
           date_recorded    = COALESCE($5, date_recorded)
       WHERE price_id = $6 AND is_deleted = FALSE
       RETURNING *`,
      [cropName, pricePerUnit, unitType, marketLocation, dateRecorded, priceID]
    );
    return result.rows[0] || null;
  },

  // ── Soft delete price entry ─────────────────────────────────────────────────
  async delete(priceID) {
    const result = await pool.query(
      `UPDATE market_prices SET is_deleted = TRUE
       WHERE price_id = $1 RETURNING price_id`,
      [priceID]
    );
    return result.rows[0] || null;
  },

  // ── Get latest price per crop (for comparison) ──────────────────────────────
  async getLatestPerCrop() {
    const result = await pool.query(
      `SELECT DISTINCT ON (crop_name)
         crop_name, price_per_unit, unit_type, market_location, date_recorded
       FROM market_prices
       WHERE is_deleted = FALSE
       ORDER BY crop_name, date_recorded DESC`
    );
    return result.rows;
  },
};

module.exports = MarketPriceModel;
