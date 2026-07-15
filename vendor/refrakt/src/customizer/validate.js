/**
 * REFRAKT — Customizer config-in validation.
 *
 * Validates the admin-authored `customizable` blocks on a meshMap against the real material
 * vocabulary (the single source of truth in core/library — decisions/0001). Lets admin/shop
 * catch a bad customizable config (typo'd finish, gem option on a metal slot, default not in
 * options) before it reaches a customer. Pure aside from the vocab predicates it imports.
 */

import { isFinish, isGemPreset } from '../core/library';
import { optionId } from './selection';

/**
 * @param {object} config - a JewelryViewer config with (optionally) `customizable` slots
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCustomizable(config = {}) {
  const errors = [];
  const meshMap = config.meshMap ?? [];

  for (const s of meshMap) {
    if (!s || !s.customizable) continue;
    const where = `slot "${s.nameContains}"`;
    const c = s.customizable;
    const isGem = s.type === 'gem';

    if (!Array.isArray(c.options) || c.options.length === 0) {
      errors.push(`${where}: customizable.options must be a non-empty array`);
      continue;
    }

    const ids = [];
    c.options.forEach((opt, i) => {
      const id = optionId(opt);
      if (id == null) { errors.push(`${where} option ${i}: missing finish/gemPreset`); return; }
      ids.push(id);
      // option kind must match the slot's material type
      if (isGem && opt.finish != null) errors.push(`${where}: gem slot has a metal (finish) option "${opt.finish}"`);
      if (!isGem && opt.gemPreset != null) errors.push(`${where}: metal slot has a gem option "${opt.gemPreset}"`);
      // id must be real vocab (0001)
      const ok = isGem ? isGemPreset(id) : isFinish(id);
      if (!ok) errors.push(`${where} option "${id}": not a valid ${isGem ? 'gemPreset' : 'finish'}`);
      // display hints are the right type when present
      if (opt.priceDelta != null && typeof opt.priceDelta !== 'number') errors.push(`${where} option "${id}": priceDelta must be a number`);
    });

    if (c.default != null && !ids.includes(c.default)) {
      errors.push(`${where}: default "${c.default}" is not among its options`);
    }
  }

  return { valid: errors.length === 0, errors };
}
