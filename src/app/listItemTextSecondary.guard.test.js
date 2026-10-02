import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (goal step 4): a block element inside MUI's `secondary` slot breaks hydration.
 *
 * What MUI does (ListItemText.js, v6.5): unless `secondary` IS a Typography, it is wrapped in the secondary slot —
 * a Typography that renders a `<p>`. So `secondary={<Chip/>}` puts a `<div>` inside a `<p>`. That is invalid HTML:
 * the browser's parser closes the `<p>` early, the DOM no longer matches the server's markup, and React throws
 * hydration error #418. A production build prints only the error code, which is why it went unidentified; the same
 * page on a `next dev` build names the element.
 *
 * Confirmed 2026-10-01 on /dashboard/pending (a Chip). The repair Move list has the same shape (a Box of body2
 * Typographys = a `<div>` and `<p>`s) but only renders with repair data, so it was latent.
 *
 * The rule here is deliberately strict — any element in `secondary` must declare the slot, via
 * `slotProps={{ secondary: { component: 'div' } }}`. Whether a given child renders a block cannot be judged
 * reliably from the source: `<Typography variant="caption">` is a `<span>` while `variant="body2"` is a `<p>`
 * (Typography.js: `variantMapping[variant] || 'span'`), and `component="span"` overrides both. Code that is already
 * all-spans is exempt below, with the reason, rather than changed for the sake of the rule.
 */
const SRC = path.resolve(__dirname, '..');

/** Already valid: every element in the secondary renders inline. Keyed by path relative to src/. */
const EXEMPT = {
  // Box component="span"; the body2 Typography is component="span"; `caption` has no entry in MUI's
  // defaultVariantMapping, so it falls back to 'span'. Verified on a dev build: the bell renders its
  // notifications with no hydration or DOM-nesting message.
  'components/notifications/NotificationBell.jsx': 'every element in the secondary renders a <span>',
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name) && !/\.test\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** The text of every `<ListItemText ...>` opening tag in `code`, braces balanced. */
function openingTags(code) {
  const tags = [];
  const TAG = '<ListItemText';
  let i = code.indexOf(TAG);
  while (i !== -1) {
    let depth = 0;
    let j = i + TAG.length;
    for (; j < code.length; j += 1) {
      const c = code[j];
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (c === '>' && depth === 0) break;
    }
    tags.push(code.slice(i, j + 1));
    i = code.indexOf(TAG, j);
  }
  return tags;
}

/** The value of `secondary={...}`, braces balanced, or null when it is absent or a plain string. */
function secondaryValue(tag) {
  const at = tag.indexOf('secondary={');
  if (at === -1) return null;
  let depth = 0;
  const start = at + 'secondary='.length;
  for (let j = start; j < tag.length; j += 1) {
    if (tag[j] === '{') depth += 1;
    else if (tag[j] === '}') {
      depth -= 1;
      if (depth === 0) return tag.slice(start + 1, j);
    }
  }
  return tag.slice(start);
}

const rendersAnElement = (value) => /<[A-Za-z]/.test(value);
const overridesComponent = (tag) => /slotProps\s*=\s*\{\{[\s\S]*?secondary\s*:\s*\{[\s\S]*?component\s*:/.test(tag)
  || /secondaryTypographyProps\s*=\s*\{\{[\s\S]*?component\s*:/.test(tag);

const offenders = () => {
  const found = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join('/');
    if (EXEMPT[rel]) continue;
    const code = fs.readFileSync(file, 'utf8');
    if (!code.includes('<ListItemText')) continue;
    for (const tag of openingTags(code)) {
      const value = secondaryValue(tag);
      if (value && rendersAnElement(value) && !overridesComponent(tag)) found.push(rel);
    }
  }
  return found;
};

describe('MUI ListItemText: an element in `secondary` needs a block-legal slot', () => {
  it('every ListItemText whose secondary renders an element says what the slot is', () => {
    expect(offenders()).toEqual([]);
  });

  it('every exemption still has a ListItemText with an element in its secondary', () => {
    // An exemption that no longer applies is a stale rule — delete it rather than carry it.
    for (const rel of Object.keys(EXEMPT)) {
      const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
      const live = openingTags(code).some((tag) => {
        const value = secondaryValue(tag);
        return value && rendersAnElement(value) && !overridesComponent(tag);
      });
      expect(live, `${rel} no longer needs its exemption`).toBe(true);
    }
  });

  it('the scan reads tags the way it claims', () => {
    const bad = '<ListItemText primary="S" secondary={<Chip label="x" />} />';
    const fixed = '<ListItemText primary="S" slotProps={{ secondary: { component: \'div\' } }} secondary={<Chip />} />';
    const text = '<ListItemText primary="S" secondary={user?.name || "N/A"} />';
    const deprecated = '<ListItemText secondaryTypographyProps={{ component: \'div\' }} secondary={<Box />} />';

    expect(openingTags(bad)).toHaveLength(1);
    expect(rendersAnElement(secondaryValue(bad))).toBe(true);
    expect(overridesComponent(bad)).toBe(false);

    expect(overridesComponent(fixed)).toBe(true);
    expect(overridesComponent(deprecated)).toBe(true);
    expect(rendersAnElement(secondaryValue(text))).toBe(false);
    expect(secondaryValue('<ListItemText primary="S" secondary="plain" />')).toBeNull();
  });
});
