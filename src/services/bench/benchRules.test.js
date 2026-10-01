import { describe, it, expect } from 'vitest';
import { claimRefusal, sendToQcRefusal } from './benchRules';

/** EFD-DEFECTS B2 (claim) and B3 (send to QC): the rules every bench entry point applies. */
const me = { userID: 'u-me', isAdmin: false };
const admin = { userID: 'u-admin', isAdmin: true };
const r = (status, assignedTo = null) => ({ repairID: 'repair-1', status, assignedTo, assignedJeweler: assignedTo ? 'Bea' : null });

describe('claiming', () => {
  it('lets anyone claim an unclaimed READY FOR WORK job, and re-claiming your own is a no-op', () => {
    expect(claimRefusal(r('READY FOR WORK'), me)).toBeNull();
    expect(claimRefusal(r('IN PROGRESS', 'u-me'), me)).toBeNull();
    expect(claimRefusal(r('IN PROGRESS'), me)).toBeNull(); // in progress, held by nobody
  });

  it("never pulls a job back from QC, completed or receiving — not even for an admin", () => {
    for (const status of ['QC', 'COMPLETED', 'RECEIVING', 'READY FOR PICKUP', 'PICKUP REQUESTED']) {
      expect(claimRefusal(r(status), me)?.code).toBe('CONFLICT');
      expect(claimRefusal(r(status), admin)?.code).toBe('CONFLICT');
    }
  });

  it("someone else's job is a takeover: admins only", () => {
    expect(claimRefusal(r('IN PROGRESS', 'u-other'), me)?.code).toBe('FORBIDDEN');
    expect(claimRefusal(r('READY FOR WORK', 'u-other'), me)?.code).toBe('FORBIDDEN');
    expect(claimRefusal(r('IN PROGRESS', 'u-other'), admin)).toBeNull();
  });
});

describe('sending to QC', () => {
  it('the holder sends their bench job', () => {
    expect(sendToQcRefusal(r('IN PROGRESS', 'u-me'), me)).toBeNull();
  });

  it("a non-admin can't send an unclaimed job (it would credit them) or someone else's", () => {
    expect(sendToQcRefusal(r('READY FOR WORK'), me)?.code).toBe('FORBIDDEN');
    expect(sendToQcRefusal(r('IN PROGRESS', 'u-other'), me)?.code).toBe('FORBIDDEN');
  });

  it('an admin may send on a jeweler\'s behalf, or their own unclaimed work', () => {
    expect(sendToQcRefusal(r('IN PROGRESS', 'u-other'), admin)).toBeNull();
    expect(sendToQcRefusal(r('READY FOR WORK'), admin)).toBeNull();
  });

  it('only bench work goes to QC', () => {
    expect(sendToQcRefusal(r('QC', 'u-me'), me)?.code).toBe('CONFLICT');
    expect(sendToQcRefusal(r('COMPLETED', 'u-me'), admin)?.code).toBe('CONFLICT');
  });
});
