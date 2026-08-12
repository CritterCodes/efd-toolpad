import { describe, it, expect } from 'vitest';
import { isPermanentEmailError } from './email.js';

/**
 * INCIDENT: "Could not attach the STL" on an upload that had entirely succeeded.
 *
 * attach-stl recorded the 91 MB STL, moved the work order to QC, then sat sending an admin
 * notification per admin. Each send retried 3× with a 5s sleep between attempts — 10 seconds of pure
 * waiting per recipient on a failure that could never succeed, because the mail credentials are not
 * configured. Vercel killed the function at 15s, the client got a 504, and the bench was told the
 * upload failed.
 *
 * Retrying is for TRANSIENT faults. A configuration or authentication fault is deterministic: the same
 * call fails the same way five seconds later, so a retry adds latency and nothing else.
 */
describe('isPermanentEmailError', () => {
  it('treats missing credentials as permanent — the fault that caused the 504', () => {
    expect(isPermanentEmailError(new Error(
      'EMAIL_USER and EMAIL_PASSWORD (or EMAIL_PASS) environment variables are required',
    ))).toBe(true);
  });

  it('treats the older single-key wording as permanent too', () => {
    expect(isPermanentEmailError(new Error(
      'EMAIL_USER and EMAIL_PASSWORD environment variables are required',
    ))).toBe(true);
  });

  it('treats a missing template as permanent — it will not appear on retry', () => {
    expect(isPermanentEmailError(new Error('Template not found: payment-received'))).toBe(true);
  });

  it('treats SMTP auth rejections as permanent', () => {
    for (const m of ['535 5.7.8 Username and Password not accepted', 'Invalid login: 535', 'authentication failed']) {
      expect(isPermanentEmailError(new Error(m))).toBe(true);
    }
  });

  it('treats genuinely transient faults as retryable', () => {
    for (const m of ['socket hang up', 'ETIMEDOUT', 'getaddrinfo EAI_AGAIN smtp.gmail.com',
      '421 Service not available, closing transmission channel', 'ECONNRESET']) {
      expect(isPermanentEmailError(new Error(m))).toBe(false);
    }
  });

  it('does not choke on a missing or malformed error', () => {
    expect(isPermanentEmailError(null)).toBe(false);
    expect(isPermanentEmailError({})).toBe(false);
    expect(isPermanentEmailError(new Error(''))).toBe(false);
  });

  it('does not mistake a number inside an address or id for an SMTP code', () => {
    // Word-boundary matching on the codes, so "user535@x.com" is not an auth failure.
    expect(isPermanentEmailError(new Error('connection reset for user5351@example.com'))).toBe(false);
  });
});
