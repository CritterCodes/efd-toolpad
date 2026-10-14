import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * INLINE `sx` ONLY GOES DOWN.
 *
 * The 2026-10-02 critique measured 4,778 inline style objects against Kuzu's 58, and named it as the
 * thing standing between this app and that one. Measured again 2026-10-14: **5,286**. It has been going
 * UP the whole time, through a run of twenty-six UI PRs that were supposed to bring it down.
 *
 * That is the more useful fact than the number itself. Nobody decided to add 508 style objects; they
 * arrived one `sx={{ mb: 2 }}` at a time, each obviously fine on its own, because nothing counted. Every
 * other number in this codebase that actually fell — `no-console` 368 → 0, `max-lines` 42 → 16,
 * `<strong>` labels 82 → 1, MUI `<Tabs>` 30 → 1 — fell because something refused to let it rise.
 *
 * So this is the floor, not a fix. It does not convert anything. It makes the next screen that reaches
 * for an inline object pay for it by lowering this number somewhere else first, which is exactly how the
 * other ratchets worked.
 *
 * **Lower BASELINE whenever you remove some.** Never raise it. If a change genuinely needs more, it
 * needs them in `facelift.module.css` or a `const` beside the component instead — which is the point.
 */

const SRC = path.join(process.cwd(), 'src');

/** Same patterns the critique counted with, so the numbers stay comparable to its 4,778 and 162. */
const INLINE_SX = /sx=\{\{/g;
const SPINNER = /<CircularProgress/g;

const BASELINE = 5286;

/**
 * The hand-placed spinner, 162 at the critique and **166** now — also rising.
 *
 * Step 3 of the owner's order replaces these with route-level `loading.js` on the kit's `LoadingPage`
 * and `Skeleton`, so the page keeps its shape instead of vanishing behind a ring. Nine route-state files
 * exist; the 166 are the rest of that job, and every one sits behind the sign-in, so converting them
 * needs a session nobody has had (docs/FRICTION-LOG.md, 2026-10-14).
 *
 * Until someone can see them, this at least stops the number climbing while the sweep waits.
 */
const SPINNER_BASELINE = 166;

function count(pattern = INLINE_SX) {
  let total = 0;
  const perFile = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx)$/.test(e.name) || /\.test\.|\.guard\.|\.ratchet\./.test(e.name)) continue;
      const n = (fs.readFileSync(p, 'utf8').match(pattern) || []).length;
      if (n) { total += n; perFile.push([path.relative(process.cwd(), p).replace(/\\/g, '/'), n]); }
    }
  })(SRC);
  return { total, perFile };
}

describe('inline sx', () => {
  it(`is at most ${BASELINE} and falling`, () => {
    const { total, perFile } = count();
    const worst = perFile.sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([f, n]) => `${String(n).padStart(4)}  ${f}`).join('\n  ');
    expect(
      total,
      `Inline sx is ${total}, over the ${BASELINE} baseline. Put the styles in facelift.module.css or a `
      + `const beside the component rather than inline. Heaviest files:\n  ${worst}`,
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('tells you when the baseline is stale, so it actually ratchets down', () => {
    const { total } = count();
    // Not a failure — a nudge. A ratchet nobody lowers is just a ceiling.
    if (total < BASELINE) {
      console.log(`[inline-sx] ${total} now, baseline ${BASELINE}. Lower BASELINE to ${total} in ${path.basename(__filename)}.`);
    }
    expect(total).toBeGreaterThan(0); // the pattern still matches something; a zero here means it broke
  });
});

describe('hand-placed spinners', () => {
  it(`are at most ${SPINNER_BASELINE} and falling`, () => {
    const { total, perFile } = count(SPINNER);
    const worst = perFile.sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([f, n]) => `${String(n).padStart(3)}  ${f}`).join('\n  ');
    expect(
      total,
      `<CircularProgress> is at ${total}, over the ${SPINNER_BASELINE} baseline. A route-level loading.js `
      + 'on LoadingPage/Skeleton keeps the page\'s shape instead of replacing it with a ring. '
      + `Heaviest files:\n  ${worst}`,
    ).toBeLessThanOrEqual(SPINNER_BASELINE);
  });

  it('says when it can be lowered', () => {
    const { total } = count(SPINNER);
    if (total < SPINNER_BASELINE) {
      console.log(`[spinners] ${total} now, baseline ${SPINNER_BASELINE}. Lower SPINNER_BASELINE to ${total}.`);
    }
    expect(total).toBeGreaterThanOrEqual(0);
  });
});
