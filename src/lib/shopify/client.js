// src/lib/shopify/client.js
// Shopify Storefront API client

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const storefront = async (query, variables = {}) => {
  // Check if required environment variables are available
  if (!domain || !storefrontAccessToken) {
    console.warn('Shopify environment variables not configured');
    return null;
  }

  try {
    const res = await fetch(`https://${domain}/api/2025-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const json = await res.json();
    if (json.errors) {
      console.error('Shopify API errors:', json.errors);
      // Throw detailed API errors
      throw new Error(`Shopify Storefront API request failed: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  } catch (error) {
    console.error('Shopify API request failed:', error);
    return null;
  }
};

export default storefront;
