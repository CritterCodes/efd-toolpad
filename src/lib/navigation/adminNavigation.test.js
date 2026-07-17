import { describe, expect, it } from 'vitest';
import { adminNavigation } from './adminNavigation';
import { USER_ROLES } from '../unifiedUserService';

function collectSegments(items) {
  return items.flatMap((item) => {
    if (!item.segment) return [];
    return [item.segment, ...(item.children ? collectSegments(item.children) : [])];
  });
}

describe('admin navigation', () => {
  const nav = adminNavigation[USER_ROLES.ADMIN];

  it('includes the casting board under production', () => {
    const allSegments = collectSegments(nav);
    expect(allSegments).toContain('casting');
  });

  it('nests casting board as a child of the production group', () => {
    const production = nav.find((item) => item.segment === 'dashboard/production');
    expect(production).toBeDefined();
    const childSegments = (production.children ?? []).map((c) => c.segment);
    expect(childSegments).toContain('casting');
  });
});
