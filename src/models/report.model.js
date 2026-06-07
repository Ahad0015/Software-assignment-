// =============================================================================
//  AMDAN ORGANICS – Report Model
// =============================================================================

const pool = require('../db');

const ReportModel = {

  // ── Save generated report ───────────────────────────────────────────────────
  async save({ reportType, userID, dateFrom, dateTo, filters, content }) {
    const result = await pool.query(
      `INSERT INTO reports
         (report_type, generated_by_user_id, date_range_from,
          date_range_to, applied_filters, report_content)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [reportType, userID, dateFrom, dateTo,
       JSON.stringify(filters || {}),
       JSON.stringify(content || {})]
    );
    return result.rows[0];
  },

  // ── Get all reports by user ─────────────────────────────────────────────────
  async getByUser(userID) {
    const result = await pool.query(
      `SELECT report_id, report_type, date_range_from,
              date_range_to, applied_filters, generated_at
       FROM reports
       WHERE generated_by_user_id = $1
       ORDER BY generated_at DESC`,
      [userID]
    );
    return result.rows;
  },

  // ── Get single report ───────────────────────────────────────────────────────
  async getByID(reportID) {
    const result = await pool.query(
      `SELECT * FROM reports WHERE report_id = $1`,
      [reportID]
    );
    return result.rows[0] || null;
  },

  // ── Sales & Revenue data ────────────────────────────────────────────────────
  async getSalesData(dateFrom, dateTo, filters = {}) {
    let query = `
      SELECT
        o.order_id,
        o.product_name,
        o.quantity_ordered,
        o.unit,
        o.unit_price,
        o.total_amount,
        o.status,
        o.created_at,
        u.full_name  AS buyer_name,
        u.email      AS buyer_email,
        bp.business_type
      FROM orders o
      JOIN users u ON u.user_id = o.buyer_id
      LEFT JOIN buyer_profiles bp ON bp.user_id = o.buyer_id
      WHERE o.created_at::date BETWEEN $1 AND $2
        AND o.status != 'Cancelled'`;
    const params = [dateFrom, dateTo];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND o.status = $${params.length}`;
    }
    if (filters.productName) {
      params.push(`%${filters.productName}%`);
      query += ` AND o.product_name ILIKE $${params.length}`;
    }

    query += ` ORDER BY o.created_at DESC`;
    const result = await pool.query(query, params);

    // Compute summary
    const rows         = result.rows;
    const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
    const totalOrders  = rows.length;
    const byProduct    = {};

    rows.forEach(r => {
      if (!byProduct[r.product_name]) {
        byProduct[r.product_name] = { quantity: 0, revenue: 0 };
      }
      byProduct[r.product_name].quantity += parseFloat(r.quantity_ordered);
      byProduct[r.product_name].revenue  += parseFloat(r.total_amount);
    });

    return { rows, summary: { totalRevenue, totalOrders, byProduct } };
  },

  // ── Inventory report data ───────────────────────────────────────────────────
  async getInventoryData(filters = {}) {
    let query = `SELECT * FROM inventory_items WHERE 1=1`;
    const params = [];

    if (filters.category) {
      params.push(filters.category);
      query += ` AND category = $${params.length}`;
    }
    if (filters.stockStatus === 'low') {
      query += ` AND current_stock < minimum_threshold AND current_stock > 0`;
    } else if (filters.stockStatus === 'out') {
      query += ` AND current_stock = 0`;
    }

    query += ` ORDER BY category, item_name`;
    const result = await pool.query(query, params);

    const rows         = result.rows;
    const totalItems   = rows.length;
    const lowStockItems = rows.filter(
      i => parseFloat(i.current_stock) < parseFloat(i.minimum_threshold)
    ).length;
    const outOfStock   = rows.filter(i => parseFloat(i.current_stock) === 0).length;

    return { rows, summary: { totalItems, lowStockItems, outOfStock } };
  },

  // ── Crop performance data ───────────────────────────────────────────────────
  async getCropData(dateFrom, dateTo) {
    const result = await pool.query(
      `SELECT
         cp.crop_type,
         cp.field_plot,
         cp.planting_date,
         cp.expected_harvest_date,
         cp.status,
         COALESCE(SUM(hr.quantity_harvested), 0) AS total_harvested,
         hr.unit,
         COUNT(fa.activity_id)                   AS total_activities
       FROM crop_plans cp
       LEFT JOIN harvest_records hr ON hr.crop_plan_id = cp.plan_id
       LEFT JOIN field_activities fa ON fa.crop_plan_id = cp.plan_id
       WHERE cp.planting_date BETWEEN $1 AND $2
       GROUP BY cp.plan_id, cp.crop_type, cp.field_plot,
                cp.planting_date, cp.expected_harvest_date,
                cp.status, hr.unit
       ORDER BY cp.planting_date DESC`,
      [dateFrom, dateTo]
    );

    const rows         = result.rows;
    const totalPlans   = rows.length;
    const harvested    = rows.filter(r => r.status === 'Harvested').length;
    const inProgress   = rows.filter(r => r.status === 'In Progress').length;
    const totalYield   = rows.reduce((s, r) => s + parseFloat(r.total_harvested), 0);

    return { rows, summary: { totalPlans, harvested, inProgress, totalYield } };
  },

  // ── User activity data ──────────────────────────────────────────────────────
  async getUserActivityData() {
    const result = await pool.query(
      `SELECT
         u.user_id, u.full_name, u.email, u.role, u.status, u.created_at,
         COUNT(sl.log_id) AS total_actions
       FROM users u
       LEFT JOIN system_logs sl ON sl.actor_id = u.user_id
       GROUP BY u.user_id
       ORDER BY total_actions DESC`
    );

    const rows      = result.rows;
    const byRole    = {};
    rows.forEach(r => {
      byRole[r.role] = (byRole[r.role] || 0) + 1;
    });

    return { rows, summary: { totalUsers: rows.length, byRole } };
  },
};

module.exports = ReportModel;
