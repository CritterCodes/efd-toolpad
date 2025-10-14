// lib/shopify.js
// Shopify Storefront API client for admin app

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const storefront = async (query, variables = {}) => {
  // Check if required environment variables are available
  if (!domain || !storefrontAccessToken) {
    console.warn('Shopify environment variables not configured');
    console.warn('Domain:', domain ? 'SET' : 'NOT SET');
    console.warn('Token:', storefrontAccessToken ? 'SET' : 'NOT SET');
    return null;
  }

  try {
    console.log(`🔗 Making Shopify API request to: https://${domain}/api/2025-04/graphql.json`);
    
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
      console.error('❌ Shopify API errors:', json.errors);
      throw new Error(`Shopify Storefront API request failed: ${JSON.stringify(json.errors)}`);
    }
    
    console.log('✅ Shopify API request successful');
    return json.data;
  } catch (error) {
    console.error('❌ Shopify API request failed:', error);
    return null;
  }
};

export default storefront;

// Authentication helpers
export async function authenticateCustomer(email, password) {
  const mutation = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          field
          message
          code
        }
      }
    }
  `;

  const variables = {
    input: { email, password }
  };

  const response = await storefront(mutation, variables);
  return response?.customerAccessTokenCreate;
}

export async function getCustomerData(accessToken) {
  const query = `
    query getCustomer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        firstName
        lastName
        email
        phone
        createdAt
        updatedAt
        acceptsMarketing
        defaultAddress {
          id
          address1
          address2
          city
          province
          country
          zip
          firstName
          lastName
          phone
        }
      }
    }
  `;

  const response = await storefront(query, { customerAccessToken: accessToken });
  return response?.customer;
}