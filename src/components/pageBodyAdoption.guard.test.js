import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The frame's spacing is the frame's. A screen does not override it.
 *
 * `PageBody` exists because every screen chose its own padding and vertical rhythm — `p: 3` on one root,
 * `pb: 10` on the next, `mb: 2` here and `mb: 3` there — which is why the gutter and the gap between
 * sections both change as you navigate. The frame owns them now.
 *
 * The way that comes undone is not dramatic: someone converts a screen, the spacing looks a touch tight
 * on their monitor, and they add `sx={{ p: 2 }}` to the `<PageBody>` itself. That screen is now indented
 * three times — `RoleAwareLayout`'s gutter, plus its own — and the next person converting a screen copies
 * it, because it is right there in a converted file and looks deliberate.
 *
 * So the rule is simply: **`<PageBody>` takes no `sx`.** It has `width` and `gutter` props for the two
 * variations that are legitimate (a wide table; a surface outside the dashboard shell with no wrapper of
 * its own). Anything else is a screen taking back what the frame just centralised.
 *
 * Deliberately a text check, not a render. A render needs a session, a database and a browser, and none
 * of those are available here (docs/FRICTION-LOG.md, 2026-10-14). An earlier version of this file tried
 * to walk the JSX and flag margins on direct children; it reported `my-bench` for a margin that is inside
 * `<PageHeader>`, because a regex cannot tell a child from JSX passed in a prop. A guard that cries wolf
 * gets suppressed, so it was replaced with this one, which cannot be wrong about what it checks.
 */

const SRC = path.join(process.cwd(), 'src');

function sources() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx)$/.test(e.name) || /\.test\.|\.guard\./.test(e.name)) continue;
      out.push({ file: path.relative(process.cwd(), p).replace(/\\/g, '/'), src: fs.readFileSync(p, 'utf8') });
    }
  })(SRC);
  return out;
}

const adopters = () => sources().filter(({ src }) => /<PageBody[\s>]/.test(src));

describe('screens on the page frame', () => {
  it('finds the adopters at all', () => {
    expect(adopters().length, 'nothing renders <PageBody> — did the kit move?').toBeGreaterThan(0);
  });

  it('never gives <PageBody> an sx', () => {
    const offenders = [];
    for (const { file, src } of adopters()) {
      // The opening tag only — a nested element's sx is its own business.
      for (const m of src.matchAll(/<PageBody\b([^>]*)>/g)) {
        if (/\bsx\s*=/.test(m[1])) offenders.push(`${file}: <PageBody${m[1].replace(/\s+/g, ' ')}>`);
      }
    }
    expect(
      offenders,
      'A screen is overriding the frame it just adopted. Use the `width` or `gutter` props, or change the '
      + 'frame for everyone — do not re-add spacing per screen:\n  ' + offenders.join('\n  '),
    ).toEqual([]);
  });

  it('does not leave a second gutter on the element that wraps it', () => {
    // `RoleAwareLayout` already supplies the dashboard gutter and `PageBody` adds none by default, so a
    // screen that still wraps its frame in a padded Box is indented twice — the exact thing conversion
    // was meant to remove, surviving one level up where a diff makes it easy to miss.
    const offenders = [];
    for (const { file, src } of adopters()) {
      const at = src.search(/<PageBody[\s>]/);
      const before = src.slice(Math.max(0, at - 400), at);
      const wrapper = /<Box\s[^>]*sx=\{\{[^}]*\bp[xltrb]?:\s*[0-9]/.exec(before);
      if (wrapper) offenders.push(`${file}: ${wrapper[0].slice(0, 80).replace(/\s+/g, ' ')}…`);
    }
    expect(
      offenders,
      'A padded wrapper still sits immediately around <PageBody>, so the screen is indented twice:\n  '
      + offenders.join('\n  '),
    ).toEqual([]);
  });
});
