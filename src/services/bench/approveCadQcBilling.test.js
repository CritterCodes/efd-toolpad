import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * approveCadQc — fee idempotency and billing.
 *
 * Two things this pins, both introduced when work-order billing was switched on (U-BILL-2):
 *
 * 1. THE DESIGN FEE MUST NOT BE PAID TWICE. Nothing stops approveCadQc running on an already-COMPLETED
 *    work order — loadPieceWorkOrder checks existence and discipline, not status — and the realistic
 *    trigger is a retry: billing fails transiently, staff see the error, click Approve again. Before
 *    the guard, that wrote a second `cad_design_fee`, which double-credits the author in payroll,
 *    inflates piece COGS, and (since billableLabor sums the logs) invoices the artisan for twice the
 *    fee. The invoice dedupe cannot help — the scenario begins with no invoice. The QC review fee was
 *    already guarded; the design fee was not.
 *
 * 2. THIS PATH BILLS AT ALL. Leaving it out would mean whether an artisan is charged depends on which
 *    button staff click, since completePieceWorkOrderFromQc bills and this one didn't.
 */

const laborLogsFindOne = vi.fn();
const createLaborLog = vi.fn();
const billCompletedWorkOrder = vi.fn();
const findByID = vi.fn();
const updateByID = vi.fn();

vi.mock('@/app/api/workOrders/model', () => ({
  default: { findByID: (...a) => findByID(...a), updateByID: (...a) => updateByID(...a) },
}));
vi.mock('@/app/api/pieces/model', () => ({
  default: { findById: vi.fn(async () => ({ pieceID: 'p-1' })), recomputeCosts: vi.fn(async () => ({ pieceID: 'p-1' })) },
}));
vi.mock('@/app/api/custom-orders/model', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/app/api/repairLaborLogs/model', () => ({
  default: { create: (...a) => createLaborLog(...a), findByWorkOrder: vi.fn(async () => []) },
}));
vi.mock('@/app/api/repairLaborLogs/utils', () => ({ getLaborRateSnapshotForUser: vi.fn(async () => ({})) }));
const resolvePieceLaborScope = vi.fn();
vi.mock('@/services/production/laborPayer', () => ({
  resolvePieceLaborScope: (...a) => resolvePieceLaborScope(...a),
}));
vi.mock('@/lib/storage', () => ({ storageClient: {}, STORAGE_BUCKET: 'b', storageUrl: (k) => k }));
// customViewer transitively imports productContract → @crittercodes/refrakt. Mocked both because this
// test doesn't exercise share links, and because leaving it real makes the suite fail to COLLECT (which
// reports as a failed suite and reads like "no failures" in a filtered run).
vi.mock('@/services/customs/customViewer', () => ({
  createShareLink: vi.fn(), setShareEnabled: vi.fn(),
}));
vi.mock('@/lib/stlParser', () => ({ getSTLVolume: vi.fn() }));
vi.mock('@/lib/stlVolumeStream', () => ({ stlVolumeCm3FromStorage: vi.fn() }));
vi.mock('@/app/api/admin/settings/services/settingsManager.service', () => ({
  default: { getSettings: vi.fn(async () => ({})) },
}));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://localhost' }));
vi.mock('@/services/workOrders/disciplines', () => ({
  canClaimDiscipline: vi.fn(() => true), DISCIPLINE: { CAD: 'cad' },
}));
vi.mock('@aws-sdk/client-s3', () => ({ PutObjectCommand: class {} }));
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ findOne: (...a) => laborLogsFindOne(...a) }) }) },
}));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn() } }));
vi.mock('@/services/production/workOrderBilling', () => ({
  billCompletedWorkOrder: (...a) => billCompletedWorkOrder(...a),
}));

const { approveCadQc } = await import('./pieceWorkOrderActions');

const session = { user: { userID: 'u-reviewer', name: 'Reviewer', role: 'admin' } };
const cadWo = {
  workOrderID: 'wo-cad-1', discipline: 'cad', sourceType: 'production_piece', sourceID: 'p-1',
  assignedToUserID: 'u-author', assignedJeweler: 'Author', flatFee: 150, cadStage: 'stl',
};

