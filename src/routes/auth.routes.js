// =============================================================================
//  AMDAN ORGANICS – Auth Routes
// =============================================================================

const express        = require('express');
const router         = express.Router();
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Public routes (no token needed)
router.post('/register', AuthController.register);
router.post('/login',    AuthController.login);

// Protected routes (token required)
router.get ('/profile',         verifyToken, AuthController.getProfile);
router.put ('/profile',         verifyToken, AuthController.updateProfile);
router.put ('/change-password', verifyToken, AuthController.changePassword);

module.exports = router;
