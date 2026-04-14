export function buildDatabaseQuery(filters) {
  const query = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.paymentReceived !== undefined) {
    query.paymentReceived = filters.paymentReceived;
  }
  if (filters.cardPaymentStatus) {
    query.cardPaymentStatus = filters.cardPaymentStatus;
  }
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }
  
  return query;
}

export function buildFinancialSummaryPipeline(query) {
  return [
    { $match: query },
    {
      $group: {
        _id: null,
        totalOutstanding: {
          $sum: {
            $subtract: ['$amountOwedToCard', { $ifNull: ['$amountPaidToCard', 0] }]
          }
        },
        totalReimbursed: { $sum: { $ifNull: ['$amountPaidToCard', 0] } },
        totalQuoteValue: { $sum: { $ifNull: ['$quoteTotal', 0] } },
        pendingInvoices: {
          $sum: {
            $cond: [
              { $eq: ['$paymentReceived', true] },
              1,
              0
            ]
          }
        }
      }
    }
  ];
}
