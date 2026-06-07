// =============================================================================
//  AMDAN ORGANICS – Purchase Inquiry & Order Model
// =============================================================================

const pool = require('../db');

const InquiryModel = {

  // ── Create inquiry ──────────────────────────────────────────────────────────
  async create({ listingID, buyerID, requestedQty, unit,
                 preferredDeliveryDate, notes }) {
    const result = await pool.query(
      `INSERT INTO purchase_inquiries
         (listing_id, buyer_id, requested_qty, unit, preferred_delivery_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [listingID, buyerID, requestedQty, unit,
       preferredDeliveryDate || null, notes || null]
    );
    return result.rows[0];
  },

  // ── Get all inquiries ───────────────────────────────────────────────────────
  async getAll({ buyerID, listingID, status } = {}) {
    let query  = `
      SELECT pi.*,
             u.full_name  AS buyer_name,
             u.email      AS buyer_email,
             pl.product_name
      FROM purchase_inquiries pi
      JOIN users u            ON u.user_id    = pi.buyer_id
      JOIN produce_listings pl ON pl.listing_id = pi.listing_id
      WHERE 1=1`;
    const params = [];

    if (buyerID) {
      params.push(buyerID);
      query += ` AND pi.buyer_id = $${params.length}`;
    }
    if (listingID) {
      params.push(listingID);
      query += ` AND pi.listing_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND pi.status = $${params.length}`;
    }

    query += ` ORDER BY pi.created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get single inquiry ──────────────────────────────────────────────────────
  async getByID(inquiryID) {
    const result = await pool.query(
      `SELECT pi.*,
              u.full_name  AS buyer_name,
              u.email      AS buyer_email,
              pl.product_name, pl.unit_price
       FROM purchase_inquiries pi
       JOIN users u             ON u.user_id     = pi.buyer_id
       JOIN produce_listings pl  ON pl.listing_id = pi.listing_id
       WHERE pi.inquiry_id = $1`,
      [inquiryID]
    );
    return result.rows[0] || null;
  },

  // ── Update inquiry status ───────────────────────────────────────────────────
  async updateStatus(inquiryID, status, responseMessage = null) {
    const result = await pool.query(
      `UPDATE purchase_inquiries
       SET status                = $1,
           farm_manager_response = COALESCE($2, farm_manager_response),
           responded_at          = NOW()
       WHERE inquiry_id = $3
       RETURNING *`,
      [status, responseMessage, inquiryID]
    );
    return result.rows[0] || null;
  },
};

// ── Order Model ───────────────────────────────────────────────────────────────
const OrderModel = {

  // ── Create order from accepted inquiry ─────────────────────────────────────
  async createFromInquiry(inquiry, listing, farmManagerID) {
    const result = await pool.query(
      `INSERT INTO orders
         (inquiry_id, buyer_id, farm_manager_id, product_name,
          quantity_ordered, unit, unit_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        inquiry.inquiry_id,
        inquiry.buyer_id,
        farmManagerID,
        listing.product_name,
        inquiry.requested_qty,
        inquiry.unit,
        listing.unit_price
      ]
    );
    return result.rows[0];
  },

  // ── Get all orders ──────────────────────────────────────────────────────────
  async getAll({ buyerID, farmManagerID, status } = {}) {
    let query  = `
      SELECT o.*,
             u.full_name AS buyer_name,
             u.email     AS buyer_email
      FROM orders o
      JOIN users u ON u.user_id = o.buyer_id
      WHERE 1=1`;
    const params = [];

    if (buyerID) {
      params.push(buyerID);
      query += ` AND o.buyer_id = $${params.length}`;
    }
    if (farmManagerID) {
      params.push(farmManagerID);
      query += ` AND o.farm_manager_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    query += ` ORDER BY o.created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get single order ────────────────────────────────────────────────────────
  async getByID(orderID) {
    const result = await pool.query(
      `SELECT o.*, u.full_name AS buyer_name, u.email AS buyer_email
       FROM orders o
       JOIN users u ON u.user_id = o.buyer_id
       WHERE o.order_id = $1`,
      [orderID]
    );
    return result.rows[0] || null;
  },

  // ── Update order status ─────────────────────────────────────────────────────
  async updateStatus(orderID, status, reason = null) {

    const fulfilledAt =
      status === 'Delivered'
        ? new Date()
        : null;
  
    const result = await pool.query(
      `UPDATE orders
       SET status = $1,
           cancellation_reason = $2,
           fulfilled_at = COALESCE($3, fulfilled_at)
       WHERE order_id = $4
       RETURNING *`,
      [status, reason, fulfilledAt, orderID]
    );
  
    return result.rows[0] || null;
  },
};

module.exports = { InquiryModel, OrderModel };
