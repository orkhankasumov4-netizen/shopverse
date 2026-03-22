const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query, withTransaction } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// GET /api/orders — user order history
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = ['o.user_id = $1'];
  const params = [req.user.id];

  if (status) { params.push(status); conditions.push(`o.status = $${params.length}`); }

  params.push(parseInt(limit), offset);

  const { rows } = await query(`
    SELECT
      o.*,
      JSON_AGG(JSON_BUILD_OBJECT(
        'id', oi.id, 'title', oi.title, 'thumbnail', oi.thumbnail,
        'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price
      )) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  res.json({ success: true, orders: rows });
});

// GET /api/orders/:id — order detail
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await query(`
    SELECT o.*, u.email, u.first_name || ' ' || u.last_name AS customer_name
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = $1
  `, [id]);

  if (!rows.length) throw new AppError('Order not found', 404);
  const order = rows[0];

  // Check authorization
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403);
  }

  const { rows: items } = await query(`
    SELECT oi.*, p.slug AS product_slug
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `, [id]);

  res.json({ success: true, order: { ...order, items } });
});

// POST /api/orders/checkout — create Stripe session
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { shipping_address, billing_address, coupon_code } = req.body;

  // Get user's cart
  const { rows: cartRows } = await query(`
    SELECT ci.quantity, p.id AS product_id, p.title, p.price, p.thumbnail_url,
           p.stock, p.seller_id, pv.id AS variant_id, pv.name AS variant_name,
           pv.price_adj
    FROM carts c
    JOIN cart_items ci ON c.id = ci.cart_id
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE c.user_id = $1 AND p.is_active = TRUE
  `, [req.user.id]);

  if (!cartRows.length) throw new AppError('Cart is empty', 400);

  // Check stock
  for (const item of cartRows) {
    if (item.stock < item.quantity) {
      throw new AppError(`Insufficient stock for "${item.title}"`, 400);
    }
  }

  let subtotal = cartRows.reduce((sum, item) => {
    const price = parseFloat(item.price) + (parseFloat(item.price_adj) || 0);
    return sum + price * item.quantity;
  }, 0);

  // Apply coupon
  let discountAmount = 0;
  let couponData = null;
  if (coupon_code) {
    const { rows: coupons } = await query(`
      SELECT * FROM coupons
      WHERE code = $1 AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR used_count < max_uses)
    `, [coupon_code.toUpperCase()]);

    if (coupons.length) {
      couponData = coupons[0];
      if (subtotal >= couponData.min_order) {
        discountAmount = couponData.type === 'percentage'
          ? subtotal * (couponData.value / 100)
          : couponData.value;
        discountAmount = Math.min(discountAmount, subtotal);
      }
    }
  }

  const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
  const tax = (subtotal - discountAmount) * 0.08; // 8% tax
  const total = subtotal - discountAmount + shipping + tax;

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: req.user.email,
    line_items: cartRows.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          images: item.thumbnail_url ? [item.thumbnail_url] : [],
        },
        unit_amount: Math.round((parseFloat(item.price) + (parseFloat(item.price_adj) || 0)) * 100),
      },
      quantity: item.quantity,
    })),
    discounts: discountAmount > 0 ? undefined : undefined,
    shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
    success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.STRIPE_CANCEL_URL,
    metadata: {
      user_id: req.user.id,
      coupon_code: coupon_code || '',
      discount_amount: discountAmount.toFixed(2),
      shipping_address: JSON.stringify(shipping_address),
    },
  });

  // Create pending order
  const orderData = await withTransaction(async (client) => {
    const { rows: orderRows } = await client.query(`
      INSERT INTO orders
        (user_id, subtotal, discount_amount, shipping_amount, tax_amount, total,
         shipping_address, billing_address, payment_method, stripe_session_id,
         coupon_code, status, payment_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'stripe',$9,$10,'pending','pending')
      RETURNING *
    `, [
      req.user.id, subtotal, discountAmount, shipping, tax, total,
      JSON.stringify(shipping_address || {}),
      JSON.stringify(billing_address || shipping_address || {}),
      session.id, coupon_code || null
    ]);

    const order = orderRows[0];

    // Insert order items
    for (const item of cartRows) {
      const itemPrice = parseFloat(item.price) + (parseFloat(item.price_adj) || 0);
      await client.query(`
        INSERT INTO order_items
          (order_id, product_id, variant_id, seller_id, title, thumbnail, quantity, unit_price, total_price)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        order.id, item.product_id, item.variant_id || null, item.seller_id,
        item.title, item.thumbnail_url, item.quantity,
        itemPrice, itemPrice * item.quantity
      ]);
    }

    return order;
  });

  res.json({ success: true, sessionUrl: session.url, sessionId: session.id, orderId: orderData.id });
});

