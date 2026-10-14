import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { laborHoursFor } from '@/services/pricing/engine';

/**
 * THE HOURS ON SCREEN ARE THE HOURS BILLED.
 *
 * The task list and the task detail panel showed `task.laborHours`. The engine does not read that field
 * — `laborHoursFor` sums `task.processes[].laborHours × quantity` and multiplies the result by the wage
 * (`services/pricing/engine.js`). The two had drifted.
 *
 * Measured read-only against production 2026-10-14, all 34 tasks: **14 showed a figure that was not the
 * one charged.** Seven showed `0` for work billed at 0.1–0.5 h — Reprong, Watch Battery, Break in Shank,
 * Glue Pearl, both Size Ups, Break in chain. Seven showed exactly half: "Set Stone 1ct or larger" read
 * 0.4 h and bills 0.8; "Retip prongs", "Clean and Polish" and "Set Stone less than 0.49ct" each read 0.1
 * and bill 0.2.
 *
 * That matters more than a cosmetic wrong number: this screen is where the shop reasons about what a
 * task costs, and those numbers were being read against a trade price sheet. A task that looks like
 * half an hour of work and bills an hour leads to the wrong conclusion about the price.
 *
 * No price moved. The engine always billed the process hours; only the display was wrong.
 *
 * The shapes below are the real production ones, so a regression is a figure the shop would actually see.
 */

const TASKS_DIR = path.join(process.cwd(), 'src', 'app', 'dashboard', 'admin', 'tasks');

/** Production shapes, 2026-10-14. `laborHours` is what was shown; `processes` is what is billed. */
const REAL = [
  { title: 'Reprong', laborHours: undefined, processes: [{ laborHours: 0.3, quantity: 1 }], billed: 0.3 },
  { title: 'Watch Battery', laborHours: undefined, processes: [{ laborHours: 0.3, quantity: 1 }], billed: 0.3 },
  { title: 'Size Up - 3mm to 5mm shanks', laborHours: undefined, processes: [{ laborHours: 0.5, quantity: 1 }], billed: 0.5 },
  { title: 'Glue Pearl', laborHours: undefined, processes: [{ laborHours: 0.1, quantity: 1 }], billed: 0.1 },
  { title: 'Set Stone 1ct or larger', laborHours: 0.4, processes: [{ laborHours: 0.8, quantity: 1 }], billed: 0.8 },
  { title: 'Retip prongs', laborHours: 0.1, processes: [{ laborHours: 0.2, quantity: 1 }], billed: 0.2 },
  { title: 'Clean and Polish', laborHours: 0.1, processes: [{ laborHours: 0.2, quantity: 1 }], billed: 0.2 },
];

describe('labour hours on the tasks screen', () => {
  it('reports what the engine bills, not the stored field', () => {
    for (const t of REAL) {
      expect(laborHoursFor(t), `${t.title}`).toBeCloseTo(t.billed, 4);
      // And the stored field really is the wrong one to show.
      expect(t.laborHours ?? 0, `${t.title} — the stored field disagrees, which is the whole point`)
        .not.toBeCloseTo(t.billed, 4);
    }
  });

  it('counts a process used more than once', () => {
    expect(laborHoursFor({ processes: [{ laborHours: 0.25, quantity: 4 }] })).toBeCloseTo(1, 4);
    // A missing quantity means one, not zero — otherwise a task silently bills no labour.
    expect(laborHoursFor({ processes: [{ laborHours: 0.3 }] })).toBeCloseTo(0.3, 4);
  });

  it('is zero only when there is genuinely nothing to bill', () => {
    expect(laborHoursFor({})).toBe(0);
    expect(laborHoursFor({ processes: [] })).toBe(0);
    // The stored field must NOT resurrect a figure the engine would not bill.
    expect(laborHoursFor({ laborHours: 5, processes: [] })).toBe(0);
  });

  it('neither screen reads the stored field for hours', () => {
    for (const file of ['page.js', path.join('components', 'TasksGrid.js')]) {
      const src = fs.readFileSync(path.join(TASKS_DIR, file), 'utf8');
      expect(src, `${file} must ask the engine`).toMatch(/laborHoursFor\(/);
      expect(src, `${file} still renders the stored laborHours`).not.toMatch(/\{\s*(?:selectedTask|task)\.laborHours/);
    }
  });
});