const feeLogs = () => createLaborLog.mock.calls
  .map(([log]) => log.sourceAction)
  .filter((a) => a === 'cad_design_fee');

beforeEach(() => {
  vi.clearAllMocks();
  findByID.mockResolvedValue(cadWo);
  updateByID.mockResolvedValue({ ...cadWo, status: 'COMPLETED' });
  laborLogsFindOne.mockResolvedValue(null);      // no prior fee, no prior review
  billCompletedWorkOrder.mockResolvedValue({ billed: true, invoiceID: 'ainv-1', amount: 200 });
  resolvePieceLaborScope.mockResolvedValue({ payer: 'efd', payeeUserID: 'u-author' });
});

describe('approveCadQc — design fee idempotency', () => {
  it('pays the design fee on the first approval', async () => {
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(feeLogs()).toHaveLength(1);
  });

  it('does NOT pay it again when the fee is already on this work order', async () => {
    // What a retry after a failed bill actually looks like: the fee log from attempt one is present.
    laborLogsFindOne.mockImplementation(async (filter) => (
      filter?.sourceAction === 'cad_design_fee' ? { _id: 'existing' } : null
    ));
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(feeLogs()).toHaveLength(0);
  });

  it('looks for the prior fee on THIS work order, not merely the piece', async () => {
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    const feeQuery = laborLogsFindOne.mock.calls
      .map(([f]) => f)
      .find((f) => f?.sourceAction === 'cad_design_fee');
    expect(feeQuery).toMatchObject({ workOrderID: 'wo-cad-1' });
  });

  it('pays nothing when there is no flat fee', async () => {
    findByID.mockResolvedValue({ ...cadWo, flatFee: 0 });
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(feeLogs()).toHaveLength(0);
  });
});

describe('approveCadQc — who pays for the peer review', () => {
  const reviewLog = () => createLaborLog.mock.calls
    .map(([log]) => log)
    .find((log) => log.sourceAction === 'cad_qc_review');

  it('resolves the payer instead of letting the model default it', async () => {
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(resolvePieceLaborScope).toHaveBeenCalledWith({ pieceID: 'p-1', laborerUserID: 'u-reviewer' });
    expect(reviewLog()).toMatchObject({ payer: 'efd' });
  });

  it('does NOT bill an owner who reviews CAD they outsourced', async () => {
    // The real defect the default hid: self-review is blocked for the AUTHOR, but an owner may review
    // an outsourced designer's work. Defaulting payer to 'efd' billed them, through the wholesale
    // markup, for their own labour on their own piece — rent on self-work.
    resolvePieceLaborScope.mockResolvedValue({ payer: 'self', payeeUserID: 'u-owner' });
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(reviewLog()).toMatchObject({ payer: 'self' });
  });

  it('charges the review only once per piece, across its several CAD work orders', async () => {
    // A piece has an STL WO and a GLB WO; the review fee must land on the piece, not on each.
    laborLogsFindOne.mockImplementation(async (filter) => (
      filter?.sourceAction === 'cad_qc_review' ? { _id: 'already' } : null
    ));
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(reviewLog()).toBeUndefined();
  });
});

describe('approveCadQc — billing', () => {
  it('bills the owning artisan, like the other QC path', async () => {
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(billCompletedWorkOrder).toHaveBeenCalledWith({ workOrderID: 'wo-cad-1', createdBy: 'u-reviewer' });
  });

  it('bills AFTER the status write — QC pass must not depend on billing', async () => {
    const order = [];
    updateByID.mockImplementation(async (...a) => { order.push('status'); return { ...cadWo, status: 'COMPLETED' }; });
    billCompletedWorkOrder.mockImplementation(async () => { order.push('bill'); return { billed: true }; });
    await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(order).toEqual(['status', 'bill']);
  });

  it('reports the billing result to the caller', async () => {
    const res = await approveCadQc({ session, workOrderID: 'wo-cad-1' });
    expect(res.billing).toMatchObject({ billed: true, invoiceID: 'ainv-1' });
  });
});
