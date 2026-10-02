import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * EFD-DEFECTS Q2 — drop-off applied any estimate, even a declined one.
 *
 * `convertLeadToRepair` applied `quote.submission` whenever one existed: draft, sent, declined, expired.
 * So a customer quoted $400 who SAID NO, then walked in with the piece anyway, got a repair carrying the
 * $400 of work they had just refused — while the drop-off dialog told the person at the counter, in as
 * many words, *"No accepted estimate on this lead, so it converts as-is."*
 *
 * The screen was right and the server was wrong, which is why this needed no ruling: the intended
 * behaviour was already written down on the screen.
 */
const findOne = vi.fn();
const updateById = vi.fn(async (id, set) => ({ repairID: id, ...set }));

vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ findOne: (...a) => findOne(...a) }) }) },
}));
vi.mock('@/app/api/repairs/model', () => ({
  default: { updateById: (...a) => updateById(...a) },
}));

const { convertLeadToRepair } = await import('./leadQuote');

const PRICED = {
  tasks: [{ title: 'Retip prongs', price: 40, quantity: 2 }],
  materials: [],
  totalCost: 400,
};

const lead = (quote) => ({
  repairID: 'repair-lead-1',
  status: 'LEAD',
  clientName: 'Dana Lead',
  ...(quote ? { quote } : {}),
});

/** The fields `updateById` was asked to write. */
const written = () => updateById.mock.calls[0]?.[1] || {};

describe('converting a lead at drop-off', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carries the priced work when the customer accepted it', async () => {
    findOne.mockResolvedValue(lead({ status: 'accepted', total: 400, submission: PRICED }));

    const out = await convertLeadToRepair('repair-lead-1');

    expect(out.fromQuote).toBe(true);
    expect(written()).toMatchObject({ tasks: PRICED.tasks, quotedTotal: 400, status: 'READY FOR WORK' });
    expect(written().droppedOffAt).toBeInstanceOf(Date);
  });

  it('carries NOTHING when the customer declined — the defect', async () => {
    findOne.mockResolvedValue(lead({ status: 'declined', total: 400, submission: PRICED }));

    const out = await convertLeadToRepair('repair-lead-1');

    expect(out.fromQuote).toBe(false);
    expect(written().tasks).toBeUndefined();
    expect(written().quotedTotal).toBeUndefined();
    // It still converts — they turned up with the piece — it just arrives unpriced.
    expect(written().status).toBe('READY FOR WORK');
  });

  it.each(['draft', 'sent'])('carries nothing for a %s estimate either', async (status) => {
    // A draft was never sent, so nothing was agreed. A sent-but-unanswered estimate is not agreement
    // either: turning up with the piece is not accepting a price.
    findOne.mockResolvedValue(lead({ status, total: 400, submission: PRICED }));

    await convertLeadToRepair('repair-lead-1');

    expect(written().tasks).toBeUndefined();
    expect(written().quotedTotal).toBeUndefined();
  });

  it('converts a lead with no estimate at all', async () => {
    findOne.mockResolvedValue(lead(null));

    const out = await convertLeadToRepair('repair-lead-1', { status: 'RECEIVING', promiseDate: '2026-10-20' });

    expect(out.fromQuote).toBe(false);
    expect(written()).toMatchObject({ status: 'RECEIVING', promiseDate: '2026-10-20' });
  });

  it('refuses anything that is not a lead', async () => {
    // Without this, dropping off a job already on the bench would re-stamp its status and could re-apply
    // an old estimate over work a jeweler has since priced at the counter.
    findOne.mockResolvedValue({ ...lead({ status: 'accepted', total: 400, submission: PRICED }), status: 'IN PROGRESS' });

    await expect(convertLeadToRepair('repair-lead-1')).rejects.toThrow(/is not a lead/);
    expect(updateById).not.toHaveBeenCalled();
  });

  it('still refuses a repair that does not exist', async () => {
    findOne.mockResolvedValue(null);
    await expect(convertLeadToRepair('nope')).rejects.toThrow(/Lead not found/);
  });
});
