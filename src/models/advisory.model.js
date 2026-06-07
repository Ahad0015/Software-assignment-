// =============================================================================
//  AMDAN ORGANICS – Advisory Model
// =============================================================================

const pool = require('../db');

const AdvisoryModel = {

  // ── Create advisory ─────────────────────────────────────────────────────────
  async create({ title, content, alertType, cropType, urgency, validUntil, adminID }) {
    const result = await pool.query(
      `INSERT INTO advisories
         (title, content, alert_type, crop_type, urgency, valid_until, posted_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, content, alertType, cropType || null, urgency || 'Info', validUntil, adminID]
    );
    return result.rows[0];
  },

  // ── Get all active advisories ───────────────────────────────────────────────
  async getActive({ cropType, alertType } = {}) {
    let query  = `SELECT * FROM advisories
                  WHERE is_deleted = FALSE
                    AND valid_until >= CURRENT_DATE`;
    const params = [];

    if (cropType) {
      params.push(cropType);
      query += ` AND (crop_type ILIKE $${params.length} OR crop_type IS NULL)`;
    }
    if (alertType) {
      params.push(alertType);
      query += ` AND alert_type = $${params.length}`;
    }

    query += ` ORDER BY
                CASE urgency
                  WHEN 'Critical' THEN 1
                  WHEN 'Warning'  THEN 2
                  ELSE 3
                END,
                created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get single advisory ─────────────────────────────────────────────────────
  async getByID(advisoryID) {
    const result = await pool.query(
      `SELECT * FROM advisories WHERE advisory_id = $1 AND is_deleted = FALSE`,
      [advisoryID]
    );
    return result.rows[0] || null;
  },

  // ── Update advisory ─────────────────────────────────────────────────────────
  async update(advisoryID, { title, content, alertType, cropType, urgency, validUntil }) {
    const result = await pool.query(
      `UPDATE advisories
       SET title       = COALESCE($1, title),
           content     = COALESCE($2, content),
           alert_type  = COALESCE($3, alert_type),
           crop_type   = COALESCE($4, crop_type),
           urgency     = COALESCE($5, urgency),
           valid_until = COALESCE($6, valid_until),
           updated_at  = NOW()
       WHERE advisory_id = $7 AND is_deleted = FALSE
       RETURNING *`,
      [title, content, alertType, cropType, urgency, validUntil, advisoryID]
    );
    return result.rows[0] || null;
  },

  // ── Soft delete advisory ────────────────────────────────────────────────────
  async delete(advisoryID) {
    const result = await pool.query(
      `UPDATE advisories
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE advisory_id = $1
       RETURNING advisory_id`,
      [advisoryID]
    );
    return result.rows[0] || null;
  },
};

module.exports = AdvisoryModel;
