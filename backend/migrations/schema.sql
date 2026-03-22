-- ============================================================
-- E-Commerce Marketplace - PostgreSQL Schema
-- Production-ready with indexes, constraints, and full-text search
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'buyer'
                CHECK (role IN ('buyer', 'seller', 'admin')),
  avatar_url    TEXT,
  phone         VARCHAR(20),
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  stripe_customer_id VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ============================================================
-- ADDRESSES TABLE
-- ============================================================
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(50) DEFAULT 'Home',
  full_name   VARCHAR(200) NOT NULL,
  line1       VARCHAR(255) NOT NULL,
  line2       VARCHAR(255),
  city        VARCHAR(100) NOT NULL,
  state       VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country     VARCHAR(100) NOT NULL DEFAULT 'US',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug      ON categories(slug);
CREATE INDEX idx_categories_parent    ON categories(parent_id);

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  slug            VARCHAR(500) UNIQUE NOT NULL,
  description     TEXT,
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_price   NUMERIC(12,2),
  cost_price      NUMERIC(12,2),
  sku             VARCHAR(100) UNIQUE,
  barcode         VARCHAR(100),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_alert INTEGER DEFAULT 5,
  weight          NUMERIC(8,2),
  dimensions      JSONB,
  images          TEXT[] DEFAULT '{}',
  thumbnail_url   TEXT,
  tags            TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  sold_count      INTEGER DEFAULT 0,
  search_vector   TSVECTOR,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_seller      ON products(seller_id);
CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_price       ON products(price);
CREATE INDEX idx_products_rating      ON products(avg_rating DESC);
CREATE INDEX idx_products_featured    ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_active      ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_search      ON products USING GIN(search_vector);
CREATE INDEX idx_products_tags        ON products USING GIN(tags);
CREATE INDEX idx_products_title_trgm  ON products USING GIN(title gin_trgm_ops);
CREATE INDEX idx_products_created     ON products(created_at DESC);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PRODUCT VARIANTS (e.g. sizes, colors)
-- ============================================================
CREATE TABLE product_variants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  value      VARCHAR(100) NOT NULL,
  price_adj  NUMERIC(10,2) DEFAULT 0,
  stock      INTEGER NOT NULL DEFAULT 0,
  sku        VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    UUID,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(200),
  body        TEXT,
  images      TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  helpful_votes INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user    ON reviews(user_id);
CREATE INDEX idx_reviews_rating  ON reviews(rating);

-- Update product avg_rating when review changes
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    avg_rating   = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_review_change
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- ============================================================
-- CARTS TABLE
-- ============================================================
CREATE TABLE carts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id    UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- ============================================================
-- WISHLIST TABLE
-- ============================================================
CREATE TABLE wishlists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON wishlists(user_id);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        VARCHAR(20) UNIQUE NOT NULL,
  user_id             UUID NOT NULL REFERENCES users(id),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal            NUMERIC(12,2) NOT NULL,
  discount_amount     NUMERIC(12,2) DEFAULT 0,
  shipping_amount     NUMERIC(12,2) DEFAULT 0,
  tax_amount          NUMERIC(12,2) DEFAULT 0,
  total               NUMERIC(12,2) NOT NULL,
  currency            VARCHAR(3) DEFAULT 'USD',
  shipping_address    JSONB NOT NULL,
  billing_address     JSONB,
  payment_method      VARCHAR(50),
  payment_status      VARCHAR(20) DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','paid','failed','refunded')),
  stripe_payment_id   VARCHAR(200),
  stripe_session_id   VARCHAR(200),
  coupon_code         VARCHAR(50),
  notes               TEXT,
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user    ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_number  ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- ORDER ITEMS TABLE
-- ============================================================
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id),
  variant_id   UUID REFERENCES product_variants(id),
  seller_id    UUID NOT NULL REFERENCES users(id),
  title        VARCHAR(500) NOT NULL,
  thumbnail    TEXT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(12,2) NOT NULL,
  total_price  NUMERIC(12,2) NOT NULL,
  status       VARCHAR(30) DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_seller  ON order_items(seller_id);

-- ============================================================
-- COUPONS TABLE
-- ============================================================
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(50) UNIQUE NOT NULL,
  type            VARCHAR(20) CHECK (type IN ('percentage','fixed')),
  value           NUMERIC(10,2) NOT NULL,
  min_order       NUMERIC(10,2) DEFAULT 0,
  max_uses        INTEGER,
  used_count      INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT,
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO categories (name, slug, description) VALUES
  ('Electronics',    'electronics',    'Phones, laptops, gadgets and more'),
  ('Fashion',        'fashion',        'Clothing, shoes and accessories'),
  ('Home & Garden',  'home-garden',    'Furniture, decor and garden tools'),
  ('Sports',         'sports',         'Equipment and sportswear'),
  ('Books',          'books',          'Books, e-books and audiobooks'),
  ('Beauty',         'beauty',         'Skincare, makeup and personal care'),
  ('Toys',           'toys',           'Toys and games for all ages'),
  ('Automotive',     'automotive',     'Car parts and accessories');
