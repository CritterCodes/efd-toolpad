/**
 * Custom Tickets Service - HTTP layer for custom tickets
 * Handles API requests and response formatting - NO business logic
 */

export class CustomTicketsService {
  static async fetchCustomTickets(filters = {}) {
    try {
      const queryParams = this.buildQueryParams(filters);
      const response = await fetch(`/api/custom-tickets?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Return API response directly (business logic applied in API layer)
      return {
        success: data.success,
        tickets: data.tickets || [],
        totalCount: data.totalCount || 0,
        pagination: data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching custom tickets:', error);
      return {
        success: false,
        error: error.message,
        tickets: [],
        totalCount: 0
      };
    }
  }

  static async fetchCustomTicketById(id) {
    try {
      const response = await fetch(`/api/custom-tickets/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: data.success,
        ticket: data.ticket || null
      };
    } catch (error) {
      console.error('Error fetching custom ticket:', error);
      return {
        success: false,
        error: error.message,
        ticket: null
      };
    }
  }

  static async updateTicketStatus(id, newStatus) {
    try {
      const response = await fetch(`/api/custom-tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: data.success,
        ticket: data.ticket
      };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async createCustomTicket(ticketData) {
    try {
      const response = await fetch('/api/custom-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: data.success,
        ticket: data.ticket
      };
    } catch (error) {
      console.error('Error creating custom ticket:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async updateCustomTicket(id, ticketData) {
    try {
      const response = await fetch(`/api/custom-tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: data.success,
        ticket: data.ticket
      };
    } catch (error) {
      console.error('Error updating custom ticket:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async deleteCustomTicket(id) {
    try {
      const response = await fetch(`/api/custom-tickets/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting custom ticket:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async uploadTicketAttachment(ticketId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticketId', ticketId);
      
      const response = await fetch('/api/custom-tickets/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        attachment: data.attachment
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods for query parameter building
  static buildQueryParams(filters) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(key, item));
        } else {
          params.set(key, value);
        }
      }
    });
    
    return params.toString();
  }
}

export default CustomTicketsService;