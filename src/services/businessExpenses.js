export const BUSINESS_EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Software',
  'Merchant Fees',
  'Shipping',
  'Supplies',
  'Tools / Equipment',
  'Materials / Parts',
  'Insurance',
  'Contractor / Subcontractor',
  'Professional Services',
  'Advertising / Marketing',
  'Travel / Vehicle',
  'Miscellaneous',
];

export const BUSINESS_EXPENSE_PAYMENT_METHODS = [
  'cash',
  'zelle',
  'check',
  'credit_card',
  'bank_transfer',
  'other',
];

export const BUSINESS_EXPENSE_STATUS = {
  PAID: 'paid',
  SCHEDULED: 'scheduled',
  PLANNED: 'planned',
};

export function normalizeBusinessExpenseCategory(category = '') {
  return BUSINESS_EXPENSE_CATEGORIES.includes(category) ? category : 'Miscellaneous';
}

export function normalizeBusinessExpenseStatus(status = '') {
  if (status === BUSINESS_EXPENSE_STATUS.SCHEDULED) {
    return BUSINESS_EXPENSE_STATUS.SCHEDULED;
  }
  if (status === BUSINESS_EXPENSE_STATUS.PLANNED) {
    return BUSINESS_EXPENSE_STATUS.PLANNED;
  }
  return BUSINESS_EXPENSE_STATUS.PAID;
}
