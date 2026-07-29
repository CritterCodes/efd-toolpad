import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { adminBase, shopBase, adminLink, shopLink } from '@/lib/appUrls';

/**
 * These links only ever appear in NOTIFICATION EMAILS, so "absolute or nothing" is the whole
 * contract. Before this helper, `NEXT_PUBLIC_ADMIN_URL` was interpolated at ~26 sites and every one
 * broke when it was unset — which it is in production:
 *   - 19 used `|| ''`  → "/dashboard/payroll", a relative href, inert in an email client
 *   -  7 had no fallback → the literal string "undefined/products/abc"
 * So the two tests that matter most are: never empty, never "undefined".
 */

const VARS = ['NEXT_PUBLIC_ADMIN_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_SHOP_URL', 'EFD_SHOP_URL'];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
  VARS.forEach((k) => delete process.env[k]);
});
afterEach(() => {
  VARS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
});

describe('never emits a broken URL', () => {
  it('with NOTHING set, still returns an absolute https URL', () => {
    for (const u of [adminBase(), shopBase()]) {
      expect(u).toMatch(/^https:\/\//);
      expect(u).not.toBe('');
      expect(u).not.toContain('undefined');
    }
  });

  it('never renders the literal "undefined" into a link (the 7 unguarded sites)', () => {
    expect(adminLink('/products/abc')).toBe('https://admin.engelfinedesign.com/products/abc');
    expect(adminLink('/products/abc')).not.toContain('undefined');
  });

  it('never renders a RELATIVE link (the 19 `|| \'\'` sites)', () => {
    expect(adminLink('/dashboard/payroll').startsWith('/')).toBe(false);
  });

  it('treats an empty or whitespace env var as unset rather than trusting it', () => {
    process.env.NEXT_PUBLIC_ADMIN_URL = '';
    expect(adminBase()).toMatch(/^https:\/\//);
    process.env.NEXT_PUBLIC_ADMIN_URL = '   ';
    expect(adminBase()).toMatch(/^https:\/\//);
  });

  it('uses the real domain — engelfinedesign, not the typo\'d engelsfinedesign', () => {
    expect(adminBase()).toContain('engelfinedesign.com');
    expect(adminBase()).not.toContain('engelsfinedesign');
    expect(shopBase()).not.toContain('engelsfinedesign');
  });
});

describe('precedence', () => {
  it('prefers NEXT_PUBLIC_ADMIN_URL, then NEXTAUTH_URL, then the fallback', () => {
    process.env.NEXTAUTH_URL = 'https://nextauth.example';
    expect(adminBase()).toBe('https://nextauth.example');       // the owner's point: this already exists
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://explicit.example';
    expect(adminBase()).toBe('https://explicit.example');
  });

  it('prefers NEXT_PUBLIC_SHOP_URL, then EFD_SHOP_URL, then the fallback', () => {
    process.env.EFD_SHOP_URL = 'https://efdshop.example';
    expect(shopBase()).toBe('https://efdshop.example');
    process.env.NEXT_PUBLIC_SHOP_URL = 'https://shop.example';
    expect(shopBase()).toBe('https://shop.example');
  });
});

describe('joining', () => {
  it('does not double up slashes, whichever side has one', () => {
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://a.example/';
    expect(adminLink('/dashboard')).toBe('https://a.example/dashboard');
    expect(adminLink('dashboard')).toBe('https://a.example/dashboard');
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://a.example///';
    expect(adminLink('///dashboard')).toBe('https://a.example/dashboard');
  });

  it('returns the bare base for an empty path', () => {
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://a.example';
    expect(adminLink()).toBe('https://a.example');
    expect(adminLink('')).toBe('https://a.example');
    expect(shopLink()).toMatch(/^https:\/\//);
  });
});
