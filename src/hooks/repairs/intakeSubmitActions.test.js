import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Owner, 2026-10-01 (OPEN-QUESTIONS Q12): a ring ticket is only asked for its sizes when a line on it sizes the ring
 * up or down — *"If we're not touching anything revolving around sizing then I don't really care what size it is."*
 */
const mocks = vi.hoisted(() => ({ createRepair: vi.fn(async () => ({ repairID: 'r-1' })), updateRepair: vi.fn() }));
vi.mock('@/services/repairs', () => ({ default: { createRepair: mocks.createRepair, updateRepair: mocks.updateRepair } }));

const { intakeSubmitActions } = await import('./intakeSubmitActions');

const RING = {
  clientName: 'A Customer', userID: 'c1', description: 'Yellow gold band', metalType: 'gold', goldColor: 'yellow',
  promiseDate: '2026-10-08', isRing: true, currentRingSize: '', desiredRingSize: '',
  tasks: [], materials: [], customLineItems: [], isWholesale: false,
};

const run = async (formData) => {
  const setErrors = vi.fn();
  const actions = intakeSubmitActions({
    addRepair: vi.fn(), benchJewelers: [], formData, getJewelerLabel: () => '', initialData: null, isQuote: false,
    isWholesale: false, onSubmit: vi.fn(), persistOnSubmit: true,
    pricedRepair: { tasks: [], materials: [], customLineItems: [], unpriced: [], totals: { subtotal: 0, rushFee: 0, deliveryFee: 0, taxRate: 0, taxAmount: 0, total: 0 } },
    pricingError: '', repairID: null, rushJobInfo: { canCreate: true }, setErrors, setLoading: vi.fn(),
    smartIntakeLogIDsRef: { current: [] }, submitMode: 'create', updateRepair: vi.fn(), viewerIsWholesaler: false,
  });
  await actions.handleSubmit();
  const [arg] = setErrors.mock.calls.at(-1) || [{}];
  return { error: arg?.submit || '', setErrors };
};

beforeEach(() => vi.clearAllMocks());

describe('ring sizes at save', () => {
  it('saves a ring with no sizes when nothing on the ticket sizes it', async () => {
    const { error } = await run({ ...RING, tasks: [{ id: 1, title: 'Rhodium Plating', quantity: 1 }] });
    expect(error).toBe('');
    expect(mocks.createRepair).toHaveBeenCalled();
  });

  it('still saves for the two sizing-stock tasks that are not a resize', async () => {
    for (const title of ['Half-Shank — up to 3mm', 'Sizing Beads']) {
      vi.clearAllMocks();
      const { error } = await run({ ...RING, tasks: [{ id: 1, title, quantity: 1 }] });
      expect(error, title).toBe('');
      expect(mocks.createRepair, title).toHaveBeenCalled();
    }
  });

  it('asks for the sizes when the ring is being sized, and saves nothing', async () => {
    const { error } = await run({ ...RING, tasks: [{ id: 1, title: 'Size Down', quantity: 1 }] });
    expect(error).toMatch(/Current ring size is required when the ring is being sized/);
    expect(mocks.createRepair).not.toHaveBeenCalled();
  });

  it('asks for the desired size when only the current one is written', async () => {
    const { error } = await run({ ...RING, currentRingSize: '7', tasks: [{ id: 1, title: 'Size Up (Customer Supplied Gold)', quantity: 1 }] });
    expect(error).toMatch(/Desired ring size is required when the ring is being sized/);
    expect(mocks.createRepair).not.toHaveBeenCalled();
  });

  it('saves a sizing ticket that has both sizes', async () => {
    const { error } = await run({ ...RING, currentRingSize: '7', desiredRingSize: '6', tasks: [{ id: 1, title: 'Size Down', quantity: 1 }] });
    expect(error).toBe('');
    expect(mocks.createRepair).toHaveBeenCalled();
  });
});
