/**
 * Shopify Integration Controller - E-commerce Operations
 * Constitutional Architecture: Controller Layer  
 * Responsibility: HTTP request/response for Shopify operations
 */

import CustomTicketService from '../service.js';

export default class ShopifyController {
  /**
   * POST /api/custom-tickets/[ticketId]/create-deposit-order
   */
  static async createDepositOrder(ticketId, orderData) {
    try {
      // Validate required fields
      if (!orderData.amount || !orderData.customerEmail) {
        return Response.json({
          success: false,
          error: 'Amount and customer email are required'
        }, { status: 400 });
      }

      // Get ticket to ensure it exists
      const ticket = await CustomTicketService.getTicketById(ticketId);
      if (!ticket) {
        return Response.json({
          success: false,
          error: 'Ticket not found'
        }, { status: 404 });
      }

      // Create Shopify order logic would go here
      // For now, simulate the process
      const order = {
        id: `deposit-${Date.now()}`,
        ticketId: ticketId,
        type: 'deposit',
        amount: orderData.amount,
        status: 'pending',
        customerEmail: orderData.customerEmail,
        createdAt: new Date()
      };

      // Update ticket with order reference
      const updatedTicket = await CustomTicketService.updateTicket(ticketId, {
        depositOrder: order,
        depositOrderId: order.id
      });

      return Response.json({
        success: true,
        order,
        ticket: updatedTicket,
        message: 'Deposit order created successfully'
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating deposit order:', error);
      return Response.json({
        success: false,
        error: 'Failed to create deposit order'
      }, { status: 500 });
    }
  }

  /**
   * POST /api/custom-tickets/[ticketId]/create-final-order
   */
  static async createFinalOrder(ticketId, orderData) {
    try {
      // Validate required fields
      if (!orderData.amount || !orderData.customerEmail) {
        return Response.json({
          success: false,
          error: 'Amount and customer email are required'
        }, { status: 400 });
      }

      // Get ticket to ensure it exists
      const ticket = await CustomTicketService.getTicketById(ticketId);
      if (!ticket) {
        return Response.json({
          success: false,
          error: 'Ticket not found'
        }, { status: 404 });
      }

      // Create Shopify order logic would go here
      // For now, simulate the process
      const order = {
        id: `final-${Date.now()}`,
        ticketId: ticketId,
        type: 'final',
        amount: orderData.amount,
        status: 'pending',
        customerEmail: orderData.customerEmail,
        createdAt: new Date()
      };

      // Update ticket with order reference
      const updatedTicket = await CustomTicketService.updateTicket(ticketId, {
        finalOrder: order,
        finalOrderId: order.id
      });

      return Response.json({
        success: true,
        order,
        ticket: updatedTicket,
        message: 'Final order created successfully'
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating final order:', error);
      return Response.json({
        success: false,
        error: 'Failed to create final order'
      }, { status: 500 });
    }
  }

  /**
   * POST /api/custom-tickets/[ticketId]/shopify-orders/link
   */
  static async linkShopifyOrder(ticketId, orderType, orderId) {
    try {
      // Get ticket to ensure it exists
      const ticket = await CustomTicketService.getTicketById(ticketId);
      if (!ticket) {
        return Response.json({
          success: false,
          error: 'Ticket not found'
        }, { status: 404 });
      }

      // Prepare update data based on order type
      const updateData = {};
      if (orderType === 'deposit') {
        updateData.depositOrderId = orderId;
        updateData.depositOrderLinked = true;
      } else if (orderType === 'final') {
        updateData.finalOrderId = orderId;
        updateData.finalOrderLinked = true;
      } else {
        return Response.json({
          success: false,
          error: 'Invalid order type. Must be "deposit" or "final"'
        }, { status: 400 });
      }

      // Update ticket
      const updatedTicket = await CustomTicketService.updateTicket(ticketId, updateData);

      return Response.json({
        success: true,
        ticket: updatedTicket,
        message: `${orderType} order linked successfully`
      });
    } catch (error) {
      console.error('Error linking Shopify order:', error);
      return Response.json({
        success: false,
        error: 'Failed to link Shopify order'
      }, { status: 500 });
    }
  }
}