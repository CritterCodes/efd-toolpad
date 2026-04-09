import { storefrontQuery } from './utils.js';

export async function getCustomerByToken(config, accessToken) {
  try {
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

    const response = await storefrontQuery(config, query, {
      customerAccessToken: accessToken
    });

    return response.customer;
  } catch (error) {
    console.error('Error getting customer by token:', error);
    throw error;
  }
}

export async function findCustomerByEmail(config, email) {
  try {
    const response = await fetch(`https://${config.domain}/admin/api/2023-10/customers/search.json?query=email:${encodeURIComponent(email)}`, {
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.customers && data.customers.length > 0 ? data.customers[0] : null;
  } catch (error) {
    console.error('Error finding customer by email:', error);
    throw error;
  }
}

export async function validateAccessToken(config, accessToken) {
  try {
    const customer = await getCustomerByToken(config, accessToken);
    return customer !== null;
  } catch (error) {
    console.error('Access token validation failed:', error);
    return false;
  }
}
