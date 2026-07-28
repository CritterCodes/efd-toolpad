/**
 * Meta Conversions API transport.
 *
 * External API calls only — no business logic. Deciding *whether* a repair
 * should be reported lives in src/services/repairs/paidRepairReporting.js.
 *
 * Modelled on src/app/api/repair-invoices/stripe.js: raw fetch, secret read
 * from process.env at call time, vendor error message unwrapped.
 */

const GRAPH_VERSION = 'v21.0';

/** Whether the integration is configured. Callers should skip silently if not. */
export function isMetaCapiConfigured() {
  return Boolean(process.env.META_CAPI_ACCESS_TOKEN && process.env.META_PIXEL_ID);
}

async function metaRequest(path, payload) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('META_CAPI_ACCESS_TOKEN is not configured.');
  }

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, access_token: accessToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Meta Conversions API request failed.');
  }

  return data;
}

/**
 * Send one or more server-side conversion events.
 *
 * @param {Array<object>} events - Meta event objects, already fully built.
 * @returns {Promise<object>} Meta's response ({ events_received, ... }).
 */
export async function sendConversionEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return { events_received: 0, skipped: 'no events' };
  }

  const pixelId = process.env.META_PIXEL_ID;
  if (!pixelId) {
    throw new Error('META_PIXEL_ID is not configured.');
  }

  const payload = { data: events };

  // Routes events to Test Events in Events Manager instead of production
  // reporting. Leave unset outside of manual verification.
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE;
  if (testEventCode) payload.test_event_code = testEventCode;

  return metaRequest(`/${pixelId}/events`, payload);
}
