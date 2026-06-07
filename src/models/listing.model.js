// =============================================================================
//  AMDAN ORGANICS – Produce Listing Model
// =============================================================================

const pool = require('../db');

const ListingModel = {

  // ── Create listing ──────────────────────────────────────────────────────────
  async create({ productName, description, quantityAvailable, unit, unitPrice,
                 harvestDate, qualityGrade, photoPaths, managerID, status }) {
    const result = await pool.query(
      `INSERT INTO produce_listings
         (product_name, description, quantity_available, unit, unit_price,
          harvest_date, quality_grade, photo_paths, created_by_manager_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [productName, description, quantityAvailable, unit, unitPrice,
       harvestDate, qualityGrade, photoPaths || [], managerID]
    );
    return result.rows[0];
  },

  // ── Get all listings ────────────────────────────────────────────────────────
  async getAll({ status, productName, managerID } = {}) {
    let query  = `SELECT * FROM produce_listings WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (productName) {
      params.push(`%${productName}%`);
      query += ` AND product_name ILIKE $${params.length}`;
    }
    if (managerID) {
      params.push(managerID);
      query += ` AND created_by_manager_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get published listings for buyers ──────────────────────────────────────
  async getPublished({ productName, minPrice, maxPrice } = {}) {
    let query  = `SELECT * FROM produce_listings WHERE status = 'Published'`;
    const params = [];

    if (productName) {
      params.push(`%${productName}%`);
      query += ` AND product_name ILIKE $${params.length}`;
    }
    if (minPrice) {
      params.push(minPrice);
      query += ` AND unit_price >= $${params.length}`;
    }
    if (maxPrice) {
      params.push(maxPrice);
      query += ` AND unit_price <= $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get single listing ──────────────────────────────────────────────────────
  async getByID(listingID) {
    const result = await pool.query(
      `SELECT * FROM produce_listings WHERE listing_id = $1`,
      [listingID]
    );
    return result.rows[0] || null;
  },

  // ── Update listing ──────────────────────────────────────────────────────────
  async update(listingID, fields) {
    const { productName, description, quantityAvailable,
            unit, unitPrice, harvestDate, qualityGrade } = fields;
    const result = await pool.query(
      `UPDATE produce_listings
       SET product_name        = COALESCE($1, product_name),
           description         = COALESCE($2, description),
           quantity_available  = COALESCE($3, quantity_available),
           unit                = COALESCE($4, unit),
           unit_price          = COALESCE($5, unit_price),
           harvest_date        = COALESCE($6, harvest_date),
           quality_grade       = COALESCE($7, quality_grade),
           updated_at          = NOW()
       WHERE listing_id = $8
       RETURNING *`,
      [productName, description, quantityAvailable,
       unit, unitPrice, harvestDate, qualityGrade, listingID]
    );
    return result.rows[0] || null;
  },

  // ── Update status ───────────────────────────────────────────────────────────
  async updateStatus(listingID, status, { adminID, reason } = {}) {
    const result = await pool.query(
      `UPDATE produce_listings
       SET status               = $1,
           rejection_reason     = $2,
           approved_by_admin_id = $3,
           updated_at           = NOW()
       WHERE listing_id = $4
       RETURNING *`,
      [status, reason || null, adminID || null, listingID]
    );
    return result.rows[0] || null;
  },

  // ── Deduct quantity on order ────────────────────────────────────────────────
  async deductQuantity(listingID, qty) {
    const result = await pool.query(
      `UPDATE produce_listings
       SET quantity_available = GREATEST(quantity_available - $1, 0),
           status = CASE
             WHEN (quantity_available - $1) <= 0 THEN 'Unavailable'
             ELSE status
           END,
           updated_at = NOW()
       WHERE listing_id = $2
       RETURNING *`,
      [qty, listingID]
    );
    return result.rows[0] || null;
  },
};

module.exports = ListingModel;
