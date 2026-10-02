import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: a fact on a screen is a `Field`, not `<strong>Label:</strong> value`.
 *
 * 82 sites across 19 files wrote a fact that way. It renders the label and the value in the same family,
 * size, tracking and colour — one typographic tier for a whole screen, so a card of six facts has no
 * hierarchy and nothing scans. `<strong>` also claims *strong importance* for the part nobody reads; the
 * value is the part that matters. `Field` gives the label the mono voice DESIGN.md defines and leaves the
 * value in the reading face, and `FieldList` columns a group of them from 375px up.
 *
 * Two uses are not this bug and are excluded:
 *
 * - **Surfaces the kit does not reach.** Print and email templates are ink-on-white documents rendered
 *   outside the app's CSS. `/emergency-logout` is the same case for a different reason: it sits outside the
 *   dashboard providers, on MUI's *default light* palette, so a `Field` label rendered white on a pale blue
 *   Alert at about 1.1:1 — measured in the browser, invisible. The fix there is the page, not the row.
 * - **Prose emphasis** — `<strong>Security Notice:</strong> This PIN will only be displayed once.` is a
 *   sentence with a lead-in, not a label and a value. The test only counts a `<strong>` whose next
 *   non-space character starts an expression or ends the element, which is the label-and-value shape.
 *
 * This is a ratchet: it may only go down.
 */
const SRC = path.resolve(__dirname, '../..');

// 82 at the start, counted loosely. Counted strictly — a label followed by an expression, which is the
// shape of the bug, on a surface the kit reaches — it was 9 before this sweep and is 1 after it. The one left is arguably not the bug:
// `<strong>Install Prompt Status:</strong> {…}` sits inside an Alert whose severity already says the same
// thing. It is left in the count rather than excluded, so whoever touches that panel decides with it in
// front of them.
const MAX_LABEL_SITES = 1;

/** Surfaces the dark kit does not reach, where `<strong>` is the right tag. See the header. */
const UNTHEMED = [
  'app/dashboard/repairs/pick-up/invoicePrint.js',
  'components/print/RepairReceiptComponent.js',
  'services/customs/customInvoiceHtml.js',
  'app/emergency-logout/components/SessionStatusAlert.js',
];

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

/**
 * `<strong>Something:</strong>` followed by a value — `{expr}` or text on the same line. A line inside a
 * block comment (` * …`) is a file explaining the bug, not committing it.
 */
const LABEL_ROW = /<strong>[^<{]*:<\/strong>\s*\{/;

function labelSites() {
  const found = [];
  for (const file of sourceFiles(SRC)) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/');
    if (UNTHEMED.includes(rel)) continue;
    const hits = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !/^\s*\*/.test(line) && LABEL_ROW.test(line)).length;
    if (hits) found.push(`${rel} (${hits})`);
  }
  return found;
}

const siteCount = () => labelSites().reduce((n, row) => n + Number(row.match(/\((\d+)\)$/)[1]), 0);

describe('a fact on a screen', () => {
  it('has one shape in the kit', () => {
    const kit = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, 'facelift.module.css'), 'utf8');

    expect(kit).toMatch(/export function Field\b/);
    expect(kit).toMatch(/export function FieldList\b/);
    // The label's voice is what separates it from its value.
    expect(css).toMatch(/\.fieldLabel\s*\{[\s\S]{0,200}?font-family:\s*var\(--fl-mono/);
  });

  it('is not written as a bold label and a value', () => {
    const found = labelSites();
    expect(
      siteCount(),
      `\`<strong>Label:</strong> {value}\` in:\n  ${found.join('\n  ')}\nUse Field/FieldList and lower MAX_LABEL_SITES.`,
    ).toBeLessThanOrEqual(MAX_LABEL_SITES);
  });

  it('keeps the ratchet honest', () => {
    // If the count has dropped, the constant drops with it, or the guard stops biting.
    expect(siteCount(), 'fewer than the ratchet allows — lower MAX_LABEL_SITES to match').toBe(MAX_LABEL_SITES);
  });
});
