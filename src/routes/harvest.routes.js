// =============================================================================
//  AMDAN ORGANICS – Harvest Routes
// =============================================================================

const express           = require('express');
const router            = express.Router();
const FarmOpsController = require('../controllers/farmOps.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// Record a new harvest – FarmManager only
router.post(
  '/',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  FarmOpsController.recordHarvest
);

// Get all harvests with optional filters
router.get(
  '/',
  authorizeRoles('FarmManager', 'SystemAdmin', 'InventoryOfficer'),
  FarmOpsController.getAllHarvests
);

module.exports = router;
