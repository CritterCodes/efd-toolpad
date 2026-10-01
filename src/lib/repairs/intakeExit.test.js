import { describe, it, expect } from 'vitest';
import { intakeExitPath, BENCH_PATH, STORE_REPAIRS_PATH } from './intakeExit';

/** Owner, 2026-10-01: leaving the intake went to Ready for Work — "not a page we even use anymore. My bench replaced it." */
describe('intakeExitPath', () => {
  it('sends the shop back to My Bench', () => {
    for (const role of ['admin', 'dev', 'artisan', 'staff']) expect(intakeExitPath({ user: { role } })).toBe(BENCH_PATH);
  });

  it("sends a store to its own repairs (it can't open the bench)", () => {
    expect(intakeExitPath({ user: { role: 'wholesaler' } })).toBe(STORE_REPAIRS_PATH);
  });

  it('never goes to Ready for Work', () => {
    for (const role of ['admin', 'wholesaler', 'artisan', undefined]) expect(intakeExitPath({ user: { role } })).not.toMatch(/ready-for-work/);
  });
});
