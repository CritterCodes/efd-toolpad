import { describe, it, expect, vi } from 'vitest';

vi.mock('@/api-clients/wholesaleLeads.client', () => ({ wholesaleLeadsClient: {} }));
const { leadActions } = await import('./leadActions');

/** The wholesale acquisition selection actions, testable outside the page. */
function setup(over = {}) {
  let selected = over.selectedLeadIds || [];
  const setSelectedLeadIds = vi.fn((next) => { selected = typeof next === 'function' ? next(selected) : next; });
  const actions = leadActions({
    activeLeadIds: ['a', 'b', 'c'], allVisibleSelected: false, visibleSelectableIds: ['a', 'b'],
    setSelectedLeadIds, setSnackbar: vi.fn(), selectedLeadIds: selected, ...over,
  });
  return { actions, selected: () => selected };
}

describe('leadActions selection', () => {
  it('toggles one lead on and off', () => {
    const { actions, selected } = setup({ selectedLeadIds: ['a'] });
    actions.handleToggleLeadSelection('b');
    expect(selected()).toEqual(['a', 'b']);
    actions.handleToggleLeadSelection('a');
    expect(selected()).toEqual(['b']);
  });

  it('selects every visible lead without duplicates, or clears them when all are selected', () => {
    const some = setup({ selectedLeadIds: ['a', 'z'] });
    some.actions.handleToggleVisibleSelection();
    expect(some.selected()).toEqual(['a', 'z', 'b']);

    const all = setup({ selectedLeadIds: ['a', 'b', 'z'], allVisibleSelected: true });
    all.actions.handleToggleVisibleSelection();
    expect(all.selected()).toEqual(['z']);
  });

  it('selects the active leads', () => {
    const { actions, selected } = setup();
    actions.handleSelectActiveLeads();
    expect(selected()).toEqual(['a', 'b', 'c']);
  });
});
