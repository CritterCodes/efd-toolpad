import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: the theme is mounted whether or not someone is signed in.
 *
 * `RootLayout` returns early when there is no session, so that the custom `/auth/*` pages render without the
 * dashboard's providers. Until 2026-10-02 that early return rendered `{children}` bare — and the MUI theme
 * is mounted by `RoleAwareNavigationProvider`, which only the signed-in branch rendered.
 *
 * It went unnoticed because the pages people see most while signed out — sign in, forgot password, reset —
 * are built on `AuthShell`, hand-written CSS Modules carrying their own black ground. The two signed-out
 * pages made of plain MUI showed it plainly: `/auth/change-password`, which a person is *required* to pass
 * through, was an all-white card with a blue button, and `/emergency-logout` put 50%-white kit labels on a
 * pale blue Alert at about 1.1:1. Both are pages you reach when something has already gone wrong, which is
 * the worst moment to be handed a screen that looks like a different product.
 *
 * So: both branches mount the provider, and a page is never asked which one it is under.
 */
const LAYOUT = path.resolve(__dirname, 'layout.js');

describe('the root layout', () => {
  const source = fs.readFileSync(LAYOUT, 'utf8');

  it('mounts the theme provider on every branch that returns markup', () => {
    const returns = source.split(/return \(/).slice(1);
    expect(returns.length, 'RootLayout still returns more than one tree').toBeGreaterThan(1);

    for (const branch of returns) {
      const tree = branch.slice(0, branch.indexOf('</html>'));
      expect(tree, `a <html> branch without the theme:\n${tree.slice(0, 200)}`).toMatch(
        /<RoleAwareNavigationProvider>/,
      );
    }
  });

  it('mounts it inside <body>, so CssBaseline can set the ground', () => {
    expect(source).toMatch(/<body>\s*<RoleAwareNavigationProvider>/);
  });

  it('is the only thing that decides this — no page mounts its own', () => {
    // A page reaching for the provider itself would mean the layout is not trusted to do it.
    const app = path.resolve(__dirname);
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
          walk(full);
        } else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name) && full !== LAYOUT) {
          if (/RoleAwareNavigationProvider|from '@\/components\/ThemeProvider'/.test(fs.readFileSync(full, 'utf8'))) {
            offenders.push(path.relative(app, full).replace(/\\/g, '/'));
          }
        }
      }
    };
    walk(app);
    expect(offenders, `mounts the theme themselves:\n  ${offenders.join('\n  ')}`).toHaveLength(0);
  });
});
