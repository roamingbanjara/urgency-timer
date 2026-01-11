const fetch = require('node-fetch');
require('dotenv').config();

const BILLING_PLANS = {
  starter: {
    name: 'Starter',
    price: 19.00,
    views: 5000,
    test: 'gid://shopify/AppSubscription/123456789'
  },
  growth: {
    name: 'Growth',
    price: 49.00,
    views: 50000,
    test: 'gid://shopify/AppSubscription/987654321'
  },
  unlimited: {
    name: 'Unlimited',
    price: 99.00,
    views: -1, // -1 means unlimited
    test: 'gid://shopify/AppSubscription/456789123'
  }
};

const createBilling = async (shop, accessToken, planName) => {
  const plan = BILLING_PLANS[planName];
  if (!plan) {
    throw new Error('Invalid plan name');
  }

  const returnUrl = `${process.env.SHOPIFY_APP_URL}/api/billing/callback?shop=${shop}`;
  
  const mutation = `
    mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: $test
        lineItems: $lineItems
      ) {
        appSubscription {
          id
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  const variables = {
    name: plan.name,
    returnUrl: returnUrl,
    test: process.env.NODE_ENV !== 'production',
    lineItems: [{
      plan: {
        appRecurringPricingDetails: {
          price: { amount: plan.price, currencyCode: 'USD' },
          interval: 'EVERY_30_DAYS'
        }
      }
    }]
  };

  const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({ query: mutation, variables: variables })
  });

  const data = await response.json();
  
  if (data.errors || data.data.appSubscriptionCreate.userErrors.length > 0) {
    throw new Error(data.errors?.[0]?.message || data.data.appSubscriptionCreate.userErrors[0].message);
  }

  return {
    subscriptionId: data.data.appSubscriptionCreate.appSubscription.id,
    confirmationUrl: data.data.appSubscriptionCreate.confirmationUrl
  };
};

const getSubscriptionStatus = async (shop, accessToken) => {
  const query = `
    query {
      appInstallation {
        activeSubscriptions {
          id
          name
          status
          lineItems {
            id
            plan {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  const subscriptions = data.data?.appInstallation?.activeSubscriptions || [];
  return subscriptions.length > 0 ? subscriptions[0] : null;
};

module.exports = {
  BILLING_PLANS,
  createBilling,
  getSubscriptionStatus
};
