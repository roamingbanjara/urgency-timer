(function() {
  'use strict';
  
  // Configuration - will be injected by server
  const API_URL = window.URGENCY_TIMER_API_URL || (window.location.protocol + '//' + window.location.host);
  const FREE_VIEW_LIMIT = 1000;
  
  // Generate or get session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem('urgency_timer_session');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('urgency_timer_session', sessionId);
    }
    return sessionId;
  }
  
  // Extract product data from Shopify
  function getProductData() {
    let productId = null;
    let price = null;
    let availability = null;
    let inventory = null;
    
    // Try window.ShopifyAnalytics.meta.product
    if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
      productId = window.ShopifyAnalytics.meta.product.id;
      price = window.ShopifyAnalytics.meta.product.price;
    }
    
    // Try window.meta.product
    if (!productId && window.meta && window.meta.product) {
      productId = window.meta.product.id;
    }
    
    // Try product JSON in page
    const productJson = document.querySelector('script[type="application/json"][data-product-json]');
    if (productJson) {
      try {
        const product = JSON.parse(productJson.textContent);
        productId = product.id || productId;
        price = product.price || price;
        availability = product.available || availability;
        inventory = product.variants?.[0]?.inventory_quantity || inventory;
      } catch (e) {
        console.error('Error parsing product JSON:', e);
      }
    }
    
    // Try Shopify.product
    if (window.Shopify && window.Shopify.product) {
      productId = window.Shopify.product.id || productId;
      price = window.Shopify.product.price || price;
    }
    
    return { productId, price, availability, inventory };
  }
  
  // Check if we're on a product page
  function isProductPage() {
    const path = window.location.pathname;
    // Check if path starts with /products/ and has a product handle
    // e.g., /products/product-handle or /products/product-handle?variant=123
    const productPagePattern = /^\/products\/[^\/]+/;
    return productPagePattern.test(path);
  }
  
  // Register view with backend
  async function registerView(shop, productId, sessionId) {
    try {
      const response = await fetch(`${API_URL}/api/register-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop: shop,
          productId: productId,
          sessionId: sessionId
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error registering view:', error);
      return { locked: false };
    }
  }
  
  // Get shop settings and lock status
  async function getShopStatus(shop) {
    try {
      const response = await fetch(`${API_URL}/api/shop-status?shop=${shop}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting shop status:', error);
      return { locked: false, settings: {} };
    }
  }
  
  // Timer templates
  const templates = {
    1: (timeLeft, settings) => {
      const items = Math.floor(Math.random() * 10) + 3;
      return {
        text: `Only ${items} items left — Offer expires in ${timeLeft}`,
        color: settings.timer_color || '#FF0000'
      };
    },
    2: (timeLeft, settings) => {
      return {
        text: `Flash Sale Ends in ${timeLeft}`,
        color: settings.timer_color || '#FF6B00'
      };
    },
    3: (timeLeft, settings) => {
      const viewers = Math.floor(Math.random() * 20) + 5;
      return {
        text: `${viewers} people are viewing this right now`,
        color: settings.timer_color || '#00A86B'
      };
    },
    4: (timeLeft, settings) => {
      return {
        text: `Selling fast — order before timer ends ${timeLeft}`,
        color: settings.timer_color || '#FF1744'
      };
    }
  };
  
  // Format time
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Create timer element
  function createTimer(settings, locked, viewsUsed, totalViews) {
    const timer = document.createElement('div');
    timer.id = 'urgency-timer-container';
    
    let timeLeft = 3600 + Math.floor(Math.random() * 3600); // 1-2 hours
    const template = templates[settings.timer_template || 1];
    
    const updateTimer = () => {
      if (locked) {
        timer.innerHTML = `
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            text-align: center;
            font-weight: 600;
            font-size: ${settings.font_size || 16}px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 4px;
            position: ${settings.timer_position === 'floating' ? 'fixed' : 'relative'};
            ${settings.timer_position === 'floating' ? 'bottom: 20px; right: 20px; z-index: 9999; max-width: 400px;' : ''}
            ${settings.timer_position === 'top' ? 'margin-bottom: 20px;' : 'margin-top: 20px;'}
          ">
            <div style="margin-bottom: 8px;">Your free sales boost has ended.</div>
            <a href="${API_URL}/api/billing/activate?shop=${shop}" 
               style="
                 display: inline-block;
                 background: white;
                 color: #667eea;
                 padding: 10px 24px;
                 border-radius: 4px;
                 text-decoration: none;
                 font-weight: 700;
                 margin-top: 8px;
                 transition: transform 0.2s;
               "
               onmouseover="this.style.transform='scale(1.05)'"
               onmouseout="this.style.transform='scale(1)'">
              Activate to continue increasing conversions
            </a>
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
              Used ${viewsUsed} / ${totalViews} free views
            </div>
          </div>
        `;
        return;
      }
      
      const templateData = template(formatTime(timeLeft), settings);
      timer.innerHTML = `
        <div style="
          background: ${templateData.color};
          color: white;
          padding: 16px 24px;
          text-align: center;
          font-weight: 600;
          font-size: ${settings.font_size || 16}px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-radius: 4px;
          position: ${settings.timer_position === 'floating' ? 'fixed' : 'relative'};
          ${settings.timer_position === 'floating' ? 'bottom: 20px; right: 20px; z-index: 9999; max-width: 400px;' : ''}
          ${settings.timer_position === 'top' ? 'margin-bottom: 20px;' : 'margin-top: 20px;'}
          animation: pulse 2s infinite;
        ">
          ${templateData.text}
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.9; }
          }
        </style>
      `;
      
      if (timeLeft > 0) {
        timeLeft--;
      } else {
        timeLeft = 3600 + Math.floor(Math.random() * 3600);
      }
    };
    
    updateTimer();
    setInterval(updateTimer, 1000);
    
    return timer;
  }
  
  // Extract shop domain
  function getShopDomain() {
    // Try window.Shopify.shop
    if (window.Shopify && window.Shopify.shop) {
      return window.Shopify.shop;
    }
    
    // Try to extract from hostname
    const hostname = window.location.hostname;
    if (hostname.includes('.myshopify.com')) {
      return hostname;
    }
    
    // Try meta tags
    const shopMeta = document.querySelector('meta[name="shopify-checkout-shop"]');
    if (shopMeta) {
      return shopMeta.content;
    }
    
    return null;
  }
  
  // Main initialization
  async function init() {
    if (!isProductPage()) {
      return;
    }
    
    const shop = getShopDomain();
    if (!shop) {
      console.warn('Urgency Timer: Could not detect shop domain');
      return;
    }
    
    const productData = getProductData();
    if (!productData.productId) {
      return;
    }
    
    const sessionId = getSessionId();
    const shopStatus = await getShopStatus(shop);
    
    // Register view
    await registerView(shop, productData.productId, sessionId);
    
    // Inject timer
    const timer = createTimer(
      shopStatus.settings || {},
      shopStatus.locked || false,
      shopStatus.viewsUsed || 0,
      shopStatus.totalViews || FREE_VIEW_LIMIT
    );
    
    // Insert timer based on position
    if (shopStatus.settings?.timer_position === 'top') {
      const mainContent = document.querySelector('main') || 
                         document.querySelector('.main-content') ||
                         document.querySelector('#main') ||
                         document.body;
      mainContent.insertBefore(timer, mainContent.firstChild);
    } else if (shopStatus.settings?.timer_position === 'floating') {
      document.body.appendChild(timer);
    } else {
      const productForm = document.querySelector('form[action*="/cart/add"]') ||
                         document.querySelector('.product-form') ||
                         document.querySelector('.product-single');
      if (productForm) {
        productForm.parentNode.insertBefore(timer, productForm);
      } else {
        document.body.appendChild(timer);
      }
    }
  }
  
  // Wait for DOM and Shopify objects
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Wait a bit for Shopify objects to load
    setTimeout(init, 500);
  }
  
  // Also try after a delay in case Shopify loads late
  setTimeout(init, 2000);
})();
