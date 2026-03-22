// ============================================================
// auth.js
// ============================================================
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
], ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], ctrl.login);

router.post('/refresh',        ctrl.refreshToken);
router.post('/logout',         ctrl.logout);
router.get('/me',              authenticate, ctrl.getMe);
router.post('/forgot-password', body('email').isEmail(), ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);

module.exports = router;
