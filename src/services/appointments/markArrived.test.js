import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * "Arrived" on Bench Day converts the booking's lead into real work — but the appointment deliberately
 * stays `active` afterwards, because the bench is genuinely occupied while the customer is in the chair.
 * So the button can be pressed twice.
 *
 * That used to be harmless-looking and wasn't: the second press re-ran the conversion, which re-applied
 * the estimate over whatever the jeweler had priced in the meantime (EFD-DEFECTS Q2). Now
 * `convertLeadToRepair` refuses anything that is not a LEAD, so the second press would throw at the
 * counter instead. Neither is right: the arrival stamps should still run and the estimate should not be
 * re-applied. Hence the skip, and hence this test.
 */
const appointments = { findOne: vi.fn(), updateOne: vi.fn(async () => ({})) };
const repairs = { findOne: vi.fn() };
const adminSettings = { findOne: vi.fn(async () => null) };

const convertLeadToRepair = vi.fn(async () => ({}));
const updateById = vi.fn(async () => ({}));

vi.mock('@/lib/database', () => ({
  db: {
    connect: async () => ({
      collection: (name) => ({ appointments, repairs, adminSettings }[name] || { findOne: vi.fn(async () => null) }),
    }),
  },
}));
vi.mock('@/services/repairs/leadQuote', () => ({ convertLeadToRepair: (...a) => convertLeadToRepair(...a) }));
vi.mock('@/app/api/repairs/model', () => ({ default: { updateById: (...a) => updateById(...a) } }));

const { markArrived } = await import('./manage');

const booking = { appointmentID: 'appt-1', repairID: 'repair-1', status: 'active' };

beforeEach(() => {
  vi.clearAllMocks();
  appointments.findOne.mockResolvedValue(booking);
});

describe('marking a booking arrived', () => {
  it('converts the lead the first time', async () => {
    repairs.findOne.mockResolvedValue({ repairID: 'repair-1', status: 'LEAD' });

    await markArrived('appt-1');

    expect(convertLeadToRepair).toHaveBeenCalledTimes(1);
    expect(convertLeadToRepair.mock.calls[0][0]).toBe('repair-1');
    expect(updateById).toHaveBeenCalledWith('repair-1', expect.objectContaining({ whileYouWait: true }));
  });

  it('does not convert again when it is already on the bench', async () => {
    repairs.findOne.mockResolvedValue({ repairID: 'repair-1', status: 'IN PROGRESS' });

    await markArrived('appt-1');

    expect(convertLeadToRepair).not.toHaveBeenCalled();
    // The arrival still records — the person is still standing there.
    expect(updateById).toHaveBeenCalledWith('repair-1', expect.objectContaining({ whileYouWait: true }));
  });

  it('records who was put on it', async () => {
    repairs.findOne.mockResolvedValue({ repairID: 'repair-1', status: 'LEAD' });

    await markArrived('appt-1', { assignedTo: 'user-bea' });

    expect(updateById).toHaveBeenCalledWith('repair-1', expect.objectContaining({ assignedTo: 'user-bea' }));
  });

  it('refuses a booking with no repair attached', async () => {
    appointments.findOne.mockResolvedValue({ ...booking, repairID: null });
    await expect(markArrived('appt-1')).rejects.toThrow(/no repair attached/);
  });

  it('refuses when the repair has gone', async () => {
    repairs.findOne.mockResolvedValue(null);
    await expect(markArrived('appt-1')).rejects.toThrow(/no longer exists/);
  });
});
