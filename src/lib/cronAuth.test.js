import { describe, it, expect, beforeEach } from 'vitest';
import { cronAuthorized } from './cronAuth';

/**
 * Exists because every cron route checked only ?secret= while Vercel's scheduler
 * sends Authorization: Bearer — so every scheduled cron 403'd silently and the
 * commission sweep + daily repricer never ran on schedule.
 */
const req = ({ auth, secret } = {}) => ({
  headers: { get: (k) => (k === 'authorization' ? auth || null : null) },
  nextUrl: { searchParams: { get: (k) => (k === 'secret' ? secret || null : null) } },
});

describe('cronAuthorized', () => {
  beforeEach(() => { process.env.CRON_SECRET = 's3cret'; });

  it("accepts Vercel's Authorization: Bearer header", () => {
    expect(cronAuthorized(req({ auth: 'Bearer s3cret' }))).toBe(true);
  });

  it('accepts the manual ?secret= form', () => {
    expect(cronAuthorized(req({ secret: 's3cret' }))).toBe(true);
  });

  it('rejects wrong or missing credentials', () => {
    expect(cronAuthorized(req({ auth: 'Bearer wrong' }))).toBe(false);
    expect(cronAuthorized(req({ secret: 'wrong' }))).toBe(false);
    expect(cronAuthorized(req())).toBe(false);
  });

  it('with no CRON_SECRET configured, NOTHING is authorized', () => {
    delete process.env.CRON_SECRET;
    expect(cronAuthorized(req({ auth: 'Bearer undefined' }))).toBe(false);
    expect(cronAuthorized(req({ secret: '' }))).toBe(false);
  });
});
