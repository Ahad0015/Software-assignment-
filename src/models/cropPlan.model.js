// =============================================================================
//  AMDAN ORGANICS – Crop Plan Model
// =============================================================================

const pool = require('../db');

const CropPlanModel = {

  // ── Create new crop plan ────────────────────────────────────────────────────
  async create({ cropType, fieldPlot, plantingDate, expectedHarvestDate, managerID }) {
    const result = await pool.query(
      `INSERT INTO crop_plans
         (crop_type, field_plot, planting_date, expected_harvest_date, created_by_manager_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cropType, fieldPlot, plantingDate, expectedHarvestDate, managerID]
    );
    return result.rows[0];
  },

  // ── Assign staff to a crop plan ─────────────────────────────────────────────
  async assignStaff(planID, staffIDs) {
    for (const staffID of staffIDs) {
      await pool.query(
        `INSERT INTO crop_plan_staff (plan_id, staff_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [planID, staffID]
      );
    }
  },

  // ── Get staff assigned to a plan ────────────────────────────────────────────
  async getAssignedStaff(planID) {
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone_number
       FROM crop_plan_staff cps
       JOIN users u ON u.user_id = cps.staff_id
       WHERE cps.plan_id = $1`,
      [planID]
    );
    return result.rows;
  },

  // ── Get all crop plans (with optional filters) ──────────────────────────────
  async getAll({ managerID, status, fieldPlot } = {}) {
    let query  = `SELECT * FROM crop_plans WHERE 1=1`;
    const params = [];

    if (managerID) {
      params.push(managerID);
      query += ` AND created_by_manager_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (fieldPlot) {
      params.push(fieldPlot);
      query += ` AND field_plot ILIKE $${params.length}`;
    }

    query += ` ORDER BY planting_date DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get single crop plan by ID ──────────────────────────────────────────────
  async getByID(planID) {
    const result = await pool.query(
      `SELECT * FROM crop_plans WHERE plan_id = $1`,
      [planID]
    );
    return result.rows[0] || null;
  },

  // ── Get plans assigned to a specific staff member ───────────────────────────
  async getByStaff(staffID) {
    const result = await pool.query(
      `SELECT cp.*
       FROM crop_plans cp
       JOIN crop_plan_staff cps ON cps.plan_id = cp.plan_id
       WHERE cps.staff_id = $1
       ORDER BY cp.planting_date DESC`,
      [staffID]
    );
    return result.rows;
  },

  // ── Update crop plan ────────────────────────────────────────────────────────
  async update(planID, { cropType, fieldPlot, plantingDate, expectedHarvestDate }) {
    const result = await pool.query(
      `UPDATE crop_plans
       SET crop_type             = COALESCE($1, crop_type),
           field_plot            = COALESCE($2, field_plot),
           planting_date         = COALESCE($3, planting_date),
           expected_harvest_date = COALESCE($4, expected_harvest_date),
           updated_at            = NOW()
       WHERE plan_id = $5
       RETURNING *`,
      [cropType, fieldPlot, plantingDate, expectedHarvestDate, planID]
    );
    return result.rows[0] || null;
  },

  // ── Update status ───────────────────────────────────────────────────────────
  async updateStatus(planID, status, reason = null) {
    const result = await pool.query(
      `UPDATE crop_plans
       SET status               = $1,
           cancellation_reason  = $2,
           updated_at           = NOW()
       WHERE plan_id = $3
       RETURNING *`,
      [status, reason, planID]
    );
    return result.rows[0] || null;
  },

  // ── Delete staff assignment ─────────────────────────────────────────────────
  async removeStaff(planID, staffID) {
    await pool.query(
      `DELETE FROM crop_plan_staff WHERE plan_id = $1 AND staff_id = $2`,
      [planID, staffID]
    );
  },
};

module.exports = CropPlanModel;
