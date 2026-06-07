// =============================================================================
//  AMDAN ORGANICS – Inventory Routes
// =============================================================================

const express               = require('express');
const router                = express.Router();
const InventoryController   = require('../controllers/inventory.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// ── Get all inventory items (with optional filters) ───────────────────────────
router.get(
  '/',
  authorizeRoles('InventoryOfficer', 'FarmManager', 'SystemAdmin'),
  InventoryController.getAll
);

// ── Get low stock alerts ──────────────────────────────────────────────────────
router.get(
  '/low-stock',
  authorizeRoles('InventoryOfficer', 'FarmManager', 'SystemAdmin'),
  InventoryController.getLowStockAlerts
);

// ── Get single inventory item ─────────────────────────────────────────────────
router.get(
  '/:itemID',
  authorizeRoles('InventoryOfficer', 'FarmManager', 'SystemAdmin'),
  InventoryController.getByID
);

// ── Create new inventory item ─────────────────────────────────────────────────
router.post(
  '/',
  authorizeRoles('InventoryOfficer', 'SystemAdmin'),
  InventoryController.create
);

// ── Record incoming stock ─────────────────────────────────────────────────────
router.patch(
  '/:itemID/add-stock',
  authorizeRoles('InventoryOfficer', 'SystemAdmin'),
  InventoryController.recordIncomingStock
);

// ── Record stock usage ────────────────────────────────────────────────────────
router.patch(
  '/:itemID/use-stock',
  authorizeRoles('InventoryOfficer', 'FarmManager', 'SystemAdmin'),
  InventoryController.recordStockUsage
);

// ── Update item details ───────────────────────────────────────────────────────
router.put(
  '/:itemID',
  authorizeRoles('InventoryOfficer', 'SystemAdmin'),
  InventoryController.update
);

module.exports = router;