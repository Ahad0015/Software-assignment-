// =============================================================================
//  AMDAN ORGANICS – Produce Listing Routes
// =============================================================================

const express             = require('express');
const router              = express.Router();
const EcommerceController = require('../controllers/ecommerce.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

// Marketplace – buyers browse published listings
router.get('/marketplace',
  authorizeRoles('Buyer', 'FarmManager', 'SystemAdmin'),
  EcommerceController.getMarketplace
);

// All listings – manager and admin
router.get('/',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  EcommerceController.getAllListings
);

// Single listing
router.get('/:listingID',
  authorizeRoles('FarmManager', 'SystemAdmin', 'Buyer'),
  EcommerceController.getListingByID
);

// Create listing
router.post('/',
  authorizeRoles('FarmManager'),
  EcommerceController.createListing
);

// Update listing
router.put('/:listingID',
  authorizeRoles('FarmManager'),
  EcommerceController.updateListing
);

// Approve listing
router.patch('/:listingID/approve',
  authorizeRoles('SystemAdmin'),
  EcommerceController.approveListing
);

// Reject listing
router.patch('/:listingID/reject',
  authorizeRoles('SystemAdmin'),
  EcommerceController.rejectListing
);

// Remove listing
router.patch('/:listingID/remove',
  authorizeRoles('FarmManager', 'SystemAdmin'),
  EcommerceController.removeListing
);

module.exports = router;