import { describe, expect, it } from 'vitest';
import { allCollaboratorsSigned } from '@/services/production/productionRun';

describe('allCollaboratorsSigned (pure — §4e dual-signature gate)', () => {
  it('a solo run (no collaborators) is always satisfied', () => {
    expect(allCollaboratorsSigned({ collaborators: [], createdBy: 'u1', signatures: [] })).toBe(true);
    expect(allCollaboratorsSigned({ createdBy: 'u1' })).toBe(true);
  });

  it('requires EVERY collaborator AND the creator to have signed', () => {
    const run = { createdBy: 'u1', collaborators: ['u2', 'u3'] };
    expect(allCollaboratorsSigned({ ...run, signatures: [{ userID: 'u1' }, { userID: 'u2' }] })).toBe(false);   // u3 missing
    expect(allCollaboratorsSigned({ ...run, signatures: [{ userID: 'u2' }, { userID: 'u3' }] })).toBe(false);   // creator missing
    expect(allCollaboratorsSigned({ ...run, signatures: [{ userID: 'u1' }, { userID: 'u2' }, { userID: 'u3' }] })).toBe(true);
  });

  it('extra/duplicate signatures do not break it', () => {
    const run = { createdBy: 'u1', collaborators: ['u2'] };
    expect(allCollaboratorsSigned({ ...run, signatures: [{ userID: 'u1' }, { userID: 'u1' }, { userID: 'u2' }, { userID: 'u9' }] })).toBe(true);
  });
});
