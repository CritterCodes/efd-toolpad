import { describe, it, expect, vi, beforeEach } from 'vitest';
import { catalogActions } from './catalogActions';

/**
 * The Catalog's write actions, moved out of page.js (max-lines, 2026-10-01). Pins what the bulk bar does: one request
 * per selected product, nothing without the confirm, a partial failure reported and the selection kept.
 */
const setup = (over = {}) => {
  const deps = {
    clearSelection: vi.fn(), load: vi.fn(async () => {}), reassignTo: '', selected: new Set(['p1', 'p2']),
    setBulkBusy: vi.fn(), setReassignOpen: vi.fn(), setReassignTo: vi.fn(), showSnack: vi.fn(), ...over,
  };
  return { deps, actions: catalogActions(deps) };
};
const ok = { ok: true, json: async () => ({}) };

beforeEach(() => {
  globalThis.window = { confirm: vi.fn(() => true) };
  globalThis.fetch = vi.fn(async () => ok);
});

describe('catalogActions', () => {
  it('archives each selected product, then reloads and clears the selection', async () => {
    const { deps, actions } = setup();
    await actions.handleBulkArchive();
    expect(window.confirm).toHaveBeenCalledWith('Archive 2 selected product(s)?');
    expect(fetch.mock.calls.map(([url, init]) => [url, init.method, init.body]))
      .toEqual([['/api/products/p1', 'PUT', '{"status":"archived"}'], ['/api/products/p2', 'PUT', '{"status":"archived"}']]);
    expect(deps.load).toHaveBeenCalled();
    expect(deps.clearSelection).toHaveBeenCalled();
    expect(deps.showSnack).toHaveBeenCalledWith('Archive: 2 products updated.');
  });

  it('does nothing when the confirm is declined', async () => {
    window.confirm.mockReturnValue(false);
    const { deps, actions } = setup();
    await actions.handleBulkRemove();
    expect(fetch).not.toHaveBeenCalled();
    expect(deps.setBulkBusy).not.toHaveBeenCalled();
  });

  it('reports a partial failure and keeps the selection', async () => {
    fetch.mockImplementation(async (url) => (url.includes('p2')
      ? { ok: false, json: async () => ({ error: 'Not allowed' }) } : ok));
    const { deps, actions } = setup();
    await actions.handleBulkPublish();
    expect(deps.clearSelection).not.toHaveBeenCalled();
    expect(deps.showSnack).toHaveBeenCalledWith('Publish: 1 succeeded, 1 failed. Not allowed', 'error');
  });

  it('reassign asks first, then moves each product to the chosen artisan', async () => {
    const first = setup();
    first.actions.handleBulkReassign();
    expect(first.deps.setReassignTo).toHaveBeenCalledWith('');
    expect(first.deps.setReassignOpen).toHaveBeenCalledWith(true);
    const { actions } = setup({ reassignTo: 'artisan-9', selected: new Set(['p1']) });
    await actions.confirmBulkReassign();
    expect(fetch).toHaveBeenCalledWith('/api/products/p1', expect.objectContaining({ body: '{"artisanId":"artisan-9"}' }));
  });
});
