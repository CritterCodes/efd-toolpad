import { describe, expect, it } from 'vitest';
import { cadRequestPlan } from '@/services/production/designCad';

describe('cadRequestPlan (pure)', () => {
  it('solo request self-assigns and goes straight to in-progress', () => {
    expect(cadRequestPlan({ solo: true, createdBy: 'u1' })).toEqual({
      assignedToUserID: 'u1', woStatus: 'IN PROGRESS', designStatus: 'cad_in_progress', claimed: true,
    });
  });
  it('non-solo request queues the WO and marks the design cad_requested', () => {
    expect(cadRequestPlan({ solo: false, createdBy: 'u1' })).toEqual({
      assignedToUserID: null, woStatus: 'READY FOR WORK', designStatus: 'cad_requested', claimed: false,
    });
  });
  it('solo with no creator falls back to the queued plan (cannot self-assign to nobody)', () => {
    expect(cadRequestPlan({ solo: true, createdBy: null })).toEqual({
      assignedToUserID: null, woStatus: 'READY FOR WORK', designStatus: 'cad_requested', claimed: false,
    });
  });
});
