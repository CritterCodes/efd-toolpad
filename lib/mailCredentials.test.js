import { describe, it, expect } from 'vitest';
import { resolveMailCredentials } from './email.js';

/**
 * THE KEY-NAME MISMATCH THAT CAUSED THE OUTAGE.
 *
 * The app grew two mail modules with two names for one secret: src/app/utils/email.util.js reads
 * EMAIL_PASS, lib/email.js read EMAIL_PASSWORD. Production has EMAIL_PASS set — so the util worked,
 * and every notification (quotes, invoices, receipts, artisan mail) died here on a credential that was
 * configured the whole time under the other name.
 *
 * The old error said only "EMAIL_USER and EMAIL_PASSWORD ... are required", which sent anyone reading
 * it hunting for a missing secret instead of a renamed one.
 */
describe('resolveMailCredentials', () => {
  const USER = 'shop@efd.test';

  it('accepts EMAIL_PASS — the name actually deployed in production', () => {
    expect(resolveMailCredentials({ EMAIL_USER: USER, EMAIL_PASS: 'p' })).toEqual({ user: USER, pass: 'p' });
  });

  it('accepts EMAIL_PASSWORD', () => {
    expect(resolveMailCredentials({ EMAIL_USER: USER, EMAIL_PASSWORD: 'p' })).toEqual({ user: USER, pass: 'p' });
  });

  it('prefers EMAIL_PASSWORD when both are present, so a migration can land safely', () => {
    expect(resolveMailCredentials({ EMAIL_USER: USER, EMAIL_PASSWORD: 'new', EMAIL_PASS: 'old' }).pass).toBe('new');
  });

  it('names BOTH accepted keys when the password is missing', () => {
    expect(() => resolveMailCredentials({ EMAIL_USER: USER }))
      .toThrow(/EMAIL_PASSWORD \(or EMAIL_PASS\) environment variable is required/);
  });

  it('reports only what is actually missing', () => {
    expect(() => resolveMailCredentials({ EMAIL_PASS: 'p' })).toThrow(/^EMAIL_USER environment variable is required/);
    expect(() => resolveMailCredentials({})).toThrow(/EMAIL_USER and EMAIL_PASSWORD \(or EMAIL_PASS\) environment variables are required/);
  });

  it('treats an empty string as missing rather than as a credential', () => {
    expect(() => resolveMailCredentials({ EMAIL_USER: USER, EMAIL_PASS: '' })).toThrow(/EMAIL_PASSWORD/);
  });
});
