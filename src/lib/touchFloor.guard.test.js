import { describe, it, expect } from 'vitest';
import theme from './theme';

/**
 * GUARD: every control a finger lands on is at least 44px where there is no mouse.
 *
 * The bench is used with gloved hands, often one-handed, with a ring in the other. MUI's own floors are
 * **40px** for a contained button and **34px** for `size="small"` — so a default button measured 42.5px on
 * `/emergency-logout` and a small one 35px, both under the floor this app holds itself to. The gap had gone
 * unnoticed for the same reason it is easy to miss everywhere: on a desktop with a mouse nothing is wrong.
 *
 * The floor is raised under `pointer: coarse` rather than globally, so a mouse-driven screen keeps its
 * density. That is the same shape `facelift.module.css` already uses for `.railTab`.
 *
 * This reads the theme object rather than a rendered page, because the question is whether the *rule*
 * exists — a render can only ever answer it for the one control it rendered.
 */
const TAP = 44;
const COARSE = '@media (pointer: coarse)';

/** The style object MUI will apply for `component`'s `slot`. */
function slot(component, name) {
  const overrides = theme.components?.[component]?.styleOverrides;
  expect(overrides, `${component} has styleOverrides`).toBeTruthy();
  const style = overrides[name];
  expect(style, `${component}.${name} is themed`).toBeTruthy();
  return style;
}

/** The coarse-pointer block inside a slot, or a slot that *is* one. */
function coarseRules(component, name) {
  const style = slot(component, name);
  const rules = style[COARSE];
  expect(rules, `${component}.${name} raises its floor under "${COARSE}"`).toBeTruthy();
  return rules;
}

describe('the touch floor', () => {
  it.each([
    ['MuiButton', 'root'],
    ['MuiButton', 'sizeSmall'],
    ['MuiIconButton', 'root'],
    ['MuiIconButton', 'sizeSmall'],
    ['MuiMenuItem', 'root'],
  ])('%s.%s is at least 44px on a coarse pointer', (component, name) => {
    const rules = coarseRules(component, name);
    expect(rules.minHeight ?? rules.height).toBeGreaterThanOrEqual(TAP);
  });

  it('an icon button is square, because it is aimed at in both directions', () => {
    for (const name of ['root', 'sizeSmall']) {
      const rules = coarseRules('MuiIconButton', name);
      expect(rules.minWidth, `MuiIconButton.${name} width`).toBeGreaterThanOrEqual(TAP);
    }
  });

  it('a chip gets the floor only when it does something', () => {
    // A status chip is read, not tapped; inflating it would wreck a row of them.
    expect(coarseRules('MuiChip', 'clickable').height).toBeGreaterThanOrEqual(TAP);
    expect(slot('MuiChip', 'root')[COARSE], 'a plain chip keeps its height').toBeUndefined();
  });

  it('a row in an autocomplete list is a row like any other', () => {
    const option = theme.components.MuiAutocomplete.styleOverrides.listbox['& .MuiAutocomplete-option'];
    expect(option[COARSE]?.minHeight).toBeGreaterThanOrEqual(TAP);
  });

  it('leaves the mouse alone', () => {
    // The point of the media query: raising these globally would inflate every dense desktop toolbar.
    expect(slot('MuiButton', 'root').minHeight).toBeLessThan(TAP);
    expect(slot('MuiButton', 'sizeSmall').minHeight).toBeLessThan(TAP);
  });

  it('a tab was already tall enough and is left as it is', () => {
    expect(slot('MuiTab', 'root').minHeight).toBeGreaterThanOrEqual(TAP);
  });
});
