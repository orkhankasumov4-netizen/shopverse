const slugify = require('slugify');
const { query, withTransaction } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');

// GET /api/products — list with search, filters, sort, pagination
const getProducts = asyncHandler(async (req, res) => {
  const {
    search, category, minPrice, maxPrice, minRating,
    sort = 'created_at', order = 'desc',
    page = 1, limit = 20, featured, seller
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const conditions = ['p.is_active = TRUE'];

  if (search) {
    params.push(search);
    conditions.push(`(p.search_vector @@ plainto_tsquery('english', $${params.length}) OR p.title ILIKE '%' || $${params.length} || '%')`);
  }
  if (category) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (minPrice) { params.push(minPrice); conditions.push(`p.price >= $${params.length}`); }
  if (maxPrice) { params.push(maxPrice); conditions.push(`p.price <= $${params.length}`); }
  if (minRating) { params.push(minRating); conditions.push(`p.avg_rating >= $${params.length}`); }
  if (featured === 'true') conditions.push('p.is_featured = TRUE');
  if (seller) { params.push(seller); conditions.push(`p.seller_id = $${params.length}`); }

  const allowedSorts = { price: 'p.price', rating: 'p.avg_rating', created_at: 'p.created_at', sold: 'p.sold_count' };
  const sortCol = allowedSorts[sort] || 'p.created_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Add search ranking if searching
  const rankSelect = search ? `, ts_rank(p.search_vector, plainto_tsquery('english', $1)) as rank` : '';
  const rankOrder = search ? ', rank DESC' : '';

  params.push(parseInt(limit), offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const sql = `
    SELECT
      p.id, p.title, p.slug, p.price, p.compare_price, p.thumbnail_url,
      p.avg_rating, p.review_count, p.stock, p.is_featured,
      c.name AS category_name, c.slug AS category_slug,
      u.first_name || ' ' || u.last_name AS seller_name
      ${rankSelect}
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.seller_id = u.id
    ${where}
    ORDER BY ${sortCol} ${sortDir}${rankOrder}
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  const countSql = `
    SELECT COUNT(*) FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${where}
  `;

  const [productsResult, countResult] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, -2)),
  ]);

  const total = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(total / parseInt(limit));

  res.json({
    success: true,
    products: productsResult.rows,
    pagination: { total, totalPages, currentPage: parseInt(page), limit: parseInt(limit) },
  });
});

// GET /api/products/:slug — single product with details
const getProduct = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const cacheKey = `product:${slug}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json({ success: true, ...cached });

  const { rows } = await query(`
    SELECT
      p.*,
      c.name AS category_name, c.slug AS category_slug,
      u.id AS seller_id, u.first_name || ' ' || u.last_name AS seller_name,
      u.avatar_url AS seller_avatar
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.seller_id = u.id
    WHERE p.slug = $1 AND p.is_active = TRUE
  `, [slug]);

  if (!rows.length) throw new AppError('Product not found', 404);

  const product = rows[0];

  // Fetch variants
  const { rows: variants } = await query(
    'SELECT * FROM product_variants WHERE product_id = $1',
    [product.id]
  );

  // Fetch recent reviews (paginated separately via /api/products/:id/reviews)
  const { rows: reviews } = await query(`
    SELECT r.*, u.first_name || ' ' || u.last_name AS reviewer_name, u.avatar_url
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.product_id = $1
    ORDER BY r.created_at DESC LIMIT 5
  `, [product.id]);

  const data = { product: { ...product, variants, reviews } };
  await setCache(cacheKey, data, 300); // 5-minute cache

  res.json({ success: true, ...data });
});

// POST /api/products — create (seller/admin)
const createProduct = asyncHandler(async (req, res) => {
  const {
    title, description, price, compare_price, category_id,
    stock, sku, tags, images, thumbnail_url, weight, dimensions
  } = req.body;

  const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();

  const { rows } = await query(`
    INSERT INTO products
      (seller_id, category_id, title, slug, description, price, compare_price,
       stock, sku, tags, images, thumbnail_url, weight, dimensions)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *
  `, [
    req.user.id, category_id, title, slug, description, price, compare_price,
    stock || 0, sku, tags || [], images || [], thumbnail_url, weight, dimensions
  ]);

  await deleteCachePattern('products:*');

  res.status(201).json({ success: true, product: rows[0] });
});

// PUT /api/products/:id — update
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check ownership
  const { rows: existing } = await query('SELECT seller_id FROM products WHERE id = $1', [id]);
  if (!existing.length) throw new AppError('Product not found', 404);
  if (existing[0].seller_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this product', 403);
  }

  const updates = [];
  const params = [];
  const allowed = ['title', 'description', 'price', 'compare_price', 'stock', 'category_id',
    'tags', 'images', 'thumbnail_url', 'is_active', 'is_featured', 'sku', 'weight'];

  allowed.forEach(field => {
    if (req.body[field] !== undefined) {
      params.push(req.body[field]);
      updates.push(`${field} = $${params.length}`);
    }
  });

  if (!updates.length) throw new AppError('No valid fields to update', 400);

  // Auto-update slug if title changed
  if (req.body.title) {
    const newSlug = slugify(req.body.title, { lower: true, strict: true }) + '-' + Date.now();
    params.push(newSlug);
    updates.push(`slug = $${params.length}`);
  }

  params.push(id);
  const { rows } = await query(
    `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );

  await deleteCachePattern(`product:${rows[0].slug}`);
  await deleteCachePattern('products:*');

  res.json({ success: true, product: rows[0] });
});

// DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await query('SELECT seller_id, slug FROM products WHERE id = $1', [id]);
  if (!rows.length) throw new AppError('Product not found', 404);

  if (rows[0].seller_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403);
  }

  await query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
  await deleteCachePattern(`product:${rows[0].slug}`);

  res.json({ success: true, message: 'Product deleted' });
});

// GET /api/products/:id/reviews
const getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows } = await query(`
    SELECT r.*, u.first_name || ' ' || u.last_name AS reviewer_name, u.avatar_url
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.product_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `, [id, parseInt(limit), offset]);

  const { rows: stats } = await query(`
    SELECT
      COUNT(*) as total,
      AVG(rating) as avg_rating,
      COUNT(*) FILTER (WHERE rating = 5) as five_star,
      COUNT(*) FILTER (WHERE rating = 4) as four_star,
      COUNT(*) FILTER (WHERE rating = 3) as three_star,
      COUNT(*) FILTER (WHERE rating = 2) as two_star,
      COUNT(*) FILTER (WHERE rating = 1) as one_star
    FROM reviews WHERE product_id = $1
  `, [id]);

  res.json({ success: true, reviews: rows, stats: stats[0] });
});

// POST /api/products/:id/reviews
const createReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, body, images } = req.body;

  // Check if user purchased the product
  const { rows: purchased } = await query(`
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_id = $1 AND o.user_id = $2 AND o.status = 'delivered'
    LIMIT 1
  `, [id, req.user.id]);

  const is_verified = purchased.length > 0;

  const { rows } = await query(`
    INSERT INTO reviews (product_id, user_id, rating, title, body, images, is_verified)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
  `, [id, req.user.id, rating, title, body, images || [], is_verified]);

  await deleteCachePattern(`product:*`);

  res.status(201).json({ success: true, review: rows[0] });
});

// GET /api/categories
const getCategories = asyncHandler(async (req, res) => {
  const cached = await getCache('categories');
  if (cached) return res.json({ success: true, categories: cached });

  const { rows } = await query(
    'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order, name'
  );

  await setCache('categories', rows, 3600); // 1 hour
  res.json({ success: true, categories: rows });
});

module.exports = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getProductReviews, createReview, getCategories,
};
