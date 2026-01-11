# Urgency Timer - Shopify App

A production-ready Shopify app that injects conversion-boosting countdown timers into product pages with zero merchant setup.

## 🎯 Product Vision

This app behaves like Facebook Pixel or Google Analytics - once installed, it just works. No configuration needed.

### Key Features

- ✅ **Zero Setup** - Automatically detects product pages and injects timers
- ✅ **Free Until Proven** - 1000 free product views
- ✅ **Auto-Lock** - Locks after 1000 views, creating urgency to subscribe
- ✅ **4 Timer Templates** - Scarcity, Sale Ending, Social Proof, Low Inventory
- ✅ **Shopify Billing** - Seamless subscription management
- ✅ **Works on Any Theme** - Universal script tag injection

## 🚀 Quick Start

### Prerequisites

- Node.js 14+
- PostgreSQL
- Redis
- Shopify Partner Account
- ngrok (for local development)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb urgency_timer
   
   # Run migrations
   npm run db:migrate
   ```

4. **Start Redis:**
   ```bash
   redis-server
   ```

5. **Start ngrok:**
   ```bash
   ngrok http 3000
   # Update SHOPIFY_APP_URL in .env with ngrok URL
   ```

6. **Start the app:**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── db/
│   ├── schema.sql          # Database schema
│   └── index.js            # Database operations
├── lib/
│   ├── redis.js            # Redis session tracking
│   └── billing.js          # Shopify Billing API
├── pages/
│   ├── index.js            # Merchant dashboard
│   └── _app.js             # Next.js app wrapper
├── public/
│   └── urgency-timer.js    # Timer script (injected on product pages)
├── server.js               # Koa server with API routes
└── package.json
```

## 🔧 Configuration

### Environment Variables

- `SHOPIFY_API_KEY` - Your Shopify app API key
- `SHOPIFY_API_SECRET_KEY` - Your Shopify app secret
- `SHOPIFY_APP_URL` - Your app URL (ngrok in dev)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Server port (default: 3000)

### Shopify App Setup

1. Create a new app in Shopify Partners
2. Set redirect URL: `https://your-app-url.com/auth/callback`
3. Add webhooks:
   - `app/uninstalled` → `https://your-app-url.com/api/webhooks/app/uninstalled`
   - `app_subscriptions/update` → `https://your-app-url.com/api/webhooks/app_subscriptions/update`
4. Required scopes:
   - `read_products`
   - `read_script_tags`
   - `write_script_tags`
   - `read_orders`

## 💰 Billing Plans

- **Starter** - $19/month - 5,000 views
- **Growth** - $49/month - 50,000 views
- **Unlimited** - $99/month - Unlimited views

## 🎨 Timer Templates

1. **Scarcity** - "Only 7 items left — Offer expires in 14:23"
2. **Sale Ending** - "Flash Sale Ends in 09:58"
3. **Social Proof** - "12 people are viewing this right now"
4. **Low Inventory** - "Selling fast — order before timer ends"

## 📊 How It Works

1. **Installation**: Merchant installs app → Script tag auto-injected
2. **Detection**: Timer script detects product pages via Shopify JS objects
3. **Tracking**: Each unique session view is tracked
4. **Free Tier**: First 1000 views are free
5. **Lock**: After 1000 views, timer shows activation message
6. **Conversion**: Merchant activates plan to continue

## 🔐 Security

- Webhook verification using HMAC
- Session-based authentication
- CORS protection
- SQL injection prevention (parameterized queries)

## 🚢 Deployment

### Heroku

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql
heroku addons:create heroku-redis
heroku config:set SHOPIFY_API_KEY=...
heroku config:set SHOPIFY_API_SECRET_KEY=...
heroku config:set SHOPIFY_APP_URL=https://your-app-name.herokuapp.com
git push heroku main
```

### Other Platforms

Ensure you have:
- PostgreSQL database
- Redis instance
- Environment variables configured
- SSL certificate (required for Shopify)

## 📝 License

ISC

## 🤝 Support

For issues and questions, please open an issue on GitHub.
