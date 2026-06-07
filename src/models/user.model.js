// =============================================================================
//  AMDAN ORGANICS – User Model
// =============================================================================

const pool = require('../db');

const UserModel = {

  // ── Find user by email ──────────────────────────────────────────────────────
  async findByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  },

  // ── Find user by ID ─────────────────────────────────────────────────────────
  async findByID(userID) {
    const result = await pool.query(
      `SELECT user_id, full_name, email, phone_number, role, status, created_at
       FROM users WHERE user_id = $1`,
      [userID]
    );
    return result.rows[0] || null;
  },

  // ── Create new user ─────────────────────────────────────────────────────────
  async create({ fullName, email, passwordHash, phoneNumber, role }) {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending')
       RETURNING user_id, full_name, email, phone_number, role, status, created_at`,
      [fullName, email, passwordHash, phoneNumber, role]
    );
    return result.rows[0];
  },

  // ── Create role profile after user is created ───────────────────────────────
  async createRoleProfile(userID, role, extraData = {}) {
    switch (role) {
      case 'FarmManager':
        await pool.query(
          `INSERT INTO farm_manager_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
          [userID]
        );
        break;
      case 'FarmStaff':
        await pool.query(
          `INSERT INTO farm_staff_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
          [userID]
        );
        break;
      case 'InventoryOfficer':
        await pool.query(
          `INSERT INTO inventory_officer_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
          [userID]
        );
        break;
      case 'Buyer':
        await pool.query(
          `INSERT INTO buyer_profiles (user_id, business_name, business_type)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [userID, extraData.businessName || 'N/A', extraData.businessType || 'Individual']
        );
        break;
      case 'SystemAdmin':
        // No extra profile table needed for admin
        break;
    }
  },

  // ── Update user status (Approved / Suspended) ───────────────────────────────
  async updateStatus(userID, status) {
    const result = await pool.query(
      `UPDATE users SET status = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, full_name, email, role, status`,
      [status, userID]
    );
    return result.rows[0] || null;
  },

  // ── Update profile fields ───────────────────────────────────────────────────
  async updateProfile(userID, { fullName, phoneNumber }) {
    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone_number = COALESCE($2, phone_number),
           updated_at = NOW()
       WHERE user_id = $3
       RETURNING user_id, full_name, email, phone_number, role, status`,
      [fullName, phoneNumber, userID]
    );
    return result.rows[0] || null;
  },

  // ── Update password ─────────────────────────────────────────────────────────
  async updatePassword(userID, newPasswordHash) {
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [newPasswordHash, userID]
    );
  },

  // ── Get all users (for admin) ───────────────────────────────────────────────
  async getAll({ role, status } = {}) {
    let query = `SELECT user_id, full_name, email, phone_number, role, status, created_at FROM users WHERE 1=1`;
    const params = [];

    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Log failed login attempts ───────────────────────────────────────────────
  async logFailedAttempt(userID) {
    await pool.query(
      `INSERT INTO system_logs (actor_id, action, details)
       VALUES ($1, 'failed_login', '{"reason": "wrong password"}')`,
      [userID]
    );
  },
};

module.exports = UserModel;
