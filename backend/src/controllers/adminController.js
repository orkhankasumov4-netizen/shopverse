const { query } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// GET /api/admin/dashboard — platform analytics
const getDashboard = asyncHandler(async (req, res) => {
  const [users, products, orders, revenue] = await Promise.all([
    query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month,
      COUNT(*) FILTER (WHERE role = 'seller') AS sellers,
      COUNT(*) FILTER (WHERE role = 'buyer') AS buyers
    FROM users WHERE is_active = TRUE`),

    query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_active = TRUE) AS active,
      COUNT(*) FILTER (WHERE stock = 0) AS out_of_stock
    FROM products`),

    query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS this_month
    FROM orders`),

    query(`SELECT
      COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS total_revenue,
      COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid' AND created_at >= NOW() - INTERVAL '30 days'), 0) AS monthly_revenue,
      COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid' AND created_at >= NOW() - INTERVAL '7 days'), 0) AS weekly_revenue
    FROM orders`),
  ]);

  // Revenue by day (last 30 days)
  const { rows: revenueChart } = await query(`
    SELECT DATE(created_at) AS date, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders
    FROM orders
    WHERE payment_status = 'paid' AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  // Top selling products
  const { rows: topProducts } = await query(`
    SELECT p.id, p.title, p.thumbnail_url, p.price, p.sold_count, p.avg_rating,
           u.first_name || ' ' || u.last_name AS seller_name
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    ORDER BY p.sold_count DESC LIMIT 10
  `);

  res.json({
    success: true,
    stats: {
      users: users.rows[0],
      products: products.rows[0],
      orders: orders.rows[0],
      revenue: revenue.rows[0],
    },
    revenueChart,
    topProducts,
  });
});

// GET /api/admin/users
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, is_active } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`);
  }
  if (role) { params.push(role); conditions.push(`role = $${params.length}`); }
  if (is_active !== undefined) { params.push(is_active === 'true'); conditions.push(`is_active = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  const { rows } = await query(`
    SELECT id, email, first_name, last_name, role, is_active, is_verified, created_at,
           (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
    FROM users ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const { rows: count } = await query(`SELECT COUNT(*) FROM users ${where}`, params.slice(0, -2));

  res.json({ success: true, users: rows, total: parseInt(count[0].count) });
});

// PUT /api/admin/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, is_active } = req.body;

  if (id === req.user.id) throw new AppError('Cannot modify your own account', 400);

  const { rows } = await query(`
    UPDATE users SET
      role = COALESCE($1, role),
      is_active = COALESCE($2, is_active),
      updated_at = NOW()
    WHERE id = $3 RETURNING id, email, role, is_active
  `, [role, is_active, id]);

  if (!rows.length) throw new AppError('User not found', 404);
  res.json({ success: true, user: rows[0] });
});

// DELETE /api/admin/users/:id (soft delete)
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new AppError('Cannot delete your own account', 400);
  await query('UPDATE users SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'User deactivated' });
});

// GET /api/admin/products
const getAdminProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, category, is_active } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.title ILIKE $${params.length}`);
  }
  if (category) { params.push(category); conditions.push(`c.slug = $${params.length}`); }
  if (is_active !== undefined) { params.push(is_active === 'true'); conditions.push(`p.is_active = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  const { rows } = await query(`
    SELECT p.*, c.name AS category_name, u.email AS seller_email,
           u.first_name || ' ' || u.last_name AS seller_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.seller_id = u.id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  res.json({ success: true, products: rows });
});

// PUT /api/admin/products/:id/feature
const toggleProductFeatured = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    UPDATE products SET is_featured = NOT is_featured WHERE id = $1
    RETURNING id, is_featured
  `, [req.params.id]);
  res.json({ success: true, product: rows[0] });
});

// GET /api/admin/orders
const getAdminOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params = [];

  if (status) { params.push(status); conditions.push(`o.status = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(o.order_number ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  const { rows } = await query(`
    SELECT o.*, u.email, u.first_name || ' ' || u.last_name AS customer_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  res.json({ success: true, orders: rows });
});

// PUT /api/admin/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

  const updates = { status };
  if (status === 'shipped') updates.shipped_at = new Date();
  if (status === 'delivered') updates.delivered_at = new Date();

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...Object.values(updates), req.params.id];

  const { rows } = await query(
    `UPDATE orders SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );

  if (!rows.length) throw new AppError('Order not found', 404);
  res.json({ success: true, order: rows[0] });
});

module.exports = {
  getDashboard, getUsers, updateUser, deleteUser,
  getAdminProducts, toggleProductFeatured,
  getAdminOrders, updateOrderStatus,
};
