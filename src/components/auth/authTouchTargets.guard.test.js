import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE LINKS ON THE WAY BACK IN ARE TAPPABLE.
 *
 * `.textLink` and `.helperLink` were the height of their own text — 23px for "Back to sign in" and
 * "Need support?", 24px for "Forgot?" — against the 44px this app holds everything else to. They are
 * also the links a person who CANNOT GET IN has to hit, on a phone, usually in a hurry.
 *
 * It lasted because `scripts/views.mjs` signs in before it crawls, so it has never opened any of these
 * five pages and never will (docs/FRICTION-LOG.md, 2026-10-02: "the views crawl signs in, so it can
 * never see a signed-out page"). Measured by hand in a browser at 375px, 2026-10-14, after a local
 * server could finally serve the app again (#317, #321).
 *
 * This pins the CSS rather than the rendered box, because rendering it needs a browser and the point is
 * to catch someone quietly dropping `min-height` while tidying the stylesheet.
 */
const CSS = path.join(process.cwd(), 'src', 'components', 'auth', 'AuthForm.module.css');

/** The declarations of the rule whose selector list contains `name`. */
function rule(name) {
  const css = fs.readFileSync(CSS, 'utf8');
  // Every block whose selector list mentions the class, taking the one that sets a min-height.
  const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, sel]) => sel.includes(`.${name}`) && !sel.includes(':hover'));
  expect(blocks.length, `.${name} has no rule at all`).toBeGreaterThan(0);
  return blocks.map(([, , body]) => body).join('\n');
}

describe('auth touch targets', () => {
  for (const name of ['textLink', 'helperLink']) {
    it(`.${name} is at least 44px tall`, () => {
      const body = rule(name);
      const m = /min-height:\s*([\d.]+)px/.exec(body);
      expect(m, `.${name} must set a min-height — it is a tap target on a phone, not just words`).not.toBeNull();
      expect(Number(m[1]), `.${name} min-height`).toBeGreaterThanOrEqual(44);
    });

    it(`.${name} centres its label, so growing the box does not move the text`, () => {
      const body = rule(name);
      expect(body).toMatch(/display:\s*inline-flex/);
      expect(body).toMatch(/align-items:\s*center/);
    });
  }

  it('the inputs stay comfortably tappable too', () => {
    // 3.5rem = 56px. Pinned because a later tidy-up that shrinks this would fail silently on a phone.
    const m = /min-height:\s*([\d.]+)rem/.exec(rule('input'));
    expect(m).not.toBeNull();
    expect(Number(m[1]) * 16).toBeGreaterThanOrEqual(44);
  });
});
