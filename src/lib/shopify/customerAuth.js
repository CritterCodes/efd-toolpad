import { storefrontQuery, generateRandomPassword } from './utils.js';
import { getCustomerByToken, findCustomerByEmail } from './customerQueries.js';
import { createCustomer, updateCustomer } from './customerMutations.js';

export async function authenticateCustomer(config, email, password) {
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

    const response = await storefrontQuery(config, mutation, variables);
    const result = response.customerAccessTokenCreate;

    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new Error(result.customerUserErrors[0].message);
    }

    if (!result.customerAccessToken) {
      throw new Error('Invalid email or password');
    }

    // Get customer details
    const customer = await getCustomerByToken(config, result.customerAccessToken.accessToken);
    
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

export async function createCustomerForGoogleUser(config, googleProfile) {
  try {
    const existingCustomer = await findCustomerByEmail(config, googleProfile.email);
    
    if (existingCustomer) {
      console.log('Shopify customer already exists for Google user:', googleProfile.email);
      return existingCustomer;
    }

    // Generate a random password for Google users
    const randomPassword = generateRandomPassword();
    
    const customerData = {
      firstName: googleProfile.given_name,
      lastName: googleProfile.family_name,
      email: googleProfile.email,
      password: randomPassword
    };

    const newCustomer = await createCustomer(config, customerData);
    
    console.log('✅ Created Shopify customer for Google user:', googleProfile.email);
    return newCustomer;
  } catch (error) {
    console.error('Error creating Shopify customer for Google user:', error);
    throw error;
  }
}

export async function linkGoogleAccount(config, customerId, googleProfile) {
  try {
    // Add tags or metafields to indicate Google account linkage
    const updateData = {
      tags: 'google-linked',
      note: `Google account linked: ${googleProfile.email}`
    };

    const updatedCustomer = await updateCustomer(config, customerId, updateData);
    console.log('✅ Linked Google account to Shopify customer:', googleProfile.email);
    return updatedCustomer;
  } catch (error) {
    console.error('Error linking Google account:', error);
    throw error;
  }
}

export async function createAccessTokenForCustomer(config, email, password) {
  try {
    return await authenticateCustomer(config, email, password);
  } catch (error) {
    console.error('Error creating access token:', error);
    throw error;
  }
}

export async function registerCustomer(config, customerData) {
  try {
    const { firstName, lastName, email, password, phoneNumber } = customerData;
    
    // Check if customer already exists
    const existingCustomer = await findCustomerByEmail(config, email);
    if (existingCustomer) {
      throw new Error('Customer with this email already exists');
    }

    // Create customer
    const newCustomer = await createCustomer(config, {
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
