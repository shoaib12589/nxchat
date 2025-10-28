const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter, validateRequest, validateEmail, validatePassword, validateName } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', 
  authLimiter,
  validateEmail(),
  validatePassword(),
  validateName(),
  validateRequest,
  authController.register
);

router.post('/login', 
  authLimiter,
  validateEmail(),
  validateRequest,
  authController.login
);

router.post('/forgot-password',
  authLimiter,
  validateEmail(),
  validateRequest,
  authController.forgotPassword
);

router.post('/reset-password',
  authLimiter,
  validatePassword(),
  validateRequest,
  authController.resetPassword
);

router.post('/verify-email',
  authLimiter,
  validateRequest,
  authController.verifyEmail
);

router.post('/resend-verification',
  authLimiter,
  validateEmail(),
  validateRequest,
  authController.resendVerification
);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);
router.post('/refresh-token', authenticateToken, authController.refreshToken);
router.get('/me', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
