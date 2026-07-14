import { beforeEach, describe, expect, it, vi } from 'vitest';

const pieces = vi.hoisted(() => ({ findById: vi.fn(), transitionCasting: vi.fn(), setWorkOrders: vi.fn(), upsertMaterialByCategory: vi.fn() }));
const workOrders = vi.hoisted(() => ({ findBySource: vi.fn(), create: vi.fn() }));
const expenses = vi.hoisted(() => ({ findBySourceReference: vi.fn(), create: vi.fn(), updateByExpenseID: vi.fn() }));
const addCastingCost = vi.hoisted(() => vi.fn());
vi.mock('@/app/api/pieces/model', async (original) => ({ ...(await original()), default: pieces }));
vi.mock('@/app/api/workOrders/model', async (original) => ({ ...(await original()), default: workOrders }));
vi.mock('@/app/api/businessExpenses/model', () => ({ default: expenses }));
vi.mock('@/services/customs/customProduction', () => ({ addCastingCost }));

import { assertCastingTransition, CASTING_STATE } from '@/app/api/pieces/model';
import { castInHouse, markCastingReceived, orderFromCarrera } from './casting';

describe('casting workflow', () => {
  beforeEach(() => { vi.clearAllMocks(); pieces.findById.mockResolvedValue({ pieceID: 'p1', workOrderIDs: [], casting: { state: 'needs_ordering' } }); pieces.transitionCasting.mockResolvedValue({ pieceID: 'p1' }); expenses.findBySourceReference.mockResolvedValue(null); expenses.create.mockResolvedValue({ expenseID: 'e1' }); });
  it('only permits forward one-step state transitions', () => { expect(() => assertCastingTransition(CASTING_STATE.NEEDS_ORDERING, CASTING_STATE.ORDERED)).not.toThrow(); expect(() => assertCastingTransition(CASTING_STATE.ORDERED, CASTING_STATE.NEEDS_ORDERING)).toThrow(/forward/); expect(() => assertCastingTransition(CASTING_STATE.NEEDS_ORDERING, CASTING_STATE.RECEIVED)).toThrow(/forward/); });
  it('Carrera books one custom-order expense without creating labor', async () => { pieces.findById.mockResolvedValue({ pieceID: 'p1', customOrderID: 'c1', workOrderIDs: [], casting: { state: 'needs_ordering' } }); await orderFromCarrera({ pieceID: 'p1', amount: 120, purchaseOrder: 'PO-1', invoiceNumber: 'INV-1' }); expect(expenses.findBySourceReference).toHaveBeenCalledWith('custom_order', 'c1'); expect(expenses.create).toHaveBeenCalledWith(expect.objectContaining({ vendor: 'Carrera', amount: 120, sourceReferenceType: 'custom_order', sourceReferenceID: 'c1' })); expect(workOrders.create).not.toHaveBeenCalled(); expect(pieces.transitionCasting).toHaveBeenCalledWith('p1', 'ordered', expect.objectContaining({ source: 'carrera' })); });
  it('in-house creates one claimable hourly casting work order', async () => { workOrders.findBySource.mockResolvedValue([]); workOrders.create.mockResolvedValue({ workOrderID: 'wo1', discipline: 'casting' }); await castInHouse({ pieceID: 'p1', hours: 2.5 }); expect(workOrders.create).toHaveBeenCalledWith(expect.objectContaining({ discipline: 'casting', status: 'READY FOR WORK', tasks: [{ process: 'Cast in-house', estLaborHours: 2.5 }] })); expect(pieces.setWorkOrders).toHaveBeenCalledWith('p1', ['wo1']); });
  it('custom receipt reuses the idempotent casting backbone then advances state', async () => { pieces.findById.mockResolvedValue({ pieceID: 'p1', customOrderID: 'c1', casting: { state: 'ordered' } }); addCastingCost.mockResolvedValue({ generation: { generated: 2 } }); await markCastingReceived({ pieceID: 'p1', amount: 99 }); expect(addCastingCost).toHaveBeenCalledWith(expect.objectContaining({ customID: 'c1', amount: 99 })); expect(pieces.transitionCasting).toHaveBeenCalledWith('p1', 'received', expect.any(Object)); });
});
