import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/api/designs/model', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/app/api/pieces/model', () => ({
  default: { create: vi.fn(), setWorkOrders: vi.fn(), findById: vi.fn() },
}));
vi.mock('@/app/api/workOrders/model', () => ({
  default: { create: vi.fn() },
  WORK_ORDER_SOURCE: { PRODUCTION_PIECE: 'production_piece' },
}));

import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import WorkOrdersModel from '@/app/api/workOrders/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { createDirectPiece, createPieceFromDesign } from '@/services/production/pieceRouting';

describe('createDirectPiece (M1-T4 — handmade / no design, no estimate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let n = 0;
    PiecesModel.create.mockImplementation(async (d) => ({ pieceID: 'pc1', ...d }));
    PiecesModel.setWorkOrders.mockResolvedValue(undefined);
    PiecesModel.findById.mockImplementation(async (id) => ({ pieceID: id }));
    WorkOrdersModel.create.mockImplementation(async (wo) => ({ workOrderID: `wo${++n}`, ...wo }));
  });

  it('creates a design-less piece with a single default bench_jewelry work order', async () => {
    await createDirectPiece({ metalType: 'gold', karat: '14k', actualMaterials: [{ cost: 50 }] });
    expect(PiecesModel.create).toHaveBeenCalledWith(expect.objectContaining({ designID: null }));
    expect(WorkOrdersModel.create).toHaveBeenCalledTimes(1);
    expect(WorkOrdersModel.create).toHaveBeenCalledWith(expect.objectContaining({
      discipline: DISCIPLINE.BENCH_JEWELRY,
      sourceType: 'production_piece',
      sourceID: 'pc1',
    }));
    expect(PiecesModel.setWorkOrders).toHaveBeenCalledWith('pc1', ['wo1']);
    expect(DesignsModel.findById).not.toHaveBeenCalled(); // no design lookup for a bare piece
  });

  it('honors an explicit multi-step routing', async () => {
    await createDirectPiece({ routing: [{ seq: 1, discipline: 'cad' }, { seq: 2, discipline: 'bench_jewelry' }] });
    expect(WorkOrdersModel.create).toHaveBeenCalledTimes(2);
    expect(PiecesModel.setWorkOrders).toHaveBeenCalledWith('pc1', ['wo1', 'wo2']);
  });

  it('links an optional design (premade CAD) + threads its gemstoneId without requiring it', async () => {
    DesignsModel.findById.mockResolvedValue({ designID: 'd1', name: 'Premade', gemstoneId: 'gem-5', routing: [] });
    await createDirectPiece({ designID: 'd1' });
    expect(PiecesModel.create).toHaveBeenCalledWith(expect.objectContaining({ designID: 'd1', gemstoneId: 'gem-5' }));
    expect(WorkOrdersModel.create).toHaveBeenCalledTimes(1); // empty design routing → default bench step
  });
});

describe('createPieceFromDesign (unchanged production path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let n = 0;
    PiecesModel.create.mockImplementation(async (d) => ({ pieceID: 'pc9', ...d }));
    PiecesModel.setWorkOrders.mockResolvedValue(undefined);
    PiecesModel.findById.mockImplementation(async (id) => ({ pieceID: id }));
    WorkOrdersModel.create.mockImplementation(async (wo) => ({ workOrderID: `wo${++n}`, ...wo }));
  });

  it('throws when the design is missing', async () => {
    DesignsModel.findById.mockResolvedValue(null);
    await expect(createPieceFromDesign('nope')).rejects.toThrow('Design not found.');
  });

  it('spawns one work order per design routing step', async () => {
    DesignsModel.findById.mockResolvedValue({
      designID: 'd1', name: 'Ring', gemstoneId: 'gem-1',
      routing: [{ seq: 1, discipline: 'cad' }, { seq: 2, discipline: 'bench_jewelry' }, { seq: 3, discipline: 'engraving' }],
    });
    await createPieceFromDesign('d1', { metalType: 'gold' });
    expect(WorkOrdersModel.create).toHaveBeenCalledTimes(3);
    expect(PiecesModel.create).toHaveBeenCalledWith(expect.objectContaining({ designID: 'd1', gemstoneId: 'gem-1' }));
  });
});
