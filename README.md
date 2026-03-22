# 🛒 ShopVerse — Full-Stack E-Commerce Marketplace

A production-grade, Amazon-like e-commerce marketplace built with Next.js, Node.js/Express, PostgreSQL, Redis, and Stripe. Designed for **millions of users** with real-world scalability patterns.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js 14)                       │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Buyer UI │  │ Seller UI  │  │ Admin UI │  │   Auth UI    │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST API
┌────────────────────────▼────────────────────────────────────────┐
│                   API GATEWAY (Express + Helmet)                  │
│   Rate Limiting · CORS · JWT Auth · Request Validation           │
└────────────────────────┬────────────────────────────────────────┘
         ┌───────────────┼───────────────────┐
         ▼               ▼                   ▼
    ┌─────────┐    ┌──────────┐       ┌──────────┐
    │ Auth    │    │ Products │       │ Orders   │
    │ Service │    │ Service  │       │ Service  │
    └────┬────┘    └────┬─────┘       └────┬─────┘
         │              │                   │
         └──────────────┼───────────────────┘
                        ▼
          ┌─────────────────────────┐
          │     PostgreSQL (DB)     │  ← Persistent data
          └─────────────────────────┘
          ┌─────────────────────────┐
          │      Redis (Cache)      │  ← Session/product cache
          └─────────────────────────┘
          ┌─────────────────────────┐
          │     Stripe (Payments)   │  ← Checkout + webhooks
          └─────────────────────────┘
```

---

## ✨ Features

### Buyer Features
- 🔐 Register / Login with JWT (access + refresh tokens)
- 🔍 Full-text product search with GIN/tsvector indexes
- 🎛️ Advanced filters: price range, category, rating, sort
- 🛒 Cart with optimistic UI updates
- ❤️ Wishlist
- 💳 Secure checkout via Stripe
- 📦 Order history & tracking
- ⭐ Product reviews & ratings
- 🔔 Notifications
- 📍 Multiple shipping addresses

### Seller Features
- 🏪 Create, edit, delete product listings
- 📊 Sales dashboard with revenue stats
- 🗂️ Inventory management (stock alerts)
- 📈 Order management & fulfillment

### Admin Features
- 📊 Platform analytics dashboard with revenue chart
- 👥 User management (activate/deactivate, role changes)
- 📦 Product moderation & featuring
- 📋 Order status management
- 💹 Real-time stats: revenue, GMV, order counts

---

## 🧱 Tech Stack

| Layer        | Technology            | Purpose                           |
|--------------|-----------------------|-----------------------------------|
| Frontend     | Next.js 14 (App Router) | SSR/SSG, routing, React components |
| Styling      | Tailwind CSS          | Utility-first responsive design   |
| State        | Zustand               | Global auth + cart state          |
| Data Fetching| TanStack Query        | Server state, caching             |
| Forms        | React Hook Form + Zod | Typed form validation             |
| Backend      | Node.js + Express     | REST API server                   |
| Database     | PostgreSQL 15         | Primary data store                |
| Cache        | Redis                 | Product cache, sessions           |
| Auth         | JWT (RS256-ready)     | Stateless authentication          |
| Payments     | Stripe                | Checkout sessions + webhooks      |
| Email        | Nodemailer (SMTP)     | Transactional emails              |
| Logging      | Winston               | Structured JSON logs              |
| Images       | Cloudinary            | Image upload & optimization       |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Stripe account

### 1. Clone & Install
```bash
git clone https://github.com/yourname/shopverse.git
cd shopverse

# Backend
cd backend && cp .env.example .env && npm install

# Frontend
cd ../frontend && cp .env.local.example .env.local && npm install
```

### 2. Configure Environment
Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_db
JWT_SECRET=your_minimum_32_char_secret_here
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Database Setup
```bash
# Create database
createdb ecommerce_db

# Run migrations (creates all tables + seed data)
cd backend && npm run migrate
```

### 4. Run Development Servers
```bash
# Terminal 1 — Backend
cd backend && npm run dev
# → Running on http://localhost:5000

# Terminal 2 — Frontend
cd frontend && npm run dev
# → Running on http://localhost:3000
```

### 5. Run with Docker (Recommended)
```bash
# Copy env vars
cp backend/.env.example backend/.env
# Edit backend/.env with your Stripe keys

# Start everything
docker compose up --build

# Services:
#   Frontend → http://localhost:3000
#   Backend  → http://localhost:5000
#   DB       → localhost:5432
#   Redis    → localhost:6379
```

### 6. Create Admin User
```bash
# After running migrations, update a user's role in the DB:
psql $DATABASE_URL -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"

# Or use the API after registration:
curl -X PUT http://localhost:5000/api/admin/users/<user_id> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

---

## 📁 Project Structure

