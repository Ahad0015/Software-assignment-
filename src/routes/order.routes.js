// =============================================================================
//  AMDAN ORGANICS – Order Routes
// =============================================================================

const express             = require('express');
const router              = express.Router();
const EcommerceController = require('../controllers/ecommerce.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/',
  authorizeRoles('Buyer', 'FarmManager', 'SystemAdmin'),
  EcommerceController.getOrders
);
router.patch('/:orderID/status',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  EcommerceController.updateOrderStatus
);

module.exports = router;