const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(authenticate); // all user routes require auth

router.get('/profile',              ctrl.getProfile);
router.put('/profile',              ctrl.updateProfile);
router.put('/password',             ctrl.changePassword);

// Cart
router.get('/cart',                 ctrl.getCart);
router.post('/cart',                ctrl.addToCart);
router.put('/cart/:itemId',         ctrl.updateCartItem);
router.delete('/cart/:itemId',      ctrl.removeFromCart);
router.delete('/cart',              ctrl.clearCart);

// Wishlist
router.get('/wishlist',             ctrl.getWishlist);
router.post('/wishlist',            ctrl.addToWishlist);
router.delete('/wishlist/:productId', ctrl.removeFromWishlist);

// Addresses
router.get('/addresses',            ctrl.getAddresses);
router.post('/addresses',           ctrl.addAddress);
router.delete('/addresses/:id',     ctrl.deleteAddress);

// Notifications
router.get('/notifications',        ctrl.getNotifications);
router.put('/notifications/read',   ctrl.markNotificationsRead);

module.exports = router;
