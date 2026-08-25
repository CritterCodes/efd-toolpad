/**
 * Customizer authoring: cost-binding model (M3-T2 / decision 0005 §6).
 *
 * refrakt 1.9.0 keeps the `customizable` block **on each meshMap slot** (verified in
 * `@crittercodes/refrakt/src/customizer/selection.js`): a slot is customizable when it carries
 *   `slot.customizable = { label?, options: [{ finish } | { gemPreset }], default? }`
 * and its identity (the join key across `selections[]` + `resolvedMeshMap`) is `slot.nameContains`.
 * Option vocab is visual-only (`finish`/`gemPreset`) — refrakt never prices.
 *
 * Admin's A2 authoring layers a cost `binding` on each option, admin-side + additive (0001):
 *   metal option → `{ metalKey }`                       (feeds the design-estimate metal cost)
 *   gem   option → `{ gemstoneId }` | `{ materialRef, carat }`   (resolved gem price)
 * Persisted on `design.viewer.meshMap` (refrakt-native shape). The live-pricing endpoint (0005 §6)
 * joins each `resolvedMeshMap` entry → the design meshMap slot by `nameContains`, and for a
 * customizable slot resolves the customer's chosen option → its binding (422 if unbound).
 *
 * Pure (no DB) → unit-testable + shared by the authoring route (normalize/merge) and the endpoint.
 */

const chosenKey = (type) => (type === 'gem' ? 'gemPreset' : 'metal' === type ? 'finish' : null);
const slotChosenKey = (slot) => (slot?.type === 'gem' ? 'gemPreset' : 'finish');

/** True if an option carries a usable cost binding for its slot type. */
export function hasBinding(type, option = {}) {
  const b = option?.binding;
  if (!b || typeof b !== 'object') return false;
  if (type === 'gem') return Boolean(b.gemstoneId || (b.materialRef && Number(b.carat) > 0));
  return Boolean(b.metalKey);
}

/** The customizable slots on a meshMap, normalized (id = nameContains; keeps options + bindings). */
export function customizableSlots(meshMap = []) {
  return (Array.isArray(meshMap) ? meshMap : [])
    .filter((s) => s && s.customizable && s.nameContains && (s.type === 'metal' || s.type === 'gem'))
    .map((s) => {
      const key = slotChosenKey(s);
      const options = (Array.isArray(s.customizable.options) ? s.customizable.options : [])
        .filter((o) => o && typeof o[key] === 'string')
        .map((o) => ({ [key]: o[key], ...(o.binding ? { binding: o.binding } : {}) }));
      return {
        nameContains: s.nameContains,
        type: s.type,
        label: s.customizable.label ?? s.nameContains,
        options,
        default: s.customizable.default ?? null,
      };
    });
}

/** The authored customizable spec for a slot (by nameContains), or null (fixed/absent). */
export function slotSpec(meshMap = [], nameContains) {
  return customizableSlots(meshMap).find((s) => s.nameContains === nameContains) || null;
}

/**
 * Cost binding for a chosen option on a customizable slot, or null when the slot isn't
 * customizable OR its chosen option has no binding. Caller policy: null on a *customizable* slot
 * ⇒ 422 (0005 §10); a fixed slot returns null and is priced by the route's fallback.
 */
export function bindingFor(meshMap = [], nameContains, chosenValue) {
  const spec = slotSpec(meshMap, nameContains);
  if (!spec) return null;
  const key = slotChosenKey(spec);
  const opt = spec.options.find((o) => o[key] === chosenValue);
  return hasBinding(spec.type, opt) ? opt.binding : null;
}

/** Customizable slot ids (nameContains) with no options or any option missing a binding. */
export function unboundSlots(meshMap = []) {
  return customizableSlots(meshMap)
    .filter((s) => s.options.length === 0 || s.options.some((o) => !hasBinding(s.type, o)))
    .map((s) => s.nameContains);
}

