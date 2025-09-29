/**
 * Custom Ticket API Client - Frontend HTTP Communication
 * Constitutional Architecture: API Client Layer
 * Responsibility: HTTP requests only, NO business logic
 */

export class CustomTicketAPIClient {
  static baseURL = '/api/custom-tickets';

  /**
   * Fetch all custom tickets with filters
   */
  static async fetchAll(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const url = params.toString() ? `${this.baseURL}?${params}` : this.baseURL;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.fetchAll error:', error);
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }
  }

  /**
   * Fetch single ticket by ID
   */
  static async fetchById(ticketId) {
    try {
      const response = await fetch(`${this.baseURL}/${ticketId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Ticket not found');
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.fetchById error:', error);
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }
  }

  /**
   * Create new custom ticket
   */
  static async create(ticketData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.create error:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }
  }

  /**
   * Update existing ticket
   */
  static async update(ticketId, updateData) {
    try {
      console.log('🔄 CustomTicketAPIClient.update - Request details:', {
        ticketId,
        updateData,
        url: `${this.baseURL}/${ticketId}`,
        dataKeys: Object.keys(updateData),
        centerstone: updateData.centerstone,
        stringifiedData: JSON.stringify(updateData, null, 2)
      });

      const response = await fetch(`${this.baseURL}/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('🔄 CustomTicketAPIClient.update - Response status:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Ticket not found');
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('✅ CustomTicketAPIClient.update - Response data:', {
        success: result.success,
        ticket: result.ticket,
        hasTicket: !!result.ticket,
        ticketKeys: result.ticket ? Object.keys(result.ticket) : []
      });

      return result;
    } catch (error) {
      console.error('❌ CustomTicketAPIClient.update error:', error);
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  }

  /**
   * Update ticket status
   */
  static async updateStatus(ticketId, status, metadata = {}) {
    try {
      const response = await fetch(`${this.baseURL}/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, metadata }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Ticket not found');
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.updateStatus error:', error);
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Delete ticket
   */
  static async delete(ticketId) {
    try {
      const response = await fetch(`${this.baseURL}/${ticketId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Ticket not found');
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.delete error:', error);
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  }

  /**
   * Fetch tickets summary statistics
   */
  static async fetchSummary() {
    try {
      const response = await fetch(`${this.baseURL}/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.fetchSummary error:', error);
      throw new Error(`Failed to fetch summary: ${error.message}`);
    }
  }

  /**
   * Create Shopify deposit order
   */
  static async createDepositOrder(ticketId, orderData) {
    try {
      const response = await fetch(`${this.baseURL}/${ticketId}/create-deposit-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.createDepositOrder error:', error);
      throw new Error(`Failed to create deposit order: ${error.message}`);
    }
  }

  /**
   * Create Shopify final order
   */
  static async createFinalOrder(ticketId, orderData) {
    try {
      const response = await fetch(`${this.baseURL}/${ticketId}/create-final-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CustomTicketAPIClient.createFinalOrder error:', error);
      throw new Error(`Failed to create final order: ${error.message}`);
    }
  }
}

export default CustomTicketAPIClient;