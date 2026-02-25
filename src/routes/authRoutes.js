const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const {
    validateLogin,
    validateForgotPassword,
    validateResetPassword
} = require('../middleware/validation');
const {
    authLimiter,
    passwordResetLimiter
} = require('../middleware/rateLimiter');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, authController.login);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Initiate password reset process
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset user password with token
 * @access  Public
 */
router.post('/reset-password', passwordResetLimiter, validateResetPassword, authController.resetPassword);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and revoke tokens
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get authenticated user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
