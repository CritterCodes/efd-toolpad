export async function createStripePaymentIntent({
  amountInCents,
  metadata = {},
  cardPresent = false,
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const body = new URLSearchParams();
  body.set('amount', String(amountInCents));
  body.set('currency', 'usd');
  body.set('capture_method', 'automatic');

  if (cardPresent) {
    body.append('payment_method_types[]', 'card_present');
  } else {
    body.append('payment_method_types[]', 'card');
    body.set('automatic_payment_methods[enabled]', 'true');
  }

  Object.entries(metadata).forEach(([key, value]) => {
    if (value != null && value !== '') {
      body.set(`metadata[${key}]`, String(value));
    }
  });

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to create Stripe payment intent.');
  }

  return data;
}

async function stripeRequest(path, {
  method = 'GET',
  body,
} = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? body.toString() : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Stripe request failed.');
  }

  return data;
}

export async function createTerminalConnectionToken() {
  return await stripeRequest('/terminal/connection_tokens', {
    method: 'POST',
    body: new URLSearchParams(),
  });
}

export async function listTerminalLocations() {
  return await stripeRequest('/terminal/locations?limit=100');
}

export async function createTerminalLocation({
  displayName,
  address = {},
}) {
  const body = new URLSearchParams();
  body.set('display_name', displayName);
  body.set('address[line1]', address.line1 || '');
  if (address.line2) body.set('address[line2]', address.line2);
  body.set('address[city]', address.city || '');
  body.set('address[state]', address.state || '');
  body.set('address[country]', address.country || 'US');
  body.set('address[postal_code]', address.postalCode || address.postal_code || '');

  return await stripeRequest('/terminal/locations', {
    method: 'POST',
    body,
  });
}

export async function fetchStripePaymentIntent(paymentIntentId) {
  if (!paymentIntentId) {
    throw new Error('paymentIntentId is required.');
  }

  return await stripeRequest(`/payment_intents/${paymentIntentId}`);
}
