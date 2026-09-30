import { describe, it, expect } from 'vitest';
import { pickEditableRepairFields, STAFF_EDITABLE_FIELDS, STORE_EDITABLE_FIELDS } from './repairEditFields';

/**
 * EFD-DEFECTS S5: PUT /api/repairs wrote its whole body. Its only caller — the intake form in edit
 * mode — resends the entire repair it loaded, so workflow and billing fields arrive on every edit.
 * What must hold:
 *   1. the fields the form edits still save
 *   2. workflow, invoice, closeout and quote fields are never written through this route
 *   3. a store can't make its own repair free, re-key it, or move it
 *   4. a dotted key can't reach into a protected subdocument
 */

// What the edit form actually sends: the loaded repair, spread, plus recomputed totals.
const FORM_RESEND = {
  _id: 'abc', repairID: 'repair-1', createdAt: '2026-09-01', createdBy: 'u-staff',
  userID: 'user-client', clientName: 'Ann', description: 'Size down', notes: 'n', internalNotes: 'shop only',
  metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '7', desiredRingSize: '6',
  tasks: [{ title: 'Size Down', price: 24 }], materials: [], customLineItems: [],
  isRush: false, promiseDate: '2026-10-05', includeDelivery: false, includeTax: true,
  totalCost: 26.28, subtotal: 24, rushFee: 0, deliveryFee: 0, taxAmount: 2.28, taxRate: 0.095,
  storeId: 'engel-fine-design', storeName: 'Engel Fine Design', isWholesale: false,
  compRepair: false, includedWithSale: false,
  // Loaded unchanged, never the form's to write:
  status: 'IN PROGRESS', benchStatus: 'IN_PROGRESS', assignedTo: 'u-jeweler', claimedAt: '2026-09-02',
  invoiceID: 'rinv-1', closeoutStatus: 'done', qcBy: 'x', quoteRequest: { at: 'y' }, requiresLaborReview: false,
};

describe('staff edits', () => {
  it('saves every field the form edits', () => {
    const { update } = pickEditableRepairFields(FORM_RESEND, { isStaff: true });
    expect(update).toMatchObject({
      clientName: 'Ann', description: 'Size down', tasks: [{ title: 'Size Down', price: 24 }],
      totalCost: 26.28, compRepair: false, internalNotes: 'shop only', userID: 'user-client',
    });
  });

  it('drops the workflow, invoice, closeout, quote and identity fields the form resends', () => {
    const { update, dropped } = pickEditableRepairFields(FORM_RESEND, { isStaff: true });
    for (const field of ['_id', 'repairID', 'createdAt', 'createdBy', 'status', 'benchStatus', 'assignedTo',
      'claimedAt', 'invoiceID', 'closeoutStatus', 'qcBy', 'quoteRequest', 'requiresLaborReview']) {
      expect(update).not.toHaveProperty(field);
      expect(dropped).toContain(field);
    }
  });
});

describe('store edits', () => {
  it('saves the piece, the work and its price', () => {
    const { update } = pickEditableRepairFields(FORM_RESEND, { isStaff: false });
    expect(update).toMatchObject({ description: 'Size down', tasks: [{ title: 'Size Down', price: 24 }], totalCost: 26.28 });
  });

  it('cannot make its own repair free, re-key it, or change which store it is', () => {
    const hostile = { ...FORM_RESEND, compRepair: true, includedWithSale: true, billing: { mode: 'internal' },
      userID: 'user-someone-else', storeId: 'other-store', isWholesale: false, internalNotes: 'x' };
    const { update } = pickEditableRepairFields(hostile, { isStaff: false });
    for (const field of ['compRepair', 'includedWithSale', 'billing', 'userID', 'storeId', 'storeName',
      'businessName', 'isWholesale', 'internalNotes', 'afterPhotos', 'clientNotProvided']) {
      expect(update).not.toHaveProperty(field);
    }
  });

  it('cannot move its own repair or attach an invoice', () => {
    const { update } = pickEditableRepairFields({ description: 'x', status: 'COMPLETED', invoiceID: 'rinv-9' }, { isStaff: false });
    expect(update).toEqual({ description: 'x' });
  });

  it('is a strict subset of what staff may edit', () => {
    for (const field of STORE_EDITABLE_FIELDS) expect(STAFF_EDITABLE_FIELDS).toContain(field);
    expect(STORE_EDITABLE_FIELDS.length).toBeLessThan(STAFF_EDITABLE_FIELDS.length);
  });
});

describe('shape tricks', () => {
  it('judges a dotted key by its first segment', () => {
    const { update, dropped } = pickEditableRepairFields(
      { 'tasks.0.price': 1, 'billing.mode': 'internal', 'status.x': 'y' },
      { isStaff: false },
    );
    expect(update).toEqual({ 'tasks.0.price': 1 });
    expect(dropped).toEqual(['billing.mode', 'status.x']);
  });

  it('never writes prototype keys', () => {
    const body = JSON.parse('{"__proto__": {"x": 1}, "constructor": 2, "description": "ok"}');
    const { update } = pickEditableRepairFields(body, { isStaff: true });
    expect(Object.keys(update)).toEqual(['description']);
  });

  it('handles an empty or missing body', () => {
    expect(pickEditableRepairFields(undefined)).toEqual({ update: {}, dropped: [] });
    expect(pickEditableRepairFields({}, { isStaff: true })).toEqual({ update: {}, dropped: [] });
  });
});
