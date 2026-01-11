# Architecture Overview - Urgency Timer App

## 🏗️ System Architecture

### High-Level Flow

```
Shopify Store
    ↓
Product Page Load
    ↓
Script Tag (urgency-timer.js) Injected
    ↓
Detect Product Data → Register View → Get Shop Status
    ↓
Display Timer (or Lock Message)
```

## 📦 Components

### 1. Frontend (Timer Script)
**File:** `public/urgency-timer.js`

- **Purpose:** Injected into all product pages via Shopify script tags
- **Responsibilities:**
  - Detect product pages
  - Extract product data from Shopify JS objects
  - Register views with backend
  - Display timer or lock message
  - Handle 4 different timer templates

**Key Functions:**
- `getProductData()` - Extracts product ID, price, inventory
- `registerView()` - Sends view to backend API
- `getShopStatus()` - Gets lock status and settings
- `createTimer()` - Renders timer UI

### 2. Backend API
**File:** `server.js`

**Public Endpoints (No Auth):**
- `POST /api/register-view` - Track product views
- `GET /api/shop-status` - Get shop lock status and settings
- `GET /urgency-timer.js` - Serves timer script with injected API URL

**Protected Endpoints (Shopify Auth):**
- `GET /api/dashboard/stats` - Get shop statistics
- `GET /api/dashboard/settings` - Get shop settings
- `POST /api/dashboard/settings` - Update shop settings
- `GET /api/billing/activate` - Initiate billing flow
- `GET /api/billing/callback` - Handle billing callback

**Webhooks:**
- `POST /api/webhooks/app/uninstalled` - Handle app uninstall
- `POST /api/webhooks/app_subscriptions/update` - Handle subscription updates

### 3. Database Layer
**File:** `db/index.js`

**Tables:**
- `shops` - Shop data, subscription status, view counts
- `product_views` - Individual view tracking (deduplicated by session)
- `shop_settings` - Timer customization settings

**Key Functions:**
- `getShop()` - Get shop data
- `createShop()` - Create/update shop on install
- `registerView()` - Register unique view (deduplicated)
- `getShopStats()` - Get shop statistics
- `getShopSettings()` - Get customization settings
- `updateShopSettings()` - Update settings

### 4. Redis Layer
**File:** `lib/redis.js`

**Purpose:** Session tracking and view deduplication

**Key Functions:**
- `hasViewedProduct()` - Check if product already viewed in session
- `incrementActiveViewers()` - Track active viewers (social proof)
- `getActiveViewers()` - Get active viewer count

### 5. Billing Integration
**File:** `lib/billing.js`

**Purpose:** Shopify Billing API integration

**Plans:**
- Starter: $19/mo - 5,000 views
- Growth: $49/mo - 50,000 views
- Unlimited: $99/mo - Unlimited

**Key Functions:**
- `createBilling()` - Create subscription charge
- `getSubscriptionStatus()` - Check subscription status

### 6. Merchant Dashboard
**File:** `pages/index.js`

**Purpose:** Shopify Polaris-based admin interface

**Features:**
- View usage statistics
- Progress bar showing views until lock
- Quick customization (3 clicks max)
- Plan activation button
- Lock warning when approaching limit

## 🔄 Data Flow

### View Tracking Flow

1. Customer visits product page
2. Timer script loads
3. Extracts product ID and shop domain
4. Generates/retrieves session ID
5. Checks Redis cache for duplicate view
6. If new view:
   - Registers in database
   - Increments shop view count
   - Caches in Redis (1 hour TTL)
7. Fetches shop status (locked/unlocked)
8. Displays appropriate UI

### Lock Mechanism Flow

1. View registered → `total_views` incremented
2. On next view, check: `total_views >= 1000 AND is_paid = false`
3. If locked:
   - Timer shows activation message
   - Link to billing activation
4. Merchant clicks "Activate"
5. Redirects to Shopify billing approval
6. On approval:
   - Webhook updates `is_paid = true`
   - Timer unlocks automatically

### Billing Flow

1. Merchant clicks "Activate Plan"
2. Backend creates Shopify subscription charge
3. Redirects to Shopify confirmation page
4. Merchant approves
5. Shopify redirects to callback URL
6. Backend verifies subscription status
7. Updates database: `is_paid = true`
8. Timer unlocks on next page load

## 🔐 Security

### Webhook Verification
- HMAC SHA256 verification
- Compares request HMAC with calculated HMAC
- Rejects unauthorized requests

### Session Management
- Session IDs stored in browser sessionStorage
- Redis tracks active sessions
- Prevents duplicate view counting

### Database Security
- Parameterized queries (SQL injection prevention)
- Connection pooling
- Environment-based credentials

## 📊 View Counting Logic

### Deduplication Strategy

1. **Session-based:** Same session ID + product ID = 1 view
2. **Redis cache:** 1-hour TTL prevents rapid duplicate requests
3. **Database unique constraint:** `(shop_domain, product_id, session_id)`

### Counting Rules

- ✅ New session + new product = Counted
- ✅ Same session + different product = Counted
- ❌ Same session + same product = Not counted (duplicate)

## 🎨 Timer Templates

### Template 1: Scarcity
- Shows random low inventory count
- "Only X items left — Offer expires in MM:SS"

### Template 2: Sale Ending
- Countdown timer focus
- "Flash Sale Ends in MM:SS"

### Template 3: Social Proof
- Active viewer count
- "X people are viewing this right now"

### Template 4: Low Inventory
- Urgency messaging
- "Selling fast — order before timer ends MM:SS"

## 🚀 Performance Optimizations

1. **Redis Caching:** View deduplication cached for 1 hour
2. **Database Indexes:** Indexed on shop_domain, session_id
3. **Lazy Loading:** Timer only loads on product pages
4. **Minimal DOM Manipulation:** Single timer element injection
5. **Async Operations:** Non-blocking API calls

## 🔧 Configuration

### Environment Variables
- `SHOPIFY_API_KEY` - App API key
- `SHOPIFY_API_SECRET_KEY` - App secret
- `SHOPIFY_APP_URL` - App base URL
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `PORT` - Server port

### Database Configuration
- PostgreSQL 12+
- Connection pooling enabled
- SSL in production

### Redis Configuration
- Default TTL: 3600 seconds (1 hour)
- Session tracking
- View deduplication cache

## 📈 Scalability Considerations

### Current Limits
- Free tier: 1,000 views
- Starter: 5,000 views/month
- Growth: 50,000 views/month
- Unlimited: No limit

### Scaling Strategy
1. **Horizontal:** Add more app instances
2. **Database:** Read replicas for stats queries
3. **Redis:** Cluster mode for high traffic
4. **CDN:** Serve timer script from CDN

## 🐛 Error Handling

### Timer Script
- Graceful degradation if API fails
- Console warnings for debugging
- Fallback to default settings

### Backend API
- Try-catch blocks on all routes
- Proper HTTP status codes
- Error logging to console

### Database
- Connection retry logic
- Transaction rollback on errors
- Graceful degradation

## 🔄 Future Enhancements

1. **A/B Testing:** Test different timer templates
2. **Analytics:** Conversion rate tracking
3. **Custom Templates:** User-defined timer messages
4. **Scheduling:** Timer schedules per product
5. **Multi-language:** Internationalization support
