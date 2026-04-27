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

export async function fetchStripePaymentIntent(paymentIntentId) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (!paymentIntentId) {
    throw new Error('paymentIntentId is required.');
  }

  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch Stripe payment intent.');
  }

  return data;
}
