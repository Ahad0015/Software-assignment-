// =============================================================================
//  AMDAN ORGANICS – Inventory Controller
// =============================================================================

const InventoryModel = require('../models/inventory.model');
const pool           = require('../db');

const InventoryController = {

  // ── Get all inventory items ─────────────────────────────────────────────────
  async getAll(req, res) {
    try {
      const { category, stockStatus } = req.query;
      const items = await InventoryModel.getAll({ category, stockStatus });

      // Count alerts
      const lowStockCount = items.filter(
        i => parseFloat(i.current_stock) < parseFloat(i.minimum_threshold)
      ).length;

      return res.status(200).json({
        count         : items.length,
        lowStockAlerts: lowStockCount,
        items
      });
    } catch (err) {
      console.error('Get inventory error:', err.message);
      return res.status(500).json({ message: 'Server error fetching inventory.' });
    }
  },

  // ── Get single inventory item ───────────────────────────────────────────────
  async getByID(req, res) {
    try {
      const { itemID } = req.params;
      const item = await InventoryModel.getByID(itemID);

      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found.' });
      }

      // Get usage history
      const history = await InventoryModel.getUsageHistory(itemID);

      return res.status(200).json({
        item,
        isLowStock : parseFloat(item.current_stock) < parseFloat(item.minimum_threshold),
        history
      });
    } catch (err) {
      console.error('Get inventory item error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Create new inventory item ───────────────────────────────────────────────
  async create(req, res) {
    try {
      const { itemName, category, currentStock, unit, unitCost, minimumThreshold } = req.body;

      if (!itemName || !category || !unit) {
        return res.status(400).json({
          message: 'itemName, category and unit are required.'
        });
      }

      // Check valid category
      const validCategories = ['Produce', 'Seeds', 'Fertilizer', 'Pesticide', 'Equipment', 'Other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        });
      }

      // Check for duplicate
      const existing = await InventoryModel.getByNameAndCategory(itemName, category);
      if (existing) {
        return res.status(409).json({
          message: `Item "${itemName}" already exists in category "${category}".`
        });
      }

      const item = await InventoryModel.create({
        itemName,
        category,
        currentStock : parseFloat(currentStock) || 0,
        unit,
        unitCost     : parseFloat(unitCost) || 0,
        minimumThreshold: parseFloat(minimumThreshold) || 0
      });

      return res.status(201).json({
        message: 'Inventory item created successfully.',
        item
      });
    } catch (err) {
      console.error('Create inventory item error:', err.message);
      return res.status(500).json({ message: 'Server error creating item.' });
    }
  },

  // ── Record incoming stock ───────────────────────────────────────────────────
  async recordIncomingStock(req, res) {
    try {
      const { itemID }              = req.params;
      const { quantity, unitCost }  = req.body;

      if (!quantity || parseFloat(quantity) <= 0) {
        return res.status(400).json({ message: 'quantity must be greater than 0.' });
      }

      const item = await InventoryModel.getByID(itemID);
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found.' });
      }

      const updated = await InventoryModel.addStock(
        itemID,
        parseFloat(quantity),
        unitCost ? parseFloat(unitCost) : null
      );

      // Log to system_logs
      await pool.query(
        `INSERT INTO system_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, 'stock_added', 'inventory_item', $2, $3)`,
        [
          req.user.userID,
          itemID,
          JSON.stringify({ quantity, itemName: item.item_name })
        ]
      );

      return res.status(200).json({
        message     : `${quantity} ${item.unit} of "${item.item_name}" added to stock.`,
        updatedItem : updated
      });
    } catch (err) {
      console.error('Record incoming stock error:', err.message);
      return res.status(500).json({ message: 'Server error recording stock.' });
    }
  },

  // ── Record stock usage ──────────────────────────────────────────────────────
  async recordStockUsage(req, res) {
    try {
      const { itemID }   = req.params;
      const { quantity } = req.body;

      if (!quantity || parseFloat(quantity) <= 0) {
        return res.status(400).json({ message: 'quantity must be greater than 0.' });
      }

      const item = await InventoryModel.getByID(itemID);
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found.' });
      }

      // Check enough stock available
      if (parseFloat(quantity) > parseFloat(item.current_stock)) {
        return res.status(400).json({
          message : `Insufficient stock. Available: ${item.current_stock} ${item.unit}.`,
          available: item.current_stock
        });
      }

      const updated = await InventoryModel.deductStock(itemID, parseFloat(quantity));

      // Check if now below threshold → send low stock notification
      if (parseFloat(updated.current_stock) < parseFloat(updated.minimum_threshold)) {
        // Notify all InventoryOfficers and FarmManagers
        const managers = await pool.query(
          `SELECT user_id FROM users
           WHERE role IN ('InventoryOfficer', 'FarmManager')
             AND status = 'Approved'`
        );
        for (const user of managers.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, message, reference_id)
             VALUES ($1, 'low_stock', $2, $3)`,
            [
              user.user_id,
              `LOW STOCK ALERT: "${item.item_name}" is below minimum threshold. Current stock: ${updated.current_stock} ${item.unit}.`,
              itemID
            ]
          );
        }
      }

      // Log usage
      await pool.query(
        `INSERT INTO system_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, 'stock_used', 'inventory_item', $2, $3)`,
        [
          req.user.userID,
          itemID,
          JSON.stringify({ quantity, itemName: item.item_name })
        ]
      );

      return res.status(200).json({
        message      : `${quantity} ${item.unit} of "${item.item_name}" deducted from stock.`,
        updatedItem  : updated,
        lowStockAlert: parseFloat(updated.current_stock) < parseFloat(updated.minimum_threshold)
      });
    } catch (err) {
      console.error('Record stock usage error:', err.message);
      return res.status(500).json({ message: 'Server error recording usage.' });
    }
  },

  // ── Update inventory item details ───────────────────────────────────────────
  async update(req, res) {
    try {
      const { itemID } = req.params;

      const item = await InventoryModel.getByID(itemID);
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found.' });
      }

      const updated = await InventoryModel.update(itemID, req.body);
      return res.status(200).json({
        message: 'Inventory item updated.',
        item   : updated
      });
    } catch (err) {
      console.error('Update inventory error:', err.message);
      return res.status(500).json({ message: 'Server error updating item.' });
    }
  },

  // ── Get all low stock alerts ────────────────────────────────────────────────
  async getLowStockAlerts(req, res) {
    try {
      const items = await InventoryModel.getLowStockItems();
      return res.status(200).json({
        count: items.length,
        message: items.length > 0
          ? `${items.length} item(s) are below minimum stock threshold.`
          : 'All items are adequately stocked.',
        items
      });
    } catch (err) {
      console.error('Get low stock error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = InventoryController;
