// =============================================================================
//  AMDAN ORGANICS – Purchase Inquiry Routes
// =============================================================================

const express             = require('express');
const router              = express.Router();
const EcommerceController = require('../controllers/ecommerce.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/',
  authorizeRoles('Buyer', 'FarmManager', 'SystemAdmin'),
  EcommerceController.getInquiries
);
router.post('/',
  authorizeRoles('Buyer'),
  EcommerceController.submitInquiry
);
router.patch('/:inquiryID/respond',
  authorizeRoles('FarmManager'),
  EcommerceController.respondToInquiry
);

module.exports = router;