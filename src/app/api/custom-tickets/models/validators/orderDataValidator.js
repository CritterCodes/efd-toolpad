/**
 * Validates order data format.
 */
export const validateOrderData = async (orderData) => {
  const errors = [];

  if (!orderData.amount || typeof orderData.amount !== 'number' || orderData.amount <= 0) {
    errors.push('Amount is required and must be a positive number');
  }

  if (!orderData.customerEmail || typeof orderData.customerEmail !== 'string') {
    errors.push('Customer email is required');
  }

  if (orderData.customerEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.customerEmail)) {
      errors.push('Customer email must be a valid email address');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Order validation failed: ${errors.join(', ')}`);
  }

  return true;
};
