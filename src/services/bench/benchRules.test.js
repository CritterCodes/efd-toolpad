import { describe, it, expect } from 'vitest';
import { claimRefusal, sendToQcRefusal, qcPassRefusal, qcPassIsSelfCertified, didTheWork } from './benchRules';

/** EFD-DEFECTS B2 (claim), B3 (send to QC) and B6 (pass QC): the rules every bench entry point applies. */
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

describe('passing QC', () => {
  // B6: the QC tab only checked the qualityControl capability, so a jeweler holding both capabilities
  // could pass their own repair in `separate` mode — the act self-certify mode exists to permit.
  const qc = (over = {}) => ({ repairID: 'repair-1', status: 'QUALITY CONTROL', assignedTo: 'u-me', tasks: [], ...over });

  it('refuses the jeweler who holds the repair, in separate mode', () => {
    const refusal = qcPassRefusal(qc(), { ...me, mode: 'separate' });
    expect(refusal?.code).toBe('FORBIDDEN');
    expect(refusal.message).toMatch(/self-certify/);
  });

  it('refuses anyone a task is signed off to, not just the current holder', () => {
    // A handoff chain means several people did the work; all of them are the author for review.
    const handed = qc({ assignedTo: 'u-other', tasks: [{ completedByUserID: 'u-me' }, { completedByUserID: 'u-other' }] });
    expect(qcPassRefusal(handed, { ...me, mode: 'separate' })?.code).toBe('FORBIDDEN');
  });

  it('lets a jeweler who did none of it pass, which is what separate mode is for', () => {
    const someone = qc({ assignedTo: 'u-other', tasks: [{ completedByUserID: 'u-other' }] });
    expect(qcPassRefusal(someone, { ...me, mode: 'separate' })).toBeNull();
  });

  it('allows it in self-certify mode — that is the whole point of the mode', () => {
    expect(qcPassRefusal(qc(), { ...me, mode: 'self-certify' })).toBeNull();
  });

  it('exempts admins, as every other bench rule does', () => {
    expect(qcPassRefusal(qc({ assignedTo: 'u-admin' }), { ...admin, mode: 'separate' })).toBeNull();
  });

  it('stamps a pass by whoever did the work, whichever button was pressed', () => {
    // Including an admin's own pass, which the refusal above lets through — the stamp is what keeps
    // it auditable when the gate does not apply.
    expect(qcPassIsSelfCertified(qc(), 'u-me')).toBe(true);
    expect(qcPassIsSelfCertified(qc({ tasks: [{ completedByUserID: 'u-me' }], assignedTo: 'u-other' }), 'u-me')).toBe(true);
    expect(qcPassIsSelfCertified(qc({ assignedTo: 'u-other' }), 'u-me')).toBe(false);
  });

  it('treats a missing user or an empty repair as "did not do the work"', () => {
    expect(didTheWork(qc(), undefined)).toBe(false);
    expect(didTheWork({}, 'u-me')).toBe(false);
    expect(didTheWork({ tasks: [null, { completedByUserID: null }] }, 'u-me')).toBe(false);
  });
});
