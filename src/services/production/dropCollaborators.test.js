import { describe, expect, it } from 'vitest';
import { applyCollaboratorChange } from '@/services/production/dropCollaborators';

describe('applyCollaboratorChange (pure)', () => {
  it('adds a collaborator', () => {
    expect(applyCollaboratorChange(['a'], { add: 'b' })).toEqual(['a', 'b']);
  });
  it('add is idempotent (no duplicates)', () => {
    expect(applyCollaboratorChange(['a', 'b'], { add: 'b' })).toEqual(['a', 'b']);
  });
  it('never adds the owner as their own collaborator', () => {
    expect(applyCollaboratorChange(['a'], { add: 'owner', ownerId: 'owner' })).toEqual(['a']);
  });
  it('removes a collaborator', () => {
    expect(applyCollaboratorChange(['a', 'b', 'c'], { remove: 'b' })).toEqual(['a', 'c']);
  });
  it('remove of an absent id is a no-op', () => {
    expect(applyCollaboratorChange(['a'], { remove: 'z' })).toEqual(['a']);
  });
  it('dedupes and drops falsy existing ids', () => {
    expect(applyCollaboratorChange(['a', 'a', '', null, 'b'], {})).toEqual(['a', 'b']);
  });
  it('handles an empty/missing list', () => {
    expect(applyCollaboratorChange(undefined, { add: 'a' })).toEqual(['a']);
    expect(applyCollaboratorChange([], {})).toEqual([]);
  });
});
