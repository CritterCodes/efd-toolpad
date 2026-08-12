import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { portalLink, PORTAL_TABS } from './appUrls.js';

/**
 * The portal has ALWAYS supported `?id=CO-…&tab=quote` (TAB_SLUGS / tabIndexFromSlug in efd-shop
 * app/custom-work/portal/page.js). Admin linked to the bare portal root everywhere, so a customer
 * clicking "your quote is ready" — in the app or in the email — landed on a list and had to find the
 * request and the tab themselves. The feature existed; nothing used it.
 */
const ORIGINAL = { ...process.env };
beforeEach(() => { process.env.NEXT_PUBLIC_SHOP_URL = 'https://shop.engelfinedesign.com'; });
afterEach(() => { process.env = { ...ORIGINAL }; });

describe('portalLink', () => {
  it('deep-links a request to a specific tab', () => {
    expect(portalLink('CO-abc', 'quote'))
      .toBe('https://shop.engelfinedesign.com/custom-work/portal?id=CO-abc&tab=quote');
  });

  it('supports every tab the portal actually has', () => {
    expect(PORTAL_TABS).toEqual(['overview', '3d', 'moodboard', 'messages', 'quote', 'invoices']);
    for (const t of PORTAL_TABS) expect(portalLink('CO-abc', t)).toContain(`tab=${t}`);
  });

  it('falls back to overview for an unknown tab rather than emitting a dead slug', () => {
    // An unrecognised slug lands on Overview in the portal, silently — which is the bug this fixes.
    expect(portalLink('CO-abc', 'nope')).toContain('tab=overview');
  });

  it('returns the bare portal when there is no order to open', () => {
    expect(portalLink('')).toBe('https://shop.engelfinedesign.com/custom-work/portal');
    expect(portalLink()).toBe('https://shop.engelfinedesign.com/custom-work/portal');
  });

  it('encodes the id so an odd customID cannot break the query string', () => {
    expect(portalLink('CO a&b', 'quote')).toContain('id=CO%20a%26b');
  });

  it('defaults to overview when no tab is named', () => {
    expect(portalLink('CO-abc')).toContain('tab=overview');
  });
});
