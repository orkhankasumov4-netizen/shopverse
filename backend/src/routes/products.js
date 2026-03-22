const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/productController');

router.get('/',                 optionalAuth, ctrl.getProducts);
router.get('/categories',       ctrl.getCategories);
router.get('/:slug',            optionalAuth, ctrl.getProduct);
router.get('/:id/reviews',      ctrl.getProductReviews);
router.post('/:id/reviews',     authenticate, ctrl.createReview);

router.post('/',                authenticate, authorize('seller', 'admin'), ctrl.createProduct);
router.put('/:id',              authenticate, authorize('seller', 'admin'), ctrl.updateProduct);
router.delete('/:id',           authenticate, authorize('seller', 'admin'), ctrl.deleteProduct);

module.exports = router;
