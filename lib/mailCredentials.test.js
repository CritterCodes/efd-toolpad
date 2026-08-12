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

  it('names EVERY accepted key when the password is missing', () => {
    // The old message named EMAIL_PASSWORD alone, which sent whoever read it hunting for a missing
    // secret rather than one configured under a different name.
    expect(() => resolveMailCredentials({ EMAIL_USER: USER }))
      .toThrow(/GMAIL_APP_PASSWORD \(or EMAIL_PASSWORD \/ EMAIL_PASS\) environment variable is required/);
  });

  it('reports only what is actually missing', () => {
    expect(() => resolveMailCredentials({ EMAIL_PASS: 'p' }))
      .toThrow(/^GMAIL_USER \(or EMAIL_USER\) environment variable is required/);
    expect(() => resolveMailCredentials({})).toThrow(/environment variables are required/);
  });

  it('treats an empty string as missing rather than as a credential', () => {
    expect(() => resolveMailCredentials({ EMAIL_USER: USER, EMAIL_PASS: '' })).toThrow(/GMAIL_APP_PASSWORD/);
  });

  it('an empty GMAIL_APP_PASSWORD falls through to the older names rather than blocking', () => {
    expect(resolveMailCredentials({ GMAIL_USER: USER, GMAIL_APP_PASSWORD: '', EMAIL_PASSWORD: 'p' }))
      .toEqual({ user: USER, pass: 'p' });
  });
});
