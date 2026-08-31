import { describe, it, expect } from 'vitest';
import { REPAIR_STATUS, normalizeRepairStatus, STATUS_SURFACE_MATRIX } from '@/services/repairWorkflow';

/**
 * Every canonical status must survive its own normalizer. This exists because
 * SHIPPED TO SHOP was added to STATUS_VARIANTS but not STATUS_ALIAS_MAP — two
 * hand-maintained maps that must agree — so `normalizeRepairStatus` returned null
 * for a status the system itself writes, and the wholesale status filter 400'd
 * on it in production. A round-trip sweep makes the next such split a test
 * failure instead of a live error.
 */
describe('repair status vocabulary is self-consistent', () => {
  it('normalizeRepairStatus round-trips every canonical status', () => {
    for (const status of Object.values(REPAIR_STATUS)) {
      expect(normalizeRepairStatus(status), `alias map is missing ${status}`).toBe(status);
    }
  });

  it('every canonical status has a surface-matrix entry', () => {
    for (const status of Object.values(REPAIR_STATUS)) {
      expect(STATUS_SURFACE_MATRIX[status], `surface matrix is missing ${status}`).toBeDefined();
    }
  });
});
