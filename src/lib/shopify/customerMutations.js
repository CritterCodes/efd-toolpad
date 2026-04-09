export async function createCustomer(config, customerData) {
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

    const response = await fetch(`https://${config.domain}/admin/api/2023-10/customers.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
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

export async function updateCustomer(config, customerId, updateData) {
  try {
    const response = await fetch(`https://${config.domain}/admin/api/2023-10/customers/${customerId}.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
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
