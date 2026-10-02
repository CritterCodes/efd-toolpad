// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

/**
 * useNewRepairForm was split on 2026-10-01 (max-lines) into useIntakeSetup, useIntakeCatalogs, useSmartIntake,
 * useIntakeItems, intakeSubmitActions and intakeClientPhotoActions, each moved verbatim and called where it sat.
 * eslint can't see the two ways such a split breaks at RUNTIME: a dep passed before it is declared (temporal dead
 * zone → the intake crashes on first render) and a name that silently resolves to a browser global. So: render the
 * real hook, check it hands the screens exactly the API it did before the split, and drive a handler from each piece.
 */
const api = vi.hoisted(() => ({ list: async () => [] }));
vi.mock('@/services/tasks.service', () => ({ default: { getTasks: vi.fn(api.list) } }));
vi.mock('@/services/materials.service', () => ({ default: { getMaterials: vi.fn(api.list) } }));
vi.mock('@/services/users', () => ({ default: { getAllUsers: vi.fn(api.list), createUser: vi.fn() } }));
vi.mock('@/services/repairs', () => ({ default: { createRepair: vi.fn(), updateRepair: vi.fn() } }));
vi.mock('@/api-clients/wholesaleClients.client', () => ({
  default: { fetchMyClients: vi.fn(api.list), fetchClientsByWholesaler: vi.fn(api.list), createClient: vi.fn() },
}));
vi.mock('@/api-clients/wholesaleAccountSettings.client', () => ({ default: { fetchSettings: vi.fn(async () => ({})) } }));
vi.mock('@/app/context/repairs.context', () => ({ useRepairs: () => ({ addRepair: vi.fn(), updateRepair: vi.fn() }) }));
vi.mock('@/hooks/repairs/usePromiseDateEstimate', () => ({
  default: () => ({ estimate: null, context: null, loading: false, error: '' }),
}));

// Every request the hook makes gets an empty, failed answer: the form must still render (pricing then says why).
globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));

const { default: useNewRepairForm } = await import('./useNewRepairForm');

// The hook's return, as it was before the split (useNewRepairForm.js at c406c90e).
const API = [
  'formData', 'setFormData', 'loading', 'errors', 'expandedSection', 'setExpandedSection', 'showNewClientDialog',
  'setShowNewClientDialog', 'analyzingSmartIntake', 'smartIntakeError', 'setSmartIntakeError', 'generatingImageDescription',
  'imageDescriptionError', 'setImageDescriptionError', 'newClientData', 'setNewClientData', 'newClientLoading',
  'picturePreviewUrl', 'availableTasks', 'availableMaterials', 'availableUsers', 'benchJewelers', 'availableStores',
  'rushJobInfo', 'wholesalerPricingSettings', 'pricingSettings', 'pricingError', 'pricingTotals', 'unpricedLines',
  'previewLinePrice', 'stullerSku', 'setStullerSku', 'loadingStuller', 'stullerError', 'addStullerMaterial',
  'promiseDateEstimate', 'promiseDateContext', 'promiseDateLoading', 'promiseDateError', 'getJewelerLabel',
  'getKaratOptions', 'calculateTotalCost', 'formatPhoneNumber', 'handleStoreChange', 'addTask', 'addMaterial',
  'addCustomLineItem', 'addCustomLaborTask', 'patchCustomLaborTask', 'removeItem', 'updateItem',
  'recalculateAllItemPrices', 'handleSubmit', 'handleAddNewClient', 'handleImageCapture',
  'handleGenerateDescriptionFromImage', 'handleAnalyzeSmartIntake',
];

afterEach(() => cleanup());

describe('useNewRepairForm after the split', () => {
  it('renders and returns exactly the pre-split API', async () => {
    const { result } = renderHook(() => useNewRepairForm({ onSubmit: vi.fn() }));
    await waitFor(() => expect(result.current.pricingError).toBeTruthy());
    expect(Object.keys(result.current).sort()).toEqual([...API].sort());
    for (const name of API.filter((n) => /^(handle|add|remove|update|patch|get|calculate|format|recalculate|preview)/.test(n))) {
      expect(typeof result.current[name], name).toBe('function');
    }
  });

  it('drives a handler from each piece', async () => {
    const { result } = renderHook(() => useNewRepairForm({ onSubmit: vi.fn() }));
    // intakeClientPhotoActions
    expect(result.current.formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    // useIntakeItems
    act(() => result.current.addTask({ _id: 't1', title: 'Size Down' }));
    await waitFor(() => expect(result.current.formData.tasks).toHaveLength(1));
    const lineID = result.current.formData.tasks[0].id;
    act(() => result.current.updateItem('tasks', lineID, 'quantity', 2));
    await waitFor(() => expect(result.current.formData.tasks[0].quantity).toBe(2));
    act(() => result.current.removeItem('tasks', lineID));
    await waitFor(() => expect(result.current.formData.tasks).toHaveLength(0));
    act(() => result.current.setFormData((prev) => ({ ...prev, metalType: 'gold' })));
    await waitFor(() => expect(result.current.getKaratOptions().length).toBeGreaterThan(0));
    // useIntakeSetup: no pricing context → an error, never a made-up price
    expect(result.current.pricingTotals).toBeNull();
  });
});
