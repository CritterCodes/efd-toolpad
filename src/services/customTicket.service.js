import { db } from '@/lib/database';

export class CustomTicketService {
  static async fetchAll(filters = {}) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const query = {};
      
      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.type) query.type = filters.type;
      if (filters.paymentReceived !== undefined) query.paymentReceived = filters.paymentReceived;
      if (filters.cardPaymentStatus) query.cardPaymentStatus = filters.cardPaymentStatus;
      if (filters.hasShopifyOrders) {
        query.$or = [
          { shopifyDepositOrderId: { $exists: true, $ne: null } },
          { shopifyFinalOrderId: { $exists: true, $ne: null } }
        ];
      }
      
      const tickets = await collection.find(query).sort({ createdAt: -1 }).toArray();
      return tickets;
    } catch (error) {
      console.error('Error fetching custom tickets:', error);
      throw new Error('Failed to fetch custom tickets');
    }
  }

  static async create(ticketData) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const ticket = {
        ...ticketData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(ticket);
      return await collection.findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  static async fetchById(ticketId) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const ticket = await collection.findOne({ ticketID: ticketId });
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      return ticket;
    } catch (error) {
      console.error('Error fetching ticket by ID:', error);
      throw error;
    }
  }

  static async updateFinancials(ticketId, financialData) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      // Calculate auto-computed fields
      const materialTotal = financialData.materialCosts?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;
      const laborWithMarkup = (financialData.laborCost || 0) * 1.25;
      const quoteTotal = (materialTotal * 2) + 
                        (financialData.castingCost || 0) + 
                        laborWithMarkup + 
                        (financialData.shippingCost || 0) + 
                        (financialData.designFee || 100);
      
      const amountOwedToCard = materialTotal + 
                              (financialData.castingCost || 0) + 
                              (financialData.shippingCost || 0) + 
                              (financialData.laborCost || 0);

      const updateData = {
        ...financialData,
        quoteTotal,
        amountOwedToCard,
        updatedAt: new Date()
      };

      const result = await collection.updateOne(
        { ticketID: ticketId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }

      return await this.fetchById(ticketId);
    } catch (error) {
      console.error('Error updating ticket financials:', error);
      throw error;
    }
  }

  static async linkShopifyOrder(ticketId, orderType, orderId) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const fieldName = orderType === 'deposit' ? 'shopifyDepositOrderId' : 'shopifyFinalOrderId';
      
      const result = await collection.updateOne(
        { ticketID: ticketId },
        { 
          $set: { 
            [fieldName]: orderId,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }

      return await this.fetchById(ticketId);
    } catch (error) {
      console.error('Error linking Shopify order:', error);
      throw error;
    }
  }

  static async getFinancialSummary(filters = {}) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const pipeline = [
        { $match: filters },
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
            pendingDepositOrders: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$shopifyDepositOrderId', null] },
                    { $eq: ['$paymentReceived', true] }
                  ]},
                  1,
                  0
                ]
              }
            },
            pendingFinalOrders: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$shopifyFinalOrderId', null] },
                    { $ne: ['$shopifyDepositOrderId', null] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      
      if (result.length === 0) {
        return {
          totalOutstanding: 0,
          totalReimbursed: 0,
          totalQuoteValue: 0,
          pendingDepositOrders: 0,
          pendingFinalOrders: 0
        };
      }

      return result[0];
    } catch (error) {
      console.error('Error getting financial summary:', error);
      throw error;
    }
  }
}
