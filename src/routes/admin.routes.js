// =============================================================================
//  AMDAN ORGANICS – Admin Routes
// =============================================================================

const express          = require('express');
const router           = express.Router();
const AdminController  = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/dashboard',
  authorizeRoles('SystemAdmin'),
  AdminController.getDashboardStats
);

// ── System logs ───────────────────────────────────────────────────────────────
router.get('/logs',
  authorizeRoles('SystemAdmin'),
  AdminController.getSystemLogs
);

// ── User management ───────────────────────────────────────────────────────────
router.get('/users',
  authorizeRoles('SystemAdmin'),
  AdminController.getAllUsers
);
router.get('/users/:userID',
  authorizeRoles('SystemAdmin'),
  AdminController.getUserByID
);
router.patch('/users/:userID/approve',
  authorizeRoles('SystemAdmin'),
  AdminController.approveUser
);
router.patch('/users/:userID/suspend',
  authorizeRoles('SystemAdmin'),
  AdminController.suspendUser
);
router.delete('/users/:userID',
  authorizeRoles('SystemAdmin'),
  AdminController.deleteUser
);

// ── Notifications (all roles) ─────────────────────────────────────────────────
router.get('/notifications',
  authorizeRoles('SystemAdmin','FarmManager','FarmStaff','InventoryOfficer','Buyer'),
  AdminController.getMyNotifications
);
router.patch('/notifications/:notificationID/read',
  authorizeRoles('SystemAdmin','FarmManager','FarmStaff','InventoryOfficer','Buyer'),
  AdminController.markNotificationRead
);

module.exports = router;