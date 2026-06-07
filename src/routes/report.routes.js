// =============================================================================
//  AMDAN ORGANICS – Report Routes
// =============================================================================

const express            = require('express');
const router             = express.Router();
const ReportController   = require('../controllers/report.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// Sales & Revenue report
router.get('/sales',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  ReportController.generateSalesReport
);

// Inventory report
router.get('/inventory',
  authorizeRoles('InventoryOfficer', 'FarmManager', 'SystemAdmin'),
  ReportController.generateInventoryReport
);

// Crop performance report
router.get('/crops',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  ReportController.generateCropReport
);

// User activity report – Admin only
router.get('/users',
  authorizeRoles('SystemAdmin'),
  ReportController.generateUserReport
);

// Get my saved reports
router.get('/',
  authorizeRoles('FarmManager', 'InventoryOfficer', 'SystemAdmin'),
  ReportController.getMyReports
);

// Get single report
router.get('/:reportID',
  authorizeRoles('FarmManager', 'InventoryOfficer', 'SystemAdmin'),
  ReportController.getByID
);

// Export report as CSV
router.get('/:reportID/export',
  authorizeRoles('FarmManager', 'InventoryOfficer', 'SystemAdmin'),
  ReportController.exportCSV
);

module.exports = router;