// =============================================================================
//  AMDAN ORGANICS – Market Price Routes
// =============================================================================

const express                = require('express');
const router                 = express.Router();
const MarketPriceController  = require('../controllers/marketPrice.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/',
  authorizeRoles('FarmManager', 'SystemAdmin', 'Buyer'),
  MarketPriceController.getAll
);
router.get('/trend/:cropName',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  MarketPriceController.getTrend
);
router.post('/',
  authorizeRoles('SystemAdmin'),
  MarketPriceController.create
);
router.put('/:priceID',
  authorizeRoles('SystemAdmin'),
  MarketPriceController.update
);
router.delete('/:priceID',
  authorizeRoles('SystemAdmin'),
  MarketPriceController.delete
);

module.exports = router;