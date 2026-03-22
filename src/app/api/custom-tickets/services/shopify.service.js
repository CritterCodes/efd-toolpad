import { getCustomTicketsAdapter } from '@/api-clients/customTicketsMicroserviceAdapter.js';
import CustomTicketModel from '../model.js';
import { db } from '@/lib/database';

const adapter = getCustomTicketsAdapter({
  mode: process.env.MICROSERVICE_MODE || 'embedded'
});

let adapterInitialized = false;
export const ensureAdapterInitialized = async () => {
  if (!adapterInitialized) {
    await adapter.initializeEmbeddedService();
    adapterInitialized = true;
  }
};

export class ShopifyService {
  static async linkShopifyOrder(ticketId, orderType, orderId) {
      try {
        const result = await adapter.linkShopifyOrder(ticketId, orderType, orderId);
        return result.ticket;
        
      } catch (error) {
        console.error('CustomTicketService.linkShopifyOrder error:', error);
        throw error;
      }
    }

  static async createDepositOrder(ticketId, orderData) {
      try {
        await CustomTicketModel.validateTicketId(ticketId);
        await CustomTicketModel.validateOrderData(orderData);
  
        const adapter = getCustomTicketsAdapter();
        const result = await adapter.createDepositOrder(ticketId, orderData);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create deposit order');
        }
  
        return result;
      } catch (error) {
        console.error('CustomTicketService.createDepositOrder error:', error);
        throw new Error(error.message);
      }
    }

  static async createFinalOrder(ticketId, orderData) {
      try {
        await CustomTicketModel.validateTicketId(ticketId);
        await CustomTicketModel.validateOrderData(orderData);
  
        const adapter = getCustomTicketsAdapter();
        const result = await adapter.createFinalOrder(ticketId, orderData);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create final order');
        }
  
        return result;
      } catch (error) {
        console.error('CustomTicketService.createFinalOrder error:', error);
        throw new Error(error.message);
      }
    }

}
