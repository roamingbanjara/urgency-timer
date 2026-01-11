# Setup Guide - Urgency Timer Shopify App

## 🚀 Complete Setup Instructions

### Step 1: Prerequisites

Install the following on your machine:

1. **Node.js** (v14 or higher)
   ```bash
   node --version  # Should be v14+
   ```

2. **PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

3. **Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

4. **ngrok** (for local development)
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

### Step 2: Database Setup

1. **Create PostgreSQL database:**
   ```bash
   createdb urgency_timer
   ```

2. **Update DATABASE_URL in .env:**
   ```bash
   DATABASE_URL=postgresql://your_username@localhost:5432/urgency_timer
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

### Step 3: Shopify App Setup

1. **Go to Shopify Partners Dashboard:**
   - Visit https://partners.shopify.com
   - Create account or login

2. **Create a new app:**
   - Click "Apps" → "Create app"
   - Choose "Custom app"
   - Name it "Urgency Timer" (or your preferred name)

3. **Configure App Settings:**
   - **App URL:** `https://your-ngrok-url.ngrok.io`
   - **Allowed redirection URL(s):** `https://your-ngrok-url.ngrok.io/auth/callback`
   - **Scopes:**
     - `read_products`
     - `read_script_tags`
     - `write_script_tags`
     - `read_orders`

4. **Set up Webhooks:**
   - Go to "Webhooks" section
   - Add webhook:
     - **Event:** `app/uninstalled`
     - **Format:** JSON
     - **URL:** `https://your-ngrok-url.ngrok.io/api/webhooks/app/uninstalled`
   - Add another webhook:
     - **Event:** `app_subscriptions/update`
     - **Format:** JSON
     - **URL:** `https://your-ngrok-url.ngrok.io/api/webhooks/app_subscriptions/update`

5. **Get API Credentials:**
   - Copy "API key" → This is your `SHOPIFY_API_KEY`
   - Copy "API secret key" → This is your `SHOPIFY_API_SECRET_KEY`

### Step 4: Environment Configuration

1. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in .env:**
   ```env
   SHOPIFY_API_KEY=your_api_key_from_step_3
   SHOPIFY_API_SECRET_KEY=your_secret_key_from_step_3
   SHOPIFY_APP_URL=https://your-ngrok-url.ngrok.io
   DATABASE_URL=postgresql://username@localhost:5432/urgency_timer
   REDIS_URL=redis://localhost:6379
   PORT=3000
   NODE_ENV=development
   ```

### Step 5: Start Development

1. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - Update `SHOPIFY_APP_URL` in `.env` with this URL
   - Update webhook URLs in Shopify Partners dashboard

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Test the app:**
   - Go to your Shopify Partners dashboard
   - Click on your app
   - Click "Test on development store"
   - Install the app on a test store
   - The timer should automatically appear on product pages!

### Step 6: Testing

1. **Test Timer Injection:**
   - Visit any product page on your test store
   - Timer should appear automatically
   - Check browser console for any errors

2. **Test View Tracking:**
   - Visit multiple product pages
   - Check dashboard at `https://your-ngrok-url.ngrok.io`
   - Views should increment

3. **Test Lock Mechanism:**
   - You can manually set `total_views` to 1000 in database to test lock:
     ```sql
     UPDATE shops SET total_views = 1000 WHERE shop_domain = 'your-test-store.myshopify.com';
     ```
   - Refresh product page - should show lock message

4. **Test Billing:**
   - Click "Activate Plan" in dashboard
   - Should redirect to Shopify billing approval
   - After approval, timer should unlock

## 🐛 Troubleshooting

### Timer not appearing?
- Check browser console for errors
- Verify script tag was installed: Go to Shopify admin → Settings → Checkout → Script tags
- Ensure you're on a product page (path starts with `/products/`)

### Database connection errors?
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format
- Ensure database exists: `psql -l | grep urgency_timer`

### Redis connection errors?
- Verify Redis is running: `redis-cli ping` (should return PONG)
- Check REDIS_URL format

### Webhook not working?
- Verify webhook URL in Shopify Partners matches ngrok URL
- Check webhook HMAC verification in server logs
- Ensure ngrok is running and URL hasn't changed

### Billing not working?
- Check Shopify API version (should be 2023-10 or later)
- Verify app has billing permissions
- Check GraphQL query syntax in billing.js

## 📦 Production Deployment

### Heroku Deployment

1. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

2. **Add addons:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   heroku addons:create heroku-redis:hobby-dev
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set SHOPIFY_API_KEY=your_key
   heroku config:set SHOPIFY_API_SECRET_KEY=your_secret
   heroku config:set SHOPIFY_APP_URL=https://your-app-name.herokuapp.com
   heroku config:set NODE_ENV=production
   ```

4. **Run migrations:**
   ```bash
   heroku run npm run db:migrate
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

6. **Update Shopify app URLs:**
   - Update App URL in Shopify Partners
   - Update webhook URLs
   - Update redirect URLs

## ✅ Checklist

Before going live:

- [ ] Database migrations run successfully
- [ ] Redis connection working
- [ ] Script tag installs on app install
- [ ] Timer appears on product pages
- [ ] View tracking works
- [ ] Lock mechanism works after 1000 views
- [ ] Billing flow works end-to-end
- [ ] Webhooks are configured and verified
- [ ] Environment variables set correctly
- [ ] SSL certificate installed (required for production)

## 🎉 You're Ready!

Your urgency timer app is now set up and ready to convert visitors into subscribers!
