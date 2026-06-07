// =============================================================================
//  AMDAN ORGANICS – Field Activity Routes
// =============================================================================

const express           = require('express');
const router            = express.Router();
const FarmOpsController = require('../controllers/farmOps.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// Log a new field activity – FarmStaff only
router.post(
  '/',
  authorizeRoles('FarmStaff', 'FarmManager'),
  FarmOpsController.logFieldActivity
);

// Get my logged activities – FarmStaff
router.get(
  '/my-activities',
  authorizeRoles('FarmStaff'),
  FarmOpsController.getMyActivities
);

module.exports = router;