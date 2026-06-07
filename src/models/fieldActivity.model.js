// =============================================================================
//  AMDAN ORGANICS – Field Activity Model
// =============================================================================

const pool = require('../db');

const FieldActivityModel = {

  // ── Create new field activity ───────────────────────────────────────────────
  async create({ cropPlanID, activityType, activityDate, notes, staffID }) {
    const result = await pool.query(
      `INSERT INTO field_activities
         (crop_plan_id, activity_type, activity_date, notes, logged_by_staff_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cropPlanID, activityType, activityDate, notes || null, staffID]
    );
    return result.rows[0];
  },

  // ── Get all activities for a crop plan ──────────────────────────────────────
  async getByPlan(cropPlanID) {
    const result = await pool.query(
      `SELECT fa.*, u.full_name AS logged_by
       FROM field_activities fa
       JOIN users u ON u.user_id = fa.logged_by_staff_id
       WHERE fa.crop_plan_id = $1
       ORDER BY fa.activity_date DESC`,
      [cropPlanID]
    );
    return result.rows;
  },

  // ── Get all activities by a specific staff member ───────────────────────────
  async getByStaff(staffID) {
    const result = await pool.query(
      `SELECT fa.*, cp.crop_type, cp.field_plot
       FROM field_activities fa
       JOIN crop_plans cp ON cp.plan_id = fa.crop_plan_id
       WHERE fa.logged_by_staff_id = $1
       ORDER BY fa.activity_date DESC`,
      [staffID]
    );
    return result.rows;
  },

  // ── Get single activity by ID ───────────────────────────────────────────────
  async getByID(activityID) {
    const result = await pool.query(
      `SELECT * FROM field_activities WHERE activity_id = $1`,
      [activityID]
    );
    return result.rows[0] || null;
  },

  // ── Update completion status ────────────────────────────────────────────────
  async updateStatus(activityID, completionStatus) {
    const result = await pool.query(
      `UPDATE field_activities
       SET completion_status = $1
       WHERE activity_id = $2
       RETURNING *`,
      [completionStatus, activityID]
    );
    return result.rows[0] || null;
  },
};

module.exports = FieldActivityModel;
