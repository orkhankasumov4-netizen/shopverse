// orders.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.post('/webhook',          ctrl.stripeWebhook);
router.post('/checkout',         authenticate, ctrl.createCheckoutSession);
router.get('/',                  authenticate, ctrl.getOrders);
router.get('/seller',            authenticate, authorize('seller', 'admin'), ctrl.getSellerOrders);
router.get('/:id',               authenticate, ctrl.getOrder);
router.put('/:id/cancel',        authenticate, ctrl.cancelOrder);

module.exports = router;
