// =============================================================================
//  AMDAN ORGANICS – Harvest Record Model
// =============================================================================

const pool = require('../db');

const HarvestModel = {

  // ── Create harvest record ───────────────────────────────────────────────────
  async create({ cropPlanID, quantityHarvested, unit, harvestDate, qualityGrade, managerID }) {
    const result = await pool.query(
      `INSERT INTO harvest_records
         (crop_plan_id, quantity_harvested, unit, harvest_date, quality_grade, recorded_by_manager_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [cropPlanID, quantityHarvested, unit, harvestDate, qualityGrade, managerID]
    );
    return result.rows[0];
  },

  // ── Get all harvests for a crop plan ────────────────────────────────────────
  async getByPlan(cropPlanID) {
    const result = await pool.query(
      `SELECT hr.*, u.full_name AS recorded_by
       FROM harvest_records hr
       JOIN users u ON u.user_id = hr.recorded_by_manager_id
       WHERE hr.crop_plan_id = $1
       ORDER BY hr.harvest_date DESC`,
      [cropPlanID]
    );
    return result.rows;
  },

  // ── Get all harvests (for reports) ─────────────────────────────────────────
  async getAll({ from, to, cropType } = {}) {
    let query  = `
      SELECT hr.*, cp.crop_type, cp.field_plot
      FROM harvest_records hr
      JOIN crop_plans cp ON cp.plan_id = hr.crop_plan_id
      WHERE 1=1`;
    const params = [];

    if (from) {
      params.push(from);
      query += ` AND hr.harvest_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND hr.harvest_date <= $${params.length}`;
    }
    if (cropType) {
      params.push(cropType);
      query += ` AND cp.crop_type ILIKE $${params.length}`;
    }

    query += ` ORDER BY hr.harvest_date DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get single harvest by ID ────────────────────────────────────────────────
  async getByID(harvestID) {
    const result = await pool.query(
      `SELECT * FROM harvest_records WHERE harvest_id = $1`,
      [harvestID]
    );
    return result.rows[0] || null;
  },

  // ── Get expected yield for a crop plan ─────────────────────────────────────
  async getTotalByPlan(cropPlanID) {
    const result = await pool.query(
      `SELECT COALESCE(SUM(quantity_harvested), 0) AS total
       FROM harvest_records
       WHERE crop_plan_id = $1`,
      [cropPlanID]
    );
    return parseFloat(result.rows[0].total);
  },
};

module.exports = HarvestModel;
