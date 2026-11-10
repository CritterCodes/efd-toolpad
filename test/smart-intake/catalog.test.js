/**
 * The rulings find their tasks by TITLE (until tasks carry a role — docs/goals/SMART_INTAKE.md, C1). This fails when
 * the committed catalog stops resolving, so a renamed task shows up here instead of silently changing a price.
 * Refresh the catalog with `node scripts/intake/export-logs.mjs`.
 */
import { describe, it, expect } from 'vitest';
import { taskRoles, narrowSiblingOf } from '@/services/ai/smartIntakeRules';
import { metalCounterpartFor, jobOf } from '@/services/repairs/metalTaskFilter';
import { loadFixtures, expectedFor } from './replay.js';

const { catalog, marks, intakes } = loadFixtures();
const titled = (title) => catalog.find((t) => t.title === title);

describe('the live catalog still answers the rulings', () => {
  it('each ruling resolves to exactly one task', () => {
    const roles = taskRoles(catalog);
    expect(roles.problems).toEqual([]);
    expect(roles.rhodium.title).toBe('Rhodium Plating');
    expect(roles.sizeDown.title).toBe('Size Down');
    expect(roles.sizeUp.title).toBe('Size up (1 size) - up to 3mm x 2 mm shank');
    expect(roles.solderTogether.title).toBe('Solder Together per Ring');
  });

  it('every 3-to-5mm task has exactly one up-to-3mm sibling', () => {
    const wide = catalog.filter((t) => /3\s*(?:mm)?\s*to\s*5\s*mm/i.test(t.title));
    expect(wide.length).toBeGreaterThan(0);
    for (const task of wide) expect(narrowSiblingOf(task, catalog), task.title).not.toBeNull();
    expect(narrowSiblingOf(titled('Size Up  - 3mm to 5mm shanks'), catalog).title).toBe('Size up (1 size) - up to 3mm x 2 mm shank');
    expect(narrowSiblingOf(titled('Half-Shank — 3 to 5mm'), catalog).title).toBe('Half-Shank — up to 3mm');
  });

  it('a platinum job swaps each generic task for the SAME job in platinum — never a different one', () => {
    const pt = (title) => metalCounterpartFor(titled(title), 'platinum', catalog)?.title || null;
    // The bug: word overlap sent a platinum size-up to the Half-Shank (review, 2026-11-09).
    expect(pt('Size up (1 size) - up to 3mm x 2 mm shank')).toBe('Size Up (1 size) — Platinum (laser welded)');
    expect(pt('Size Up  - 3mm to 5mm shanks')).toBe('Size Up (1 size) — Platinum (laser welded)');
    expect(pt('Size Down')).toBe('Size Down — Platinum (laser welded)');
    expect(pt('Half-Shank — up to 3mm')).toBe('Half-Shank — Platinum, up to 3mm (laser welded)');
    expect(pt('Half-Shank — 3 to 5mm')).toBe('Half-Shank — Platinum, 3 to 5mm (laser welded)');
    // No platinum version of the job: stays as it is.
    for (const title of ['Add 18gu Jump Ring w/ laser — 5mm and smaller', 'Rhodium Plating', 'Laser Weld', 'Clean and Polish']) {
      expect(pt(title), title).toBeNull();
    }
    expect(jobOf('Size up (1 size) - up to 3mm x 2 mm shank')).toBe('size up');
    expect(jobOf('Half-Shank — Platinum, up to 3mm (laser welded)')).toBe('half shank');
  });

  it('every mark names tasks the catalog has', () => {
    for (const intake of intakes) expect(() => expectedFor(intake, marks, catalog)).not.toThrow();
  });
});
