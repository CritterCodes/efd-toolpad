/**
 * Tests for the source-agnostic casting service (Production Pipeline §8).
 * Covers: guard function, Carrera ordering path, in-house casting WO path,
 * custom-piece received path, production-piece received path, idempotency,
 * moveCastingWOToQc (flat-fee payout model), and completeCastingWOFromQc.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guardedCastingTransition } from '@/services/casting/castingService';

// ─── pure guard (no mocks needed) ──────────────────────────────────────────

describe('guardedCastingTransition (pure state guard)', () => {
  it('allows needs_ordering → ordered', () => {
    expect(guardedCastingTransition('needs_ordering', 'ordered').ok).toBe(true);
  });

  it('allows ordered → received', () => {
    expect(guardedCastingTransition('ordered', 'received').ok).toBe(true);
  });

  it('allows null/undefined → needs_ordering (first registration)', () => {
    expect(guardedCastingTransition(null, 'needs_ordering').ok).toBe(true);
    expect(guardedCastingTransition(undefined, 'needs_ordering').ok).toBe(true);
  });

  it('blocks backwards: received → ordered', () => {
    const r = guardedCastingTransition('received', 'ordered');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/forward-only/);
  });

  it('blocks backwards: ordered → needs_ordering', () => {
    expect(guardedCastingTransition('ordered', 'needs_ordering').ok).toBe(false);
  });

  it('blocks repeat: ordered → ordered', () => {
    expect(guardedCastingTransition('ordered', 'ordered').ok).toBe(false);
  });

  it('blocks repeat: received → received', () => {
    expect(guardedCastingTransition('received', 'received').ok).toBe(false);
  });

  it('rejects unknown target state', () => {
    const r = guardedCastingTransition('needs_ordering', 'shipped');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/unknown state/);
  });
});

// ─── service functions — mocked dependencies ───────────────────────────────

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: vi.fn(() => ({
        findOne: vi.fn(async () => ({ casting: { castingLaborFee: 20 } })),
      })),
    })),
  },
}));

vi.mock('@/app/api/pieces/model', () => {
  const CASTING_STATE = { NEEDS_ORDERING: 'needs_ordering', ORDERED: 'ordered', RECEIVED: 'received' };
  const mockPiece = (overrides = {}) => ({
    pieceID: 'piece-001',
    designID: 'design-001',
    variantId: 'var-001',
    casting: 'needs_ordering',
    status: 'planned',
    metalType: '14k',
    karat: '14k',
    workOrderIDs: [],
    actualMaterials: [],
    customOrderID: null,
    castingReceivedAt: null,
    ...overrides,
  });

  const PiecesModel = {
    findById: vi.fn(async () => mockPiece()),
    updateById: vi.fn(async (id, data) => ({ pieceID: id, ...data })),
    updateCasting: vi.fn(async (id, state, extra = {}) => ({ pieceID: id, casting: state, ...extra })),
    setWorkOrders: vi.fn(async () => {}),
    upsertMaterialByCategory: vi.fn(async () => ({})),
    recomputeCosts: vi.fn(async () => ({})),
    listCastingQueue: vi.fn(async () => [mockPiece()]),
    CASTING_STATE,
  };
  return { default: PiecesModel, CASTING_STATE };
});

vi.mock('@/app/api/workOrders/model', () => ({
  default: {
    create: vi.fn(async (data) => ({ workOrderID: 'wo-cast-001', ...data })),
    updateByID: vi.fn(async (id, data) => ({ workOrderID: id, ...data })),
  },
  WORK_ORDER_SOURCE: { PRODUCTION_PIECE: 'production_piece' },
}));

vi.mock('@/app/api/businessExpenses/model', () => ({
  default: {
    create: vi.fn(async (data) => ({ expenseID: 'exp-001', ...data })),
    updateByExpenseID: vi.fn(async (id, data) => ({ expenseID: id, ...data })),
    findBySourceReference: vi.fn(async () => null),
  },
}));

vi.mock('@/app/api/repairLaborLogs/model', () => ({
  default: {
    create: vi.fn(async (data) => ({ logID: 'log-001', ...data })),
    releasePendingQc: vi.fn(async () => 1),
  },
}));

vi.mock('@/app/api/designs/model', () => ({
  default: {
    findById: vi.fn(async () => ({
      designID: 'design-001',
      name: 'Test Ring',
      routing: [{ seq: 1, discipline: 'bench_jewelry', process: 'Finishing', estLaborHours: 1.5 }],
    })),
  },
}));

vi.mock('@/services/customs/customProduction', () => ({
  generateWorkOrdersFromQuote: vi.fn(async () => ({ generated: 2 })),
}));

// Import after mocks are registered
const {
  markCastingOrdered, createInHouseCastingWO, markCastingReceived, listCastingQueue,
  moveCastingWOToQc, completeCastingWOFromQc,
} = await import('@/services/casting/castingService');

const PiecesModel = (await import('@/app/api/pieces/model')).default;
const WorkOrdersModel = (await import('@/app/api/workOrders/model')).default;
const BusinessExpensesModel = (await import('@/app/api/businessExpenses/model')).default;
const RepairLaborLogsModel = (await import('@/app/api/repairLaborLogs/model')).default;
const { generateWorkOrdersFromQuote } = await import('@/services/customs/customProduction');

const mockSession = { user: { userID: 'user-001', name: 'Test User' } };

beforeEach(() => {
  vi.clearAllMocks();
  BusinessExpensesModel.findBySourceReference.mockResolvedValue(null);
  PiecesModel.findById.mockResolvedValue({
    pieceID: 'piece-001', designID: 'design-001', variantId: 'var-001',
    casting: 'needs_ordering', status: 'planned', metalType: '14k', karat: '14k',
    workOrderIDs: [], actualMaterials: [], customOrderID: null, castingReceivedAt: null,
  });
});

// ─── Carrera ordering path ─────────────────────────────────────────────────

describe('markCastingOrdered (Carrera path)', () => {
  it('does NOT create a businessExpenses entry at order time (estimate only)', async () => {
    await markCastingOrdered('piece-001', { vendor: 'Carrera', amount: 320, invoiceNumber: 'INV-999' });
    expect(BusinessExpensesModel.create).not.toHaveBeenCalled();
    expect(BusinessExpensesModel.updateByExpenseID).not.toHaveBeenCalled();
  });

  it('advances casting to ordered', async () => {
    await markCastingOrdered('piece-001', { vendor: 'Carrera', amount: 320 });
    expect(PiecesModel.updateCasting).toHaveBeenCalledWith('piece-001', 'ordered', expect.objectContaining({ status: 'casting_ordered' }));
  });

  it('creates NO work order (purchased material path)', async () => {
    await markCastingOrdered('piece-001', { vendor: 'Carrera', amount: 320 });
    expect(WorkOrdersModel.create).not.toHaveBeenCalled();
  });

  it('rejects when piece is already ordered (forward-only guard)', async () => {
    PiecesModel.findById.mockResolvedValueOnce({
      pieceID: 'piece-001', casting: 'ordered', workOrderIDs: [], customOrderID: null,
    });
    await expect(markCastingOrdered('piece-001', { amount: 100 })).rejects.toThrow(/forward-only/);
  });
});

// ─── In-house casting WO path ─────────────────────────────────────────────

describe('createInHouseCastingWO (in-house path)', () => {
  it('creates a work order with discipline=casting', async () => {
    await createInHouseCastingWO('piece-001', { estLaborHours: 2.5 });
    expect(WorkOrdersModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: 'casting', sourceType: 'production_piece', sourceID: 'piece-001' }),
    );
  });

  it('sets estimated labor hours on the casting WO tasks', async () => {
    await createInHouseCastingWO('piece-001', { estLaborHours: 3 });
    const call = WorkOrdersModel.create.mock.calls[0][0];
    expect(call.tasks[0].estLaborHours).toBe(3);
  });

  it('advances casting to ordered after creating the WO', async () => {
    await createInHouseCastingWO('piece-001', { estLaborHours: 2 });
    expect(PiecesModel.updateCasting).toHaveBeenCalledWith('piece-001', 'ordered');
  });

  it('creates no businessExpenses entry (labor path, not a purchase)', async () => {
    await createInHouseCastingWO('piece-001', { estLaborHours: 2 });
    expect(BusinessExpensesModel.create).not.toHaveBeenCalled();
  });

  it('rejects when piece is already ordered', async () => {
    PiecesModel.findById.mockResolvedValueOnce({ pieceID: 'piece-001', casting: 'ordered', workOrderIDs: [] });
    await expect(createInHouseCastingWO('piece-001', {})).rejects.toThrow(/forward-only/);
  });
});

// ─── moveCastingWOToQc — flat-fee payout model ────────────────────────────

describe('moveCastingWOToQc (casting payout model)', () => {
  const castingWO = {
    workOrderID: 'wo-cast-001',
    discipline: 'casting',
    sourceType: 'production_piece',
    sourceID: 'piece-001',
    assignedToUserID: 'artisan-007',
    assignedJeweler: 'Vernon',
    status: 'IN PROGRESS',
  };

  it('creates a labor log with creditedValue = castingLaborFee (flat fee from settings)', async () => {
    await moveCastingWOToQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(RepairLaborLogsModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderID: 'wo-cast-001',
        creditedValue: 20, // from the mocked adminSettings (castingLaborFee: 20)
        creditedLaborHours: 0,
        pendingQc: true,
        requiresAdminReview: false,
        sourceAction: 'casting_wo_move_to_qc',
      }),
    );
  });

  it('credits the ASSIGNED jeweler, not the session user', async () => {
    await moveCastingWOToQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(RepairLaborLogsModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ primaryJewelerUserID: 'artisan-007', primaryJewelerName: 'Vernon' }),
    );
  });

  it('advances WO status to QC', async () => {
    await moveCastingWOToQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(WorkOrdersModel.updateByID).toHaveBeenCalledWith(
      'wo-cast-001', expect.objectContaining({ status: 'QC' }),
    );
  });

  it('does NOT use hours × rate (no business expense, no hourly log)', async () => {
    await moveCastingWOToQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(BusinessExpensesModel.create).not.toHaveBeenCalled();
    const log = RepairLaborLogsModel.create.mock.calls[0][0];
    expect(log.laborRateSnapshot).toBe(0);
  });
});

// ─── completeCastingWOFromQc — in-house received + bench WO generation ────

describe('completeCastingWOFromQc (in-house path)', () => {
  const castingWO = {
    workOrderID: 'wo-cast-001',
    discipline: 'casting',
    sourceType: 'production_piece',
    sourceID: 'piece-001',
    assignedToUserID: 'artisan-007',
    assignedJeweler: 'Vernon',
    status: 'QC',
  };

  beforeEach(() => {
    PiecesModel.findById.mockResolvedValue({
      pieceID: 'piece-001', designID: 'design-001', casting: 'ordered',
      customOrderID: null, castingReceivedAt: null, workOrderIDs: ['wo-cast-001'],
    });
  });

  it('releases pending QC labor log (makes it payable)', async () => {
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(RepairLaborLogsModel.releasePendingQc).toHaveBeenCalledWith('wo-cast-001');
  });

  it('marks WO COMPLETED', async () => {
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(WorkOrdersModel.updateByID).toHaveBeenCalledWith(
      'wo-cast-001', expect.objectContaining({ status: 'COMPLETED' }),
    );
  });

  it('advances piece casting to received', async () => {
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(PiecesModel.updateCasting).toHaveBeenCalledWith(
      'piece-001', 'received', expect.objectContaining({ castingReceivedAt: expect.any(Date) }),
    );
  });

  it('generates bench WOs from design routing (production piece)', async () => {
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(WorkOrdersModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: 'bench_jewelry', status: 'READY FOR WORK' }),
    );
  });

  it('creates NO business expense (in-house labor is paid via labor log, not invoice)', async () => {
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(BusinessExpensesModel.create).not.toHaveBeenCalled();
  });

  it('is idempotent: skips bench WO spawn if castingReceivedAt is already set', async () => {
    PiecesModel.findById.mockResolvedValueOnce({
      pieceID: 'piece-001', casting: 'ordered', customOrderID: null,
      castingReceivedAt: new Date(), workOrderIDs: ['wo-cast-001'], designID: 'design-001',
    });
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    // spawnBenchWOsFromDesign exits early because castingReceivedAt is set
    expect(WorkOrdersModel.create).not.toHaveBeenCalled();
  });

  it('delegates bench WO generation to generateWorkOrdersFromQuote for custom pieces', async () => {
    PiecesModel.findById.mockResolvedValueOnce({
      pieceID: 'piece-001', casting: 'ordered', customOrderID: 'CO-abc',
      castingReceivedAt: null, workOrderIDs: ['wo-cast-001'], designID: null,
    });
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(generateWorkOrdersFromQuote).toHaveBeenCalledWith(
      expect.objectContaining({ customID: 'CO-abc' }),
    );
    expect(BusinessExpensesModel.create).not.toHaveBeenCalled();
  });

  it('recomputes piece COGS after completion', async () => {
    await completeCastingWOFromQc({ session: mockSession, workOrderID: 'wo-cast-001', wo: castingWO });
    expect(PiecesModel.recomputeCosts).toHaveBeenCalledWith('piece-001');
  });
});

// ─── Received path — production piece ─────────────────────────────────────

describe('markCastingReceived — production piece (no customOrderID)', () => {
  it('upserts casting material line on the piece', async () => {
    await markCastingReceived('piece-001', { amount: 280, vendor: 'Carrera' });
    expect(PiecesModel.upsertMaterialByCategory).toHaveBeenCalledWith(
      'piece-001', 'casting', expect.objectContaining({ unitCost: 280, vendor: 'Carrera' }),
    );
  });

  it('books a businessExpenses entry (finalized invoice at received time)', async () => {
    await markCastingReceived('piece-001', { amount: 280, vendor: 'Carrera', invoiceNumber: 'INV-42' });
    expect(BusinessExpensesModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 280, sourceReferenceType: 'piece', sourceReferenceID: 'piece-001' }),
    );
  });

  it('spawns bench WOs from design routing (metal in hand → bench can start)', async () => {
    await markCastingReceived('piece-001', { amount: 280 });
    expect(WorkOrdersModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: 'bench_jewelry', status: 'READY FOR WORK' }),
    );
  });

  it('advances casting to received', async () => {
    await markCastingReceived('piece-001', { amount: 280 });
    expect(PiecesModel.updateCasting).toHaveBeenCalledWith(
      'piece-001', 'received', expect.objectContaining({ castingReceivedAt: expect.any(Date) }),
    );
  });

  it('is idempotent: does not re-spawn bench WOs when castingReceivedAt is already set', async () => {
    PiecesModel.findById.mockResolvedValueOnce({
      pieceID: 'piece-001', casting: 'ordered', workOrderIDs: ['wo-existing'],
      customOrderID: null, castingReceivedAt: new Date(), designID: 'design-001',
    });
    await markCastingReceived('piece-001', { amount: 280 });
    // spawnBenchWOsFromDesign skips because castingReceivedAt is set
    expect(WorkOrdersModel.create).not.toHaveBeenCalled();
  });

  it('rejects amount <= 0', async () => {
    await expect(markCastingReceived('piece-001', { amount: 0 })).rejects.toThrow(/amount must be/i);
    await expect(markCastingReceived('piece-001', { amount: -1 })).rejects.toThrow(/amount must be/i);
  });
});

// ─── Received path — custom piece ─────────────────────────────────────────

describe('markCastingReceived — custom piece (customOrderID present)', () => {
  beforeEach(() => {
    PiecesModel.findById.mockResolvedValue({
      pieceID: 'piece-001', casting: 'ordered', workOrderIDs: [],
      customOrderID: 'CO-abc', castingReceivedAt: null, designID: null,
    });
  });

  it('delegates bench WO generation to generateWorkOrdersFromQuote', async () => {
    await markCastingReceived('piece-001', { amount: 300 });
    expect(generateWorkOrdersFromQuote).toHaveBeenCalledWith(
      expect.objectContaining({ customID: 'CO-abc' }),
    );
  });

  it('does NOT call spawnBenchWOsFromDesign (no direct WO.create call for bench)', async () => {
    generateWorkOrdersFromQuote.mockResolvedValueOnce({ generated: 2 });
    const result = await markCastingReceived('piece-001', { amount: 300 });
    expect(result.generation).toEqual({ generated: 2 });
    // WorkOrdersModel.create should NOT be called by castingService directly in custom path
    expect(WorkOrdersModel.create).not.toHaveBeenCalled();
  });
});

// ─── casting queue listing ─────────────────────────────────────────────────

describe('listCastingQueue', () => {
  it('returns pieces with casting=needs_ordering annotated with source type', async () => {
    const queue = await listCastingQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]._source).toBe('production'); // no customOrderID
    expect(queue[0].casting).toBe('needs_ordering');
  });
});
