import { beforeEach, describe, expect, it, vi } from 'vitest';

const pieces = vi.hoisted(() => ({ findById: vi.fn(), transitionCasting: vi.fn(), setWorkOrders: vi.fn(), upsertMaterialByCategory: vi.fn() }));
const workOrders = vi.hoisted(() => ({ findBySource: vi.fn(), create: vi.fn() }));
const expenses = vi.hoisted(() => ({ findBySourceReference: vi.fn(), create: vi.fn(), updateByExpenseID: vi.fn() }));
const addCastingCost = vi.hoisted(() => vi.fn());
const designs = vi.hoisted(() => ({ findById: vi.fn() }));
vi.mock('@/app/api/pieces/model', async (original) => ({ ...(await original()), default: pieces }));
vi.mock('@/app/api/workOrders/model', async (original) => ({ ...(await original()), default: workOrders }));
vi.mock('@/app/api/businessExpenses/model', () => ({ default: expenses }));
vi.mock('@/services/customs/customProduction', () => ({ addCastingCost }));
vi.mock('@/app/api/designs/model', () => ({ default: designs }));

import { assertCastingTransition, CASTING_STATE } from '@/app/api/pieces/model';
import { castInHouse, markCastingReceived, orderFromCarrera } from './casting';

describe('casting workflow', () => {
  beforeEach(() => { vi.clearAllMocks(); pieces.findById.mockResolvedValue({ pieceID: 'p1', designID: 'd1', workOrderIDs: [], casting: { state: 'needs_ordering' } }); pieces.transitionCasting.mockResolvedValue({ pieceID: 'p1' }); expenses.findBySourceReference.mockResolvedValue(null); expenses.create.mockResolvedValue({ expenseID: 'e1' }); workOrders.findBySource.mockResolvedValue([]); workOrders.create.mockResolvedValue({ workOrderID: 'wo-bench' }); designs.findById.mockResolvedValue({ name: 'Ring', routing: [{ discipline: 'bench_jewelry', process: 'Finish', estLaborHours: 2 }] }); });
  it('only permits forward one-step state transitions', () => { expect(() => assertCastingTransition(CASTING_STATE.NEEDS_ORDERING, CASTING_STATE.ORDERED)).not.toThrow(); expect(() => assertCastingTransition(CASTING_STATE.ORDERED, CASTING_STATE.NEEDS_ORDERING)).toThrow(/forward/); expect(() => assertCastingTransition(CASTING_STATE.NEEDS_ORDERING, CASTING_STATE.RECEIVED)).toThrow(/forward/); });
  it('Carrera books material expense without creating labor', async () => { await orderFromCarrera({ pieceID: 'p1', amount: 120, purchaseOrder: 'PO-1', invoiceNumber: 'INV-1' }); expect(expenses.create).toHaveBeenCalledWith(expect.objectContaining({ vendor: 'Carrera', amount: 120 })); expect(workOrders.create).not.toHaveBeenCalled(); expect(pieces.transitionCasting).toHaveBeenCalledWith('p1', 'ordered', expect.objectContaining({ source: 'carrera' })); });
  it('in-house creates one claimable hourly casting work order', async () => { workOrders.findBySource.mockResolvedValue([]); workOrders.create.mockResolvedValue({ workOrderID: 'wo1', discipline: 'casting' }); await castInHouse({ pieceID: 'p1', hours: 2.5 }); expect(workOrders.create).toHaveBeenCalledWith(expect.objectContaining({ discipline: 'casting', status: 'READY FOR WORK', tasks: [{ process: 'Cast in-house', estLaborHours: 2.5 }] })); expect(pieces.setWorkOrders).toHaveBeenCalledWith('p1', ['wo1']); });
  it('custom receipt reuses the idempotent casting backbone then advances state', async () => { pieces.findById.mockResolvedValue({ pieceID: 'p1', customOrderID: 'c1', casting: { state: 'ordered' } }); addCastingCost.mockResolvedValue({ generation: { generated: 2 } }); await markCastingReceived({ pieceID: 'p1', amount: 99 }); expect(addCastingCost).toHaveBeenCalledWith(expect.objectContaining({ customID: 'c1', amount: 99 })); expect(pieces.transitionCasting).toHaveBeenCalledWith('p1', 'received', expect.any(Object)); });
  it('production receipt generates routed bench work orders and links them once', async () => { pieces.findById.mockResolvedValue({ pieceID: 'p1', designID: 'd1', workOrderIDs: [], casting: { state: 'ordered' } }); const result = await markCastingReceived({ pieceID: 'p1', amount: 99 }); expect(workOrders.create).toHaveBeenCalledWith(expect.objectContaining({ sourceID: 'p1', discipline: 'bench_jewelry', status: 'READY FOR WORK' })); expect(pieces.setWorkOrders).toHaveBeenCalledWith('p1', ['wo-bench']); expect(result.generation.generated).toBe(1); });
  it('repeated production receipt generates bench work once and skips every receipt effect thereafter', async () => { const ordered = { pieceID: 'p1', designID: 'd1', workOrderIDs: [], casting: { state: 'ordered' } }; const received = { ...ordered, casting: { state: 'received' } }; pieces.findById.mockResolvedValueOnce(ordered).mockResolvedValueOnce(received); await markCastingReceived({ pieceID: 'p1', amount: 99 }); const result = await markCastingReceived({ pieceID: 'p1', amount: 99 }); expect(result.generation.skipped).toBe('already-received'); expect(pieces.upsertMaterialByCategory).toHaveBeenCalledTimes(1); expect(expenses.create).toHaveBeenCalledTimes(1); expect(workOrders.create).toHaveBeenCalledTimes(1); expect(pieces.transitionCasting).toHaveBeenCalledTimes(1); });
});
