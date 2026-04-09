
export const financialsBreakdown = {
  isWholesale: { type: 'boolean', default: false },
  totalCost: { type: 'number', default: 0, min: 0 },
  subtotal: { type: 'number', default: 0, min: 0 },
  rushFee: { type: 'number', default: 0, min: 0 },
  deliveryFee: { type: 'number', default: 0, min: 0 },
  taxAmount: { type: 'number', default: 0, min: 0 },
  taxRate: { type: 'number', default: 0, min: 0, max: 1 },
  includeDelivery: { type: 'boolean', default: false },
  includeTax: { type: 'boolean', default: false }
};

export const defaultFinancialsData = {
  isWholesale: false,
  totalCost: 0,
  subtotal: 0,
  rushFee: 0,
  deliveryFee: 0,
  taxAmount: 0,
  taxRate: 0,
  includeDelivery: false,
  includeTax: false
};
