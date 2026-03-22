const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(authenticate, authorize('admin')); // all admin routes locked down

router.get('/dashboard',              ctrl.getDashboard);

router.get('/users',                  ctrl.getUsers);
router.put('/users/:id',              ctrl.updateUser);
router.delete('/users/:id',           ctrl.deleteUser);

router.get('/products',               ctrl.getAdminProducts);
router.put('/products/:id/feature',   ctrl.toggleProductFeatured);

router.get('/orders',                 ctrl.getAdminOrders);
router.put('/orders/:id/status',      ctrl.updateOrderStatus);

module.exports = router;