// POST /api/orders/webhook — Stripe webhook handler
const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.user_id;

    await withTransaction(async (client) => {
      // Update order status
      await client.query(`
        UPDATE orders
        SET status = 'confirmed', payment_status = 'paid',
            stripe_payment_id = $1, updated_at = NOW()
        WHERE stripe_session_id = $2
      `, [session.payment_intent, session.id]);

      // Get order items to reduce stock
      const { rows: order } = await client.query(
        'SELECT id FROM orders WHERE stripe_session_id = $1', [session.id]
      );

      if (order.length) {
        const { rows: items } = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1', [order[0].id]
        );

        // Reduce stock
        for (const item of items) {
          await client.query(
            'UPDATE products SET stock = stock - $1, sold_count = sold_count + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }

        // Clear cart
        await client.query(`
          DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)
        `, [userId]);
      }

      // Increment coupon usage
      const couponCode = session.metadata.coupon_code;
      if (couponCode) {
        await client.query(
          'UPDATE coupons SET used_count = used_count + 1 WHERE code = $1', [couponCode]
        );
      }
    });
  }

  res.json({ received: true });
});

// PUT /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const { rows } = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  if (!rows.length) throw new AppError('Order not found', 404);

  const order = rows[0];
  if (!['pending', 'confirmed'].includes(order.status)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }

  await query(`
    UPDATE orders SET status = 'cancelled', cancel_reason = $1, cancelled_at = NOW()
    WHERE id = $2
  `, [reason, id]);

  // Restore stock
  const { rows: items } = await query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]
  );
  for (const item of items) {
    await query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
  }

  res.json({ success: true, message: 'Order cancelled' });
});

// GET /api/orders/seller — seller's sales
const getSellerOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const params = [req.user.id];
  let statusFilter = '';
  if (status) { params.push(status); statusFilter = `AND o.status = $${params.length}`; }

  params.push(parseInt(limit), offset);

  const { rows } = await query(`
    SELECT
      oi.id AS item_id, oi.title, oi.quantity, oi.unit_price, oi.total_price,
      o.id AS order_id, o.order_number, o.status, o.created_at,
      u.email AS customer_email, u.first_name || ' ' || u.last_name AS customer_name
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN users u ON o.user_id = u.id
    WHERE oi.seller_id = $1 ${statusFilter}
    ORDER BY o.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  // Seller stats
  const { rows: stats } = await query(`
    SELECT
      COUNT(DISTINCT o.id) AS total_orders,
      COALESCE(SUM(oi.total_price), 0) AS total_revenue,
      COALESCE(SUM(oi.total_price) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days'), 0) AS monthly_revenue,
      COUNT(DISTINCT oi.id) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days') AS monthly_orders
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.seller_id = $1 AND o.payment_status = 'paid'
  `, [req.user.id]);

  res.json({ success: true, orders: rows, stats: stats[0] });
});

module.exports = { getOrders, getOrder, createCheckoutSession, stripeWebhook, cancelOrder, getSellerOrders };
