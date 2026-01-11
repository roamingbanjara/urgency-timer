require('isomorphic-fetch');
const dotenv = require('dotenv');
const Koa = require('koa');
const KoaRouter = require('koa-router');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');
const koaBody = require('koa-body');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');

// Import our modules
const db = require('./db');
const redis = require('./lib/redis');
const billing = require('./lib/billing');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, SHOPIFY_APP_URL } = process.env;

const server = new Koa();
const router = new KoaRouter();

// Middleware for CORS
server.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (ctx.method === 'OPTIONS') {
    ctx.status = 200;
    return;
  }
  await next();
});

// Body parser
server.use(koaBody());

// API Routes (public - no auth required for timer script)
router.post('/api/register-view', async (ctx) => {
  try {
    const { shop, productId, sessionId } = ctx.request.body;
    
    if (!shop || !productId || !sessionId) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    // Check if already viewed in this session (Redis cache)
    const alreadyViewed = await redis.hasViewedProduct(sessionId, productId);
    if (alreadyViewed) {
      ctx.body = { success: true, duplicate: true };
      return;
    }
    
    // Register view in database
    const registered = await db.registerView(shop, productId, sessionId);
    
    ctx.body = { 
      success: true, 
      registered,
      duplicate: false
    };
  } catch (error) {
    console.error('Error registering view:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

router.get('/api/shop-status', async (ctx) => {
  try {
    const shop = ctx.query.shop;
    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: 'Shop parameter required' };
      return;
    }
    
    const shopData = await db.getShopStats(shop);
    if (!shopData) {
      ctx.body = { 
        locked: false, 
        settings: {},
        viewsUsed: 0,
        totalViews: 1000
      };
      return;
    }
    
    const settings = await db.getShopSettings(shop);
    const FREE_LIMIT = 1000;
    const isLocked = shopData.total_views >= FREE_LIMIT && !shopData.is_paid;
    
    ctx.body = {
      locked: isLocked,
      settings: settings || {},
      viewsUsed: shopData.total_views,
      totalViews: FREE_LIMIT,
      isPaid: shopData.is_paid
    };
  } catch (error) {
    console.error('Error getting shop status:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

// Billing routes
router.get('/api/billing/activate', async (ctx) => {
  try {
    const shop = ctx.query.shop;
    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: 'Shop parameter required' };
      return;
    }
    
    const shopData = await db.getShop(shop);
    if (!shopData || !shopData.access_token) {
      ctx.status = 404;
      ctx.body = { error: 'Shop not found' };
      return;
    }
    
    // Create billing for starter plan
    const billingData = await billing.createBilling(shop, shopData.access_token, 'starter');
    
    // Redirect to Shopify confirmation
    ctx.redirect(billingData.confirmationUrl);
  } catch (error) {
    console.error('Error activating billing:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

router.get('/api/billing/callback', async (ctx) => {
  try {
    const shop = ctx.query.shop;
    const chargeId = ctx.query.charge_id;
    
    if (!shop || !chargeId) {
      ctx.status = 400;
      ctx.body = { error: 'Missing parameters' };
      return;
    }
    
    const shopData = await db.getShop(shop);
    if (!shopData) {
      ctx.status = 404;
      ctx.body = { error: 'Shop not found' };
      return;
    }
    
    // Verify subscription status
    const subscription = await billing.getSubscriptionStatus(shop, shopData.access_token);
    
    if (subscription && subscription.status === 'ACTIVE') {
      // Determine plan from price
      const price = subscription.lineItems[0]?.plan?.price?.amount || 0;
      let planName = 'starter';
      if (price >= 99) planName = 'unlimited';
      else if (price >= 49) planName = 'growth';
      
      await db.updateShopSubscription(shop, subscription.id, planName, true);
      
      ctx.redirect(`https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`);
    } else {
      ctx.body = { error: 'Subscription not active' };
    }
  } catch (error) {
    console.error('Error in billing callback:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

// Webhook verification
function verifyWebhook(data, hmac) {
  const hash = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET_KEY)
    .update(data, 'utf8')
    .digest('base64');
  return hash === hmac;
}

// Dashboard API routes (protected)
router.get('/api/dashboard/stats', async (ctx) => {
  try {
    const shop = ctx.query.shop;
    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: 'Shop parameter required' };
      return;
    }
    
    const stats = await db.getShopStats(shop);
    ctx.body = stats || { total_views: 0, is_paid: false };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

router.get('/api/dashboard/settings', async (ctx) => {
  try {
    const shop = ctx.query.shop;
    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: 'Shop parameter required' };
      return;
    }
    
    const settings = await db.getShopSettings(shop);
    ctx.body = settings || {};
  } catch (error) {
    console.error('Error getting settings:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

router.post('/api/dashboard/settings', async (ctx) => {
  try {
    const { shop, timer_color, timer_position, timer_template, font_size } = ctx.request.body;
    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: 'Shop parameter required' };
      return;
    }
    
    const settings = await db.updateShopSettings(shop, {
      timer_color,
      timer_position,
      timer_template,
      font_size
    });
    
    ctx.body = { success: true, settings };
  } catch (error) {
    console.error('Error updating settings:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

// Webhooks
router.post('/api/webhooks/app/uninstalled', async (ctx) => {
  try {
    const hmac = ctx.get('X-Shopify-Hmac-Sha256');
    const data = JSON.stringify(ctx.request.body);
    
    if (!verifyWebhook(data, hmac)) {
      ctx.status = 401;
      return;
    }
    
    const shop = ctx.request.body.myshopify_domain;
    // Clean up shop data (optional - you might want to keep for analytics)
    console.log(`App uninstalled for shop: ${shop}`);
    
    ctx.status = 200;
  } catch (error) {
    console.error('Error handling uninstall webhook:', error);
    ctx.status = 500;
  }
});

router.post('/api/webhooks/app_subscriptions/update', async (ctx) => {
  try {
    const hmac = ctx.get('X-Shopify-Hmac-Sha256');
    const data = JSON.stringify(ctx.request.body);
    
    if (!verifyWebhook(data, hmac)) {
      ctx.status = 401;
      return;
    }
    
    const subscription = ctx.request.body;
    const shop = subscription.admin_graphql_api_id?.split('/').pop() || '';
    
    // Update subscription status
    if (subscription.status === 'ACTIVE') {
      // Find shop by subscription ID or other method
      // This is simplified - you may need to track subscription IDs differently
      console.log(`Subscription updated for shop: ${shop}`);
    }
    
    ctx.status = 200;
  } catch (error) {
    console.error('Error handling subscription webhook:', error);
    ctx.status = 500;
  }
});

// Script tag management
const CREATE_SCRIPT_TAG = `
  mutation scriptTagCreate($input: ScriptTagInput!) {
    scriptTagCreate(input: $input) {
      scriptTag {
        id
        src
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const QUERY_SCRIPTTAGS = `
  query {
    scriptTags(first: 10) {
      edges {
        node {
          id
          src
        }
      }
    }
  }
`;

const DELETE_SCRIPTTAG = `
  mutation scriptTagDelete($id: ID!) {
    scriptTagDelete(id: $id) {
      deletedScriptTagId
      userErrors {
        field
        message
      }
    }
  }
`;

async function installScriptTag(shop, accessToken) {
  try {
    // Check if script tag already exists
    const checkResponse = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({ query: QUERY_SCRIPTTAGS })
    });
    
    const checkData = await checkResponse.json();
    const existingTags = checkData.data?.scriptTags?.edges || [];
    const scriptUrl = `${SHOPIFY_APP_URL}/urgency-timer.js`;
    
    if (!SHOPIFY_APP_URL) {
      throw new Error('SHOPIFY_APP_URL not configured');
    }
    
    // Check if our script tag already exists
    const exists = existingTags.some(edge => edge.node.src === scriptUrl);
    if (exists) {
      console.log('Script tag already exists');
      return;
    }
    
    // Create script tag
    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        query: CREATE_SCRIPT_TAG,
        variables: {
          input: {
            src: scriptUrl,
            displayScope: 'ONLINE_STORE'
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.errors || data.data.scriptTagCreate.userErrors.length > 0) {
      throw new Error(data.errors?.[0]?.message || data.data.scriptTagCreate.userErrors[0].message);
    }
    
    console.log('Script tag installed successfully');
  } catch (error) {
    console.error('Error installing script tag:', error);
    throw error;
  }
}

// Apply router middleware
server.use(router.allowedMethods());
server.use(router.routes());

app.prepare().then(() => {
  server.use(session({ sameSite: 'none', secure: true }, server));
  server.keys = [SHOPIFY_API_SECRET_KEY];

  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: [
        'read_products',
        'read_script_tags',
        'write_script_tags',
        'read_orders'
      ],
      async afterAuth(ctx) {
        const { shop, accessToken } = ctx.session;
        
        // Create or update shop in database
        await db.createShop(shop, accessToken);
        
        // Install script tag
        try {
          await installScriptTag(shop, accessToken);
        } catch (error) {
          console.error('Failed to install script tag:', error);
        }
        
        ctx.cookies.set('shopOrigin', shop, {
          httpOnly: false,
          secure: true,
          sameSite: 'none'
        });
        
        ctx.redirect('/');
      },
    }),
  );

  server.use(graphQLProxy({ version: ApiVersion.October19 }));
  
  // Serve timer script with injected API URL
  router.get('/urgency-timer.js', async (ctx) => {
    const fs = require('fs');
    const path = require('path');
    let script = fs.readFileSync(path.join(__dirname, 'public/urgency-timer.js'), 'utf8');
    // Inject API URL
    script = script.replace(
      /const API_URL = .*?;/,
      `const API_URL = '${SHOPIFY_APP_URL}';`
    );
    ctx.set('Content-Type', 'application/javascript');
    ctx.body = script;
  });
  
  // Protected routes (require auth)
  server.use(verifyRequest());

  server.use(async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
