// =============================================================================
//  AMDAN ORGANICS – Inventory Model
// =============================================================================

const pool = require('../db');

const InventoryModel = {

  // ── Get all inventory items ─────────────────────────────────────────────────
  async getAll({ category, stockStatus } = {}) {
    let query  = `SELECT * FROM inventory_items WHERE 1=1`;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (stockStatus === 'low') {
      query += ` AND current_stock < minimum_threshold AND current_stock > 0`;
    } else if (stockStatus === 'out') {
      query += ` AND current_stock = 0`;
    } else if (stockStatus === 'ok') {
      query += ` AND current_stock >= minimum_threshold`;
    }

    query += ` ORDER BY item_name ASC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  // ── Get single item by ID ───────────────────────────────────────────────────
  async getByID(itemID) {
    const result = await pool.query(
      `SELECT * FROM inventory_items WHERE item_id = $1`,
      [itemID]
    );
    return result.rows[0] || null;
  },

  // ── Get item by name and category ──────────────────────────────────────────
  async getByNameAndCategory(itemName, category) {
    const result = await pool.query(
      `SELECT * FROM inventory_items
       WHERE item_name = $1 AND category = $2`,
      [itemName, category]
    );
    return result.rows[0] || null;
  },

  // ── Create new inventory item ───────────────────────────────────────────────
  async create({ itemName, category, currentStock, unit, unitCost, minimumThreshold }) {
    const result = await pool.query(
      `INSERT INTO inventory_items
         (item_name, category, current_stock, unit, unit_cost, minimum_threshold)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [itemName, category, currentStock || 0, unit, unitCost || 0, minimumThreshold || 0]
    );
    return result.rows[0];
  },

  // ── Add stock (incoming stock recording) ───────────────────────────────────
  async addStock(itemID, qty, unitCost) {
    const result = await pool.query(
      `UPDATE inventory_items
       SET current_stock = current_stock + $1,
           unit_cost     = COALESCE($2, unit_cost),
           last_updated  = NOW()
       WHERE item_id = $3
       RETURNING *`,
      [qty, unitCost || null, itemID]
    );
    return result.rows[0] || null;
  },

  // ── Deduct stock (usage recording) ─────────────────────────────────────────
  async deductStock(itemID, qty) {
    const result = await pool.query(
      `UPDATE inventory_items
       SET current_stock = current_stock - $1,
           last_updated  = NOW()
       WHERE item_id = $2
         AND current_stock >= $1
       RETURNING *`,
      [qty, itemID]
    );
    return result.rows[0] || null;
  },

  // ── Update minimum threshold ────────────────────────────────────────────────
  async updateThreshold(itemID, minimumThreshold) {
    const result = await pool.query(
      `UPDATE inventory_items
       SET minimum_threshold = $1,
           last_updated      = NOW()
       WHERE item_id = $2
       RETURNING *`,
      [minimumThreshold, itemID]
    );
    return result.rows[0] || null;
  },

  // ── Update item details ─────────────────────────────────────────────────────
  async update(itemID, { itemName, unit, unitCost, minimumThreshold }) {
    const result = await pool.query(
      `UPDATE inventory_items
       SET item_name          = COALESCE($1, item_name),
           unit               = COALESCE($2, unit),
           unit_cost          = COALESCE($3, unit_cost),
           minimum_threshold  = COALESCE($4, minimum_threshold),
           last_updated       = NOW()
       WHERE item_id = $5
       RETURNING *`,
      [itemName, unit, unitCost, minimumThreshold, itemID]
    );
    return result.rows[0] || null;
  },

  // ── Get all low stock items ─────────────────────────────────────────────────
  async getLowStockItems() {
    const result = await pool.query(
      `SELECT * FROM inventory_items
       WHERE current_stock < minimum_threshold
       ORDER BY current_stock ASC`
    );
    return result.rows;
  },

  // ── Get stock usage history from harvest records and orders ─────────────────
  async getUsageHistory(itemID) {
    const item = await pool.query(
      `SELECT item_name FROM inventory_items WHERE item_id = $1`,
      [itemID]
    );
    if (!item.rows[0]) return [];

    const result = await pool.query(
      `SELECT
         hr.harvest_date  AS date,
         hr.quantity_harvested AS quantity,
         hr.unit,
         'Harvest In'     AS movement_type,
         cp.crop_type     AS reference
       FROM harvest_records hr
       JOIN crop_plans cp ON cp.plan_id = hr.crop_plan_id
       WHERE cp.crop_type ILIKE $1
       ORDER BY hr.harvest_date DESC
       LIMIT 50`,
      [item.rows[0].item_name]
    );
    return result.rows;
  },

  // ── Check if item exists ────────────────────────────────────────────────────
  async exists(itemID) {
    const result = await pool.query(
      `SELECT 1 FROM inventory_items WHERE item_id = $1`,
      [itemID]
    );
    return result.rows.length > 0;
  },
};

module.exports = InventoryModel;
