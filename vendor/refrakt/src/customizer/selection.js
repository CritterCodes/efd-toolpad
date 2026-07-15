/**
 * REFRAKT — Customizer selection helpers (the data layer of the Customizer surface).
 *
 * Pure, dependency-free, React-free. Implements the config-in / selection-out shapes
 * agreed in the team contract decisions/0002:
 *   - config-in:  an additive `customizable` block on a meshMap slot (reuses the existing
 *                 material vocabulary — each option is `{ finish }` or `{ gemPreset }`).
 *   - selection-out: the `RefraktSelection` payload the <Customizer> emits when a customer
 *                 configures a piece, designed so a host (efd-shop) can persist it cleanly.
 *
 * The <Customizer> React component (added with the owner's design) is a thin UI over these.
 * Keeping the data layer separate means shop can build/persist selections without the UI,
 * and both stay governed by decisions/0001 (additive → minor bump).
 */

// An option is `{ finish }` (metal) or `{ gemPreset }` (gem); its id is that value. It MAY also
// carry admin-emitted display hints `priceDelta` (number, additive) and `availability` (string) —
// passed through untouched; refrakt renders/echoes them but never computes price (decisions/0002).
export const optionId = (opt) => (opt && (opt.finish ?? opt.gemPreset)) ?? null;

/**
 * The slots a customer may customize, derived from `config.meshMap`.
 * A slot is customizable when it carries a `customizable` block with ≥1 valid option.
 *
 * @param {object} config - a JewelryViewer config (`{ meshMap: [...] }`)
 * @returns {Array<{ slot:string, label:string, type:'metal'|'gem', options:object[], default:string }>}
 */
export function readCustomizableSlots(config = {}) {
  const meshMap = config.meshMap ?? [];
  const out = [];
  for (const s of meshMap) {
    if (!s || !s.customizable) continue;
    const options = (s.customizable.options ?? []).filter((o) => optionId(o) != null);
    if (!options.length) continue;
    const base = s.type === 'gem' ? s.gemPreset : s.finish;
    out.push({
      slot: s.nameContains,
      label: s.customizable.label ?? s.nameContains,
      type: s.type === 'gem' ? 'gem' : 'metal',
      options,
      default: s.customizable.default ?? base ?? optionId(options[0]),
    });
  }
  return out;
}

/**
 * Apply a customer's choices onto a base meshMap, returning a NEW meshMap (no mutation).
 * @param {object[]} meshMap
 * @param {Object<string,string>} choices - `{ [slot nameContains]: optionId }`
 */
export function applyChoicesToMeshMap(meshMap = [], choices = {}) {
  return meshMap.map((s) => {
    if (!s || !Object.prototype.hasOwnProperty.call(choices, s.nameContains)) return s;
    const id = choices[s.nameContains];
    if (id == null) return s;
    return s.type === 'gem' ? { ...s, gemPreset: id } : { ...s, finish: id };
  });
}

/**
 * Match a mesh name against a slot's `nameContains`/`match` rule (mirrors the engine's
 * meshMap matcher). Used to map a live per-mesh material back onto its admin slot.
 * @param {string} name  - the GLB mesh name
 * @param {object} slot  - a meshMap slot (`{ nameContains, match }`)
 */
export function meshMatchesSlot(name, slot) {
  if (!slot || !slot.nameContains) return false;
  const nl = (name || '').toLowerCase();
  const key = slot.nameContains.toLowerCase();
  if (!key) return false;
  return slot.match === 'exact' ? nl === key : nl.includes(key);
}

/**
 * Build the LIVE selection-out payload for the customize surface (decisions/0002 v2).
 *
 * The Customizer (Studio-lite) tracks the customer's picks as a live per-mesh resolution
 * (`{ [meshName]: { role:'gem'|'metal', gemPreset|finish, ...over } }`). This reduces that
 * back onto the admin-authored config-in (`baseConfig.meshMap`, which carries the
 * `customizable` slots) and emits a `RefraktSelection`:
 *   - `selections[]` — one entry per CUSTOMIZABLE slot, with the customer's current choice
 *     (read from the first mesh that matches the slot). Only customizable slots appear.
 *   - `resolvedMeshMap` — the admin meshMap with each customizable slot's `finish`/`gemPreset`
 *     updated to the chosen value (a lean, re-renderable snapshot the host persists).
 *
 * Pure / React-free. The `resolved` map is the Studio's derived engine `assign`.
 *
 * @param {object}  args
 * @param {object}  args.baseConfig - admin-authored JewelryViewer config (meshMap w/ `customizable`)
 * @param {Object<string,{role:string,gemPreset?:string,finish?:string}>} args.resolved - live per-mesh assign
 * @param {string} [args.scene]     - chosen RENDER_SCENES id (if render is offered)
 * @param {string} [args.glbUrl]    - override glbUrl (else baseConfig.glbUrl)
 * @returns {{ glbUrl, baseProductId, selections, scene?, resolvedMeshMap }}
 */
export function buildSelectionFromCustomize({ baseConfig = {}, resolved = {}, scene, glbUrl } = {}) {
  const meshMap = baseConfig.meshMap ?? [];
  const selections = [];
  const resolvedMeshMap = meshMap.map((slot) => {
    if (!slot || !slot.customizable) return slot;
    // The current choice = the resolved material of the first mesh matching this slot.
    const meshName = Object.keys(resolved).find((n) => meshMatchesSlot(n, slot));
    const live = meshName ? resolved[meshName] : null;
    const isGem = slot.type === 'gem';
    const chosen = live
      ? (isGem ? live.gemPreset : live.finish)
      : (slot.customizable.default ?? (isGem ? slot.gemPreset : slot.finish));
    if (chosen != null) {
      const key = isGem ? 'gemPreset' : 'finish';
      selections.push({ slot: slot.nameContains, choice: { [key]: chosen } });
      return { ...slot, [key]: chosen };
    }
    return slot;
  });
  return {
    glbUrl: glbUrl ?? baseConfig.glbUrl,
    baseProductId: baseConfig.productId ?? baseConfig.baseProductId,
    selections,
    ...(scene ? { scene } : {}),
    resolvedMeshMap,
  };
}

/**
 * Build the selection-out payload (decisions/0002 `RefraktSelection`).
 *
 * @param {object}  args
 * @param {object}  args.config  - the base (admin-authored) JewelryViewer config
 * @param {Object<string,string>} args.choices - `{ [slot]: optionId }`
 * @param {string} [args.scene]  - chosen RENDER_SCENES id (if render is offered)
 * @returns {{ glbUrl, baseProductId, selections, scene?, resolvedMeshMap }}
 */
export function buildRefraktSelection({ config = {}, choices = {}, scene } = {}) {
  const meshMap = config.meshMap ?? [];
  const selections = Object.entries(choices)
    .filter(([, id]) => id != null)
    .map(([slot, id]) => {
      const s = meshMap.find((m) => m && m.nameContains === slot);
      const key = s && s.type === 'gem' ? 'gemPreset' : 'finish';
      return { slot, choice: { [key]: id } };
    });
  return {
    glbUrl: config.glbUrl,
    baseProductId: config.productId ?? config.baseProductId,
    selections,
    ...(scene ? { scene } : {}),
    resolvedMeshMap: applyChoicesToMeshMap(meshMap, choices),
  };
}