/**
 * Resolve a design meshMap's bindings against a customer's `resolvedMeshMap` (0005 §6). Joins by
 * `nameContains`. For each CUSTOMIZABLE slot, reads the chosen finish/gemPreset from the resolved
 * entry and pulls its binding. Returns the per-slot resolution + any unbound customizable slots
 * (→ endpoint 422). Fixed slots are ignored here (the route's fallback prices them).
 * @returns {{ metalKeyByFinish: Object, gemBindingByPreset: Object, unbound: string[] }}
 */
export function resolveSelectionBindings(meshMap = [], resolvedMeshMap = []) {
  const specs = new Map(customizableSlots(meshMap).map((s) => [s.nameContains, s]));
  const metalKeyByFinish = {};
  const gemBindingByPreset = {};
  const unbound = [];

  for (const entry of (Array.isArray(resolvedMeshMap) ? resolvedMeshMap : [])) {
    const spec = entry && specs.get(entry.nameContains);
    if (!spec) continue; // fixed / non-customizable slot → route fallback prices it
    const chosen = spec.type === 'gem' ? entry.gemPreset : entry.finish;
    const binding = bindingFor(meshMap, spec.nameContains, chosen);
    if (!binding) { unbound.push(spec.nameContains); continue; }
    if (spec.type === 'gem') gemBindingByPreset[chosen] = binding;
    else metalKeyByFinish[chosen] = binding.metalKey;
  }
  return { metalKeyByFinish, gemBindingByPreset, unbound };
}

/**
 * Merge admin cost bindings onto a customizable meshMap (authoring save). `bindings` is keyed
 * `{ [nameContains]: { [optionValue]: bindingObj } }`; returns a NEW meshMap (no mutation).
 */
export function annotateBindings(meshMap = [], bindings = {}) {
  return (Array.isArray(meshMap) ? meshMap : []).map((s) => {
    if (!s || !s.customizable || !bindings[s.nameContains]) return s;
    const key = slotChosenKey(s);
    const byOption = bindings[s.nameContains];
    const options = (s.customizable.options || []).map((o) => {
      const b = byOption[o[key]];
      return b ? { ...o, binding: b } : o;
    });
    return { ...s, customizable: { ...s.customizable, options } };
  });
}

/**
 * Non-destructive base-meshMap merge (M3-T1 save; PM ruling #169, refrakt gotcha #170).
 *
 * The base material-tagging surface (`Studio`, M3-T1) and the Customizer-options surface
 * (`ConfiguratorSetup`, M3-T2) own DIFFERENT fields of the same `design.viewer.meshMap`. A base
 * re-tag must NOT clobber the ConfiguratorSetup-authored fields, which are ABSENT from Studio's
 * output: the per-slot `customizable` block AND `volumeCm3` (1.10.1). Dropping `volumeCm3` on a
 * re-save would silently zero metal pricing (same failure class as the unit trap), so BOTH are
 * carried forward, joined by `nameContains`.
 *
 * @param {object[]} base  - the fresh Studio base output (authoritative for base material fields)
 * @param {object[]} prior - the existing `design.viewer.meshMap` (source of customizable + volumeCm3)
 * @returns {object[]} a NEW meshMap (no mutation).
 *
 * NOTE: if a base re-tag actually changes a slot's geometry/mesh, its `volumeCm3` must be RE-MEASURED
 * via the authoring screen (ConfiguratorSetup), not carried — this merge assumes a pure material re-tag.
 */
export function mergeBaseMeshMap(base = [], prior = []) {
  const priorByName = new Map(
    (Array.isArray(prior) ? prior : []).filter((s) => s && s.nameContains).map((s) => [s.nameContains, s]),
  );
  return (Array.isArray(base) ? base : []).map((s) => {
    const p = s && priorByName.get(s.nameContains);
    if (!p) return s;
    return {
      ...s,
      ...(p.customizable ? { customizable: p.customizable } : {}),
      ...(p.volumeCm3 != null ? { volumeCm3: p.volumeCm3 } : {}),
    };
  });
}

export { chosenKey };
