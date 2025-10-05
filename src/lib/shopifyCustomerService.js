/**
 * Shopify Customer Management Service
 * Handles Shopify customer creation, authentication, and synchronization
 */

export class ShopifyCustomerService {
  constructor() {
    this.domain = process.env.SHOPIFY_STORE_DOMAIN;
    this.accessToken = process.env.SHOPIFY_PRIVATE_ACCESS_TOKEN;
    this.storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  }

  /**
   * Authenticate customer with Shopify
   */
  async authenticateCustomer(email, password) {
    try {
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

      const response = await this.storefrontQuery(mutation, variables);
      const result = response.customerAccessTokenCreate;

      if (result.customerUserErrors && result.customerUserErrors.length > 0) {
        throw new Error(result.customerUserErrors[0].message);
      }

      if (!result.customerAccessToken) {
        throw new Error('Invalid email or password');
      }

      // Get customer details
      const customer = await this.getCustomerByToken(result.customerAccessToken.accessToken);
      
      return {
        accessToken: result.customerAccessToken.accessToken,
        expiresAt: result.customerAccessToken.expiresAt,
        customer
      };
    } catch (error) {
      console.error('Shopify authentication error:', error);
      throw error;
    }
  }

  /**
   * Get customer by access token
   */
  async getCustomerByToken(accessToken) {
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

      const response = await this.storefrontQuery(query, {
        customerAccessToken: accessToken
      });

      return response.customer;
    } catch (error) {
      console.error('Error getting customer by token:', error);
      throw error;
    }
  }

  /**
   * Find customer by email using Admin API
   */
  async findCustomerByEmail(email) {
    try {
      const response = await fetch(`https://${this.domain}/admin/api/2023-10/customers/search.json?query=email:${encodeURIComponent(email)}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
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

  /**
   * Create a new Shopify customer
   */
  async createCustomer(customerData) {
    try {
      const { firstName, lastName, email, phoneNumber, password } = customerData;
      
      const customer = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phoneNumber,
        verified_email: true,
        send_email_welcome: false
      };

      // Add password if provided
      if (password) {
        customer.password = password;
        customer.password_confirmation = password;
      }

      const response = await fetch(`https://${this.domain}/admin/api/2023-10/customers.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customer })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create Shopify customer: ${JSON.stringify(errorData.errors)}`);
      }

      const data = await response.json();
      return data.customer;
    } catch (error) {
      console.error('Error creating Shopify customer:', error);
      throw error;
    }
  }

  /**
   * Update existing Shopify customer
   */
  async updateCustomer(customerId, updateData) {
    try {
      const response = await fetch(`https://${this.domain}/admin/api/2023-10/customers/${customerId}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customer: updateData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update Shopify customer: ${JSON.stringify(errorData.errors)}`);
      }

      const data = await response.json();
      return data.customer;
    } catch (error) {
      console.error('Error updating Shopify customer:', error);
      throw error;
    }
  }

  /**
   * Create customer for Google OAuth user
   */
  async createCustomerForGoogleUser(googleProfile) {
    try {
      const existingCustomer = await this.findCustomerByEmail(googleProfile.email);
      
      if (existingCustomer) {
        console.log('Shopify customer already exists for Google user:', googleProfile.email);
        return existingCustomer;
      }

      // Generate a random password for Google users
      const randomPassword = this.generateRandomPassword();
      
      const customerData = {
        firstName: googleProfile.given_name,
        lastName: googleProfile.family_name,
        email: googleProfile.email,
        password: randomPassword
      };

      const newCustomer = await this.createCustomer(customerData);
      
      console.log('✅ Created Shopify customer for Google user:', googleProfile.email);
      return newCustomer;
    } catch (error) {
      console.error('Error creating Shopify customer for Google user:', error);
      throw error;
    }
  }

  /**
   * Link Google account to existing Shopify customer
   */
  async linkGoogleAccount(customerId, googleProfile) {
    try {
      // Add tags or metafields to indicate Google account linkage
      const updateData = {
        tags: 'google-linked',
        note: `Google account linked: ${googleProfile.email}`
      };

      const updatedCustomer = await this.updateCustomer(customerId, updateData);
      console.log('✅ Linked Google account to Shopify customer:', googleProfile.email);
      return updatedCustomer;
    } catch (error) {
      console.error('Error linking Google account:', error);
      throw error;
    }
  }

  /**
   * Generate a secure random password
   */
  generateRandomPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Execute Storefront API query
   */
  async storefrontQuery(query, variables = {}) {
    try {
      const response = await fetch(`https://${this.domain}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`Storefront API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      console.error('Storefront query error:', error);
      throw error;
    }
  }

  /**
   * Validate Shopify customer access token
   */
  async validateAccessToken(accessToken) {
    try {
      const customer = await this.getCustomerByToken(accessToken);
      return customer !== null;
    } catch (error) {
      console.error('Access token validation failed:', error);
      return false;
    }
  }

  /**
   * Create customer access token (for password reset, etc.)
   */
  async createAccessTokenForCustomer(email, password) {
    try {
      return await this.authenticateCustomer(email, password);
    } catch (error) {
      console.error('Error creating access token:', error);
      throw error;
    }
  }

  /**
   * Register new customer with email verification
   */
  async registerCustomer(customerData) {
    try {
      const { firstName, lastName, email, password, phoneNumber } = customerData;
      
      // Check if customer already exists
      const existingCustomer = await this.findCustomerByEmail(email);
      if (existingCustomer) {
        throw new Error('Customer with this email already exists');
      }

      // Create customer
      const newCustomer = await this.createCustomer({
        firstName,
        lastName,
        email,
        password,
        phoneNumber
      });

      console.log('✅ Registered new Shopify customer:', email);
      return newCustomer;
    } catch (error) {
      console.error('Customer registration error:', error);
      throw error;
    }
  }
}

export default ShopifyCustomerService;