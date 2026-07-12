import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireRole = vi.hoisted(() => vi.fn());
const customOrders = vi.hoisted(() => ({ findById: vi.fn(), updateById: vi.fn() }));
const pieces = vi.hoisted(() => ({ findById: vi.fn() }));
const designs = vi.hoisted(() => ({ findById: vi.fn() }));
const setGemstonePieceStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/apiAuth', () => ({ requireRole }));
vi.mock('@/app/api/custom-orders/model', () => ({ default: customOrders }));
vi.mock('@/app/api/pieces/model', () => ({ default: pieces }));
vi.mock('@/app/api/designs/model', () => ({ default: designs }));
vi.mock('@/services/customs/customProduction', () => ({ awardClientMgmtBonus: vi.fn() }));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: vi.fn() },
}));
vi.mock('@/services/production/gemstoneLifecycle', () => ({ setGemstonePieceStatus }));

import { PUT } from './route';

describe('PUT /api/custom-orders/[customID] gemstone delivery lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({
      session: { user: { userID: 'admin-1' } },
      errorResponse: null,
    });
  });

  it('marks the linked gemstone backing Piece sold on the delivered edge', async () => {
    customOrders.findById.mockResolvedValue({ status: 'completed' });
    customOrders.updateById.mockResolvedValue({
      customID: 'custom-1', status: 'delivered', pieceIDs: ['piece-1'], designIDs: ['design-1'],
    });
    pieces.findById.mockResolvedValue({ pieceID: 'piece-1', gemstoneId: 'gem-1' });

    const response = await PUT(
      { json: vi.fn().mockResolvedValue({ status: 'delivered' }) },
      { params: Promise.resolve({ customID: 'custom-1' }) },
    );

    expect(response.status).toBe(200);
    expect(setGemstonePieceStatus).toHaveBeenCalledWith('gem-1', 'sold');
    expect(designs.findById).not.toHaveBeenCalled();
  });

  it('does not repeat the sold transition when an already-delivered order is edited', async () => {
    customOrders.findById.mockResolvedValue({ status: 'delivered' });
    customOrders.updateById.mockResolvedValue({ customID: 'custom-1', status: 'delivered' });

    await PUT(
      { json: vi.fn().mockResolvedValue({ title: 'Updated title' }) },
      { params: Promise.resolve({ customID: 'custom-1' }) },
    );

    expect(setGemstonePieceStatus).not.toHaveBeenCalled();
  });
});
