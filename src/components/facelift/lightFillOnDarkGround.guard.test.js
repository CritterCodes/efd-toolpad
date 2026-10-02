import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: no light background hex on the near-black ground.
 *
 * The app is dark-only. A pale fill inherits the white text above it, so it renders white-on-white and the
 * row disappears. Two did: `bgcolor: '#e3f2fd'` on the Stuller material line (about 1.1:1) and
 * `bgcolor: '#ffebee'` on the rush fee (about 1.05:1), plus `backgroundColor: '#e3f2fd'` on the Move
 * summary. The Stuller line is the one naming the metal to pull, so the line a jeweler needed was the one
 * he could not read, on screen since the facelift.
 *
 * The vendored Impeccable detector does NOT catch these: it reads `backgroundColor` and `background` but
 * is blind to MUI's `bgcolor` shorthand, which is the form all three took. That is why this lives here and
 * is keyed on luminance rather than on a list of known-bad hexes — the next one will be a different hex.
 *
 * A tinted region is `tint(hue)` from the facelift kit: ~13% fill, 42% stroke, full-strength text.
 * Print and email are exempt: they are ink on white by design.
 */
const SRC = path.resolve(__dirname, '../..');

// Print/email output is deliberately light — a different medium, not this ground.
const EXEMPT_PATH = /[\\/](print|bulk-print|invoicePrint|emailTemplate)/i;

// Light by design, each for a stated reason. A fill belongs here only when something other than this app's
// own chrome owns the pixels, or when the same block sets its own dark text.
const EXEMPT_FILE = {
  'app/dashboard/users/wholesalers/[wholesalerId]/transfer-list/page.js':
    'a printable transfer document — it sets color #000 on the white and ships a @media print block',
  'app/dashboard/wholesaler/billing/page.js':
    'the mount node for Stripe Embedded Checkout, which renders its own light UI into it',
  'app/dashboard/wholesaler/repairs/schedule-pickup/InboundShipDialog.js':
    'the mount node for Stripe Embedded Checkout, which renders its own light UI into it',
  'components/analytics/AnalyticsCarousel.js':
    'a Recharts tooltip that sets labelStyle color #333 on its own white — readable, but off-brand; fix when charts take the token pass',
};

const BACKGROUND_HEX = /\b(?:bgcolor|backgroundColor|background)\s*:\s*(?:[^,;}\n]*?)['"](#[0-9a-fA-F]{3,8})['"]/g;

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(hex) {
  const raw = hex.replace('#', '').slice(0, 6);
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.padEnd(6, '0');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Anything at or above this reads as a light slab under white text. #e3f2fd is 0.86, #ffebee 0.89;
// the brand's own gold #FBBF24 is 0.60 and is only ever used with ground-coloured text on top.
const TOO_LIGHT = 0.7;

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'graphify-out') continue;
      sourceFiles(full, out);
    } else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function lightFills(text) {
  const hits = [];
  for (const match of text.matchAll(BACKGROUND_HEX)) {
    if (luminance(match[1]) >= TOO_LIGHT) hits.push(match[1]);
  }
  return hits;
}

describe('a background on the dark ground', () => {
  it('is never a light hex', () => {
    const offenders = [];
    for (const file of sourceFiles(SRC)) {
      const rel = path.relative(SRC, file).replace(/\\/g, '/');
      if (EXEMPT_PATH.test(rel) || EXEMPT_FILE[rel]) continue;
      for (const hex of lightFills(fs.readFileSync(file, 'utf8'))) offenders.push(`${rel}: ${hex}`);
    }

    expect(offenders).toEqual([]);
  });

  it('every exemption still earns its place', () => {
    // An exemption for a file that no longer has a light fill is a stale waiver — the thing that let the
    // vendored detector's Arial whitelist go on passing after the print CSS moved to another file.
    const stale = Object.keys(EXEMPT_FILE).filter((rel) => {
      const full = path.join(SRC, rel);
      return !fs.existsSync(full) || lightFills(fs.readFileSync(full, 'utf8')).length === 0;
    });

    expect(stale).toEqual([]);
  });

  it('catches the three that shipped, including the bgcolor shorthand the detector misses', () => {
    // The guard has to be able to fail, and it has to cover the exact form these took.
    expect(lightFills(`sx={{ bgcolor: '#e3f2fd' }}`)).toEqual(['#e3f2fd']);
    expect(lightFills(`sx={{ bgcolor: item.isStullerItem ? '#e3f2fd' : 'transparent' }}`)).toEqual(['#e3f2fd']);
    expect(lightFills(`backgroundColor: '#ffebee',`)).toEqual(['#ffebee']);
  });

  it('leaves the brand alone', () => {
    // Gold carries ground-coloured text by rule, and the dark surfaces are the point.
    expect(lightFills(`background: '#FBBF24'`)).toEqual([]);
    expect(lightFills(`bgcolor: '#08090B'`)).toEqual([]);
    expect(lightFills(`backgroundColor: '#12141A'`)).toEqual([]);
    // A border or a text colour is not a fill; this guard is about what sits under the type.
    expect(lightFills(`border: '1px solid #e3f2fd'`)).toEqual([]);
  });
});
