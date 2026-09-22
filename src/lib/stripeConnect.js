/**
 * Stripe Connect over the REST API (this codebase talks to Stripe with fetch, not the SDK — see
 * app/api/repair-invoices/stripe.js). Express connected accounts + transfers, which is how payees
 * (artisans, consignors, affiliates, the owner) get paid from EFD's Stripe balance.
 *
 * Fee model (Express): the PLATFORM pays Stripe — transfers are free, payouts to the payee's bank
 * are $0.25 + 0.25%, and an active connected account is $2/month. The payee receives the full
 * amount; nothing is deducted from a transfer.
 */
const API = 'https://api.stripe.com/v1';

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeMode() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : 'unconfigured';
}

/** Flatten a nested object into Stripe's form encoding (a[b][c]=v). */
export function encodeForm(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? encodeForm(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') encodeForm(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripeRequest(method, path, body = null, { idempotencyKey = '' } = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw Object.assign(new Error('Stripe is not configured (STRIPE_SECRET_KEY).'), { code: 'STRIPE_UNCONFIGURED' });
  const headers = { Authorization: `Bearer ${secretKey}` };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? encodeForm(body).toString() : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data?.error?.message || `Stripe ${method} ${path} failed (${res.status})`);
    e.code = data?.error?.code || `HTTP_${res.status}`;
    e.type = data?.error?.type || '';
    e.status = res.status;
    throw e;
  }
  return data;
}

/** An Express account for an individual payee. `metadata.userID` ties it back to our user. */
export function createExpressAccount({ email, userID, name = '' }) {
  return stripeRequest('POST', '/accounts', {
    type: 'express',
    country: 'US',
    email,
    business_type: 'individual',
    capabilities: { transfers: { requested: true } },
    business_profile: { product_description: 'Jewelry bench labor, consignment and referral payouts from Engel Fine Design', mcc: '7631' },
    settings: { payouts: { schedule: { interval: 'daily' } } },
    metadata: { userID, name, platform: 'efd-admin' },
  });
}

export function createAccountLink({ accountId, returnUrl, refreshUrl }) {
  return stripeRequest('POST', '/account_links', {
    account: accountId,
    type: 'account_onboarding',
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
}

/** A one-time login link into the payee's Express dashboard (balance, payouts, bank details). */
export function createLoginLink({ accountId }) {
  return stripeRequest('POST', `/accounts/${accountId}/login_links`);
}

export function retrieveAccount(accountId) {
  return stripeRequest('GET', `/accounts/${accountId}`);
}

export function retrieveBalance() {
  return stripeRequest('GET', '/balance');
}

/** Move money from EFD's balance to a connected account. `idempotencyKey` makes retries safe. */
export function createTransfer({ amountCents, destination, description = '', metadata = {}, transferGroup = '', idempotencyKey }) {
  return stripeRequest('POST', '/transfers', {
    amount: Math.round(amountCents),
    currency: 'usd',
    destination,
    description,
    metadata,
    ...(transferGroup ? { transfer_group: transferGroup } : {}),
  }, { idempotencyKey });
}

/** The fields we keep about a connected account, from a Stripe account object. Pure. */
export function summarizeAccount(account = {}) {
  return {
    accountId: account.id || '',
    detailsSubmitted: account.details_submitted === true,
    payoutsEnabled: account.payouts_enabled === true,
    chargesEnabled: account.charges_enabled === true,
    transfersActive: account.capabilities?.transfers === 'active',
    requirementsDue: [...new Set([...(account.requirements?.currently_due || []), ...(account.requirements?.past_due || [])])],
    disabledReason: account.requirements?.disabled_reason || null,
    email: account.email || '',
  };
}

/** Available USD balance in cents from a Stripe balance object. Pure. */
export function availableUsdCents(balance = {}) {
  return (balance.available || []).filter((b) => b.currency === 'usd').reduce((s, b) => s + Number(b.amount || 0), 0);
}
