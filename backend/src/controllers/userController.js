const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// GET /api/users/profile
const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT id, email, first_name, last_name, role, avatar_url, phone, is_verified, created_at
    FROM users WHERE id = $1
  `, [req.user.id]);
  res.json({ success: true, user: rows[0] });
});

// PUT /api/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, phone, avatar_url } = req.body;

  const { rows } = await query(`
    UPDATE users SET first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name), phone = COALESCE($3, phone),
      avatar_url = COALESCE($4, avatar_url), updated_at = NOW()
    WHERE id = $5
    RETURNING id, email, first_name, last_name, role, avatar_url, phone
  `, [first_name, last_name, phone, avatar_url, req.user.id]);

  res.json({ success: true, user: rows[0] });
});

// PUT /api/users/password
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!isMatch) throw new AppError('Current password is incorrect', 400);

  const hash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

  res.json({ success: true, message: 'Password updated' });
});

// ============================================================
// CART
// ============================================================

// GET /api/users/cart
const getCart = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT
      ci.id, ci.quantity, ci.added_at,
      p.id AS product_id, p.title, p.slug, p.price, p.thumbnail_url, p.stock,
      pv.id AS variant_id, pv.name AS variant_name, pv.value AS variant_value, pv.price_adj
    FROM carts c
    JOIN cart_items ci ON c.id = ci.cart_id
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE c.user_id = $1 AND p.is_active = TRUE
  `, [req.user.id]);

  const subtotal = rows.reduce((sum, item) => {
    const price = parseFloat(item.price) + (parseFloat(item.price_adj) || 0);
    return sum + price * item.quantity;
  }, 0);

  res.json({ success: true, items: rows, subtotal: parseFloat(subtotal.toFixed(2)), itemCount: rows.length });
});

// POST /api/users/cart
const addToCart = asyncHandler(async (req, res) => {
  const { product_id, variant_id, quantity = 1 } = req.body;

  // Ensure cart exists
  const { rows: carts } = await query(
    'INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id RETURNING id',
    [req.user.id]
  );
  const cartId = carts[0].id;

  // Verify product exists and has stock
  const { rows: products } = await query(
    'SELECT stock FROM products WHERE id = $1 AND is_active = TRUE', [product_id]
  );
  if (!products.length) throw new AppError('Product not found', 404);
  if (products[0].stock < quantity) throw new AppError('Insufficient stock', 400);

  // Upsert cart item
  await query(`
    INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cart_id, product_id, variant_id)
    DO UPDATE SET quantity = cart_items.quantity + $4
  `, [cartId, product_id, variant_id || null, quantity]);

  res.json({ success: true, message: 'Added to cart' });
});

// PUT /api/users/cart/:itemId
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity <= 0) {
    await query(`
      DELETE FROM cart_items WHERE id = $1
        AND cart_id = (SELECT id FROM carts WHERE user_id = $2)
    `, [itemId, req.user.id]);
    return res.json({ success: true, message: 'Item removed' });
  }

  await query(`
    UPDATE cart_items SET quantity = $1
    WHERE id = $2 AND cart_id = (SELECT id FROM carts WHERE user_id = $3)
  `, [quantity, itemId, req.user.id]);

  res.json({ success: true, message: 'Cart updated' });
});

// DELETE /api/users/cart/:itemId
const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  await query(`
    DELETE FROM cart_items WHERE id = $1
      AND cart_id = (SELECT id FROM carts WHERE user_id = $2)
  `, [itemId, req.user.id]);

  res.json({ success: true, message: 'Item removed' });
});

// DELETE /api/users/cart
const clearCart = asyncHandler(async (req, res) => {
  await query(`
    DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)
  `, [req.user.id]);
  res.json({ success: true, message: 'Cart cleared' });
});

// ============================================================
// WISHLIST
// ============================================================

// GET /api/users/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT w.id, w.added_at, p.id AS product_id, p.title, p.slug, p.price,
           p.thumbnail_url, p.avg_rating, p.stock
    FROM wishlists w
    JOIN products p ON w.product_id = p.id
    WHERE w.user_id = $1 AND p.is_active = TRUE
    ORDER BY w.added_at DESC
  `, [req.user.id]);
  res.json({ success: true, wishlist: rows });
});

// POST /api/users/wishlist
const addToWishlist = asyncHandler(async (req, res) => {
  const { product_id } = req.body;
  await query(
    'INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.id, product_id]
  );
  res.json({ success: true, message: 'Added to wishlist' });
});

// DELETE /api/users/wishlist/:productId
const removeFromWishlist = asyncHandler(async (req, res) => {
  await query(
    'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
    [req.user.id, req.params.productId]
  );
  res.json({ success: true, message: 'Removed from wishlist' });
});

// ============================================================
// ADDRESSES
// ============================================================

const getAddresses = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC', [req.user.id]);
  res.json({ success: true, addresses: rows });
});

const addAddress = asyncHandler(async (req, res) => {
  const { label, full_name, line1, line2, city, state, postal_code, country, is_default } = req.body;

  if (is_default) {
    await query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
  }

  const { rows } = await query(`
    INSERT INTO addresses (user_id, label, full_name, line1, line2, city, state, postal_code, country, is_default)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `, [req.user.id, label, full_name, line1, line2, city, state, postal_code, country || 'US', is_default || false]);

  res.status(201).json({ success: true, address: rows[0] });
});

const deleteAddress = asyncHandler(async (req, res) => {
  await query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true, message: 'Address deleted' });
});

// ============================================================
// NOTIFICATIONS
// ============================================================

const getNotifications = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
  `, [req.user.id]);
  res.json({ success: true, notifications: rows });
});

const markNotificationsRead = asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
});

module.exports = {
  getProfile, updateProfile, changePassword,
  getCart, addToCart, updateCartItem, removeFromCart, clearCart,
  getWishlist, addToWishlist, removeFromWishlist,
  getAddresses, addAddress, deleteAddress,
  getNotifications, markNotificationsRead,
};
