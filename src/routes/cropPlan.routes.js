// =============================================================================
//  AMDAN ORGANICS – Crop Plan Routes
// =============================================================================

const express          = require('express');
const router           = express.Router();
const FarmOpsController = require('../controllers/farmOps.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// ── Crop Plan routes ──────────────────────────────────────────────────────────
// Create crop plan – FarmManager only
router.post(
  '/',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  FarmOpsController.createCropPlan
);

// Get all crop plans – FarmManager and Admin
router.get(
  '/',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  FarmOpsController.getAllCropPlans
);

// Get my assigned crop plans – FarmStaff
router.get(
  '/my-plans',
  authorizeRoles('FarmStaff'),
  FarmOpsController.getMyCropPlans
);

// Get single crop plan by ID
router.get(
  '/:planID',
  authorizeRoles('FarmManager', 'FarmStaff', 'SystemAdmin'),
  FarmOpsController.getCropPlanByID
);

// Update crop plan – FarmManager only
router.put(
  '/:planID',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  FarmOpsController.updateCropPlan
);

// Cancel crop plan – FarmManager only
router.patch(
  '/:planID/cancel',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  FarmOpsController.cancelCropPlan
);

// Get harvests for a plan
router.get(
  '/:planID/harvests',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  FarmOpsController.getHarvestsByPlan
);

// Get field activities for a plan
router.get(
  '/:planID/activities',
  authorizeRoles('FarmManager', 'FarmStaff', 'SystemAdmin'),
  FarmOpsController.getActivitiesByPlan
);

module.exports = router;