```
shopverse/
├── backend/
│   ├── migrations/
│   │   └── schema.sql           # Full PostgreSQL schema + seed
│   ├── src/
│   │   ├── app.js               # Express app entry point
│   │   ├── config/
│   │   │   ├── database.js      # PG pool + query helpers
│   │   │   └── redis.js         # Redis client + cache helpers
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT verify + role guards
│   │   │   └── errorHandler.js  # Global error handler
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── orderController.js
│   │   │   ├── userController.js
│   │   │   └── adminController.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   ├── users.js
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   └── emailService.js
│   │   └── utils/
│   │       └── logger.js
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── page.tsx         # Homepage
│   │   │   ├── layout.tsx       # Root layout + providers
│   │   │   ├── globals.css      # Tailwind + custom CSS
│   │   │   ├── products/
│   │   │   │   ├── page.tsx     # Product listing + filters
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx # Product detail page
│   │   │   ├── cart/            # Cart page
│   │   │   ├── checkout/
│   │   │   │   ├── page.tsx     # Checkout form
│   │   │   │   └── success/     # Payment success
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── dashboard/       # Buyer dashboard + orders
│   │   │   ├── seller/
│   │   │   │   └── dashboard/   # Seller product + order mgmt
│   │   │   └── admin/           # Admin panel
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Navbar.tsx   # Full Amazon-style navbar
│   │   │   ├── product/
│   │   │   │   └── ProductCard.tsx
│   │   │   └── cart/
│   │   │       └── CartDrawer.tsx
│   │   ├── lib/
│   │   │   └── api.ts           # Typed axios client + helpers
│   │   ├── store/
│   │   │   └── index.ts         # Zustand: auth + cart + UI
│   │   └── hooks/
│   │       └── useDebounce.ts
│   ├── .env.local
│   ├── Dockerfile
│   ├── next.config.js
│   └── tailwind.config.js
│
└── docker-compose.yml
```

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Clear refresh token |
| GET  | `/api/auth/me` | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products?search=&category=&minPrice=&sort=` | List with filters |
| GET | `/api/products/categories` | All categories |
| GET | `/api/products/:slug` | Product detail |
| GET | `/api/products/:id/reviews` | Paginated reviews |
| POST | `/api/products/:id/reviews` | Create review (auth) |
| POST | `/api/products` | Create product (seller) |
| PUT | `/api/products/:id` | Update product (seller) |
| DELETE | `/api/products/:id` | Delete product (seller) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/checkout` | Create Stripe session |
| POST | `/api/orders/webhook` | Stripe webhook |
| GET  | `/api/orders` | User's orders |
| GET  | `/api/orders/:id` | Order detail |
| PUT  | `/api/orders/:id/cancel` | Cancel order |
| GET  | `/api/orders/seller` | Seller's sales |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/users/profile` | Get/update profile |
| GET/POST/PUT/DELETE | `/api/users/cart` | Cart management |
| GET/POST/DELETE | `/api/users/wishlist` | Wishlist |
| GET/POST/DELETE | `/api/users/addresses` | Addresses |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Platform analytics |
| GET/PUT/DELETE | `/api/admin/users` | User management |
| GET/PUT | `/api/admin/products` | Product management |
| GET/PUT | `/api/admin/orders` | Order management |

---

## 📈 Scalability Design

### Database
- **Connection pooling** (pg-pool) with configurable min/max
- **Full-text search** via PostgreSQL `tsvector` + GIN indexes
- **Partial indexes** on active products, unread notifications
- **Database triggers** for automatic `updated_at`, order numbers, product ratings
- **Proper foreign keys** with CASCADE rules

### Caching
- Redis caches product listings (5 min TTL)
- Category list cached for 1 hour
- Cache invalidation on product updates
- Pattern-based cache deletion (`products:*`)

### API Performance
- Rate limiting per IP (100 req/15min)
- Stricter limits on auth endpoints (20 req/15min)
- Response compression (gzip)
- Slow query logging (>500ms)

### Scaling to Millions
For production scale, add:
1. **Load Balancer** (AWS ALB / Nginx) in front of multiple API instances
2. **Read Replicas** for PostgreSQL (use separate connection string for reads)
3. **CDN** (CloudFront) for static assets and Next.js pages
4. **Message Queue** (BullMQ/SQS) for email sending, notifications
5. **Elasticsearch** to replace PostgreSQL full-text search at scale
6. **Horizontal pod autoscaling** on Kubernetes

---

## 🔒 Security Features

- ✅ Helmet.js HTTP security headers
- ✅ JWT with short-lived access tokens (7d) + HttpOnly refresh cookies
- ✅ bcrypt password hashing (cost factor 12)
- ✅ Rate limiting on all endpoints
- ✅ Input validation via express-validator
- ✅ SQL injection prevention (parameterized queries)
- ✅ Stripe webhook signature verification
- ✅ CORS configured for specific origin
- ✅ Role-based access control (buyer / seller / admin)

---

## 🧪 Test Stripe Payments

Use these test card numbers in Stripe checkout:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Expiry: any future date, CVC: any 3 digits

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Google account
2. Generate an App Password (Google Account → Security → App Passwords)
3. Use it as `SMTP_PASS` in `.env`

---

## 🤝 Contributing

```bash
# Fork → Feature branch → PR
git checkout -b feature/amazing-feature
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature
```

---

## 📄 License

MIT License — see `LICENSE` for details.

---

Built with ❤️ — ShopVerse Marketplace
