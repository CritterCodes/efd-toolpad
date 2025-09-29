/**
 * Customer Service - Customer/User Related Operations
 * Constitutional Architecture: Business Logic Layer
 * Responsibility: Customer data enrichment and user lookup
 */

import DatabaseService from './DatabaseService.js';

export class CustomerService {
  /**
   * Get user by ID from users collection
   */
  static async getUserById(userID) {
    try {
      const usersCollection = DatabaseService.getUsersCollection();
      const user = await usersCollection.findOne({ userID: userID });
      
      if (!user) {
        console.warn(`User not found: ${userID}`);
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Enrich ticket with customer data
   */
  static async enrichTicketWithCustomer(ticket) {
    try {
      if (!ticket.userID) {
        return {
          ...ticket,
          customerName: 'Unknown Customer',
          customerEmail: '',
          customerPhone: '',
          customer: null
        };
      }

      const user = await this.getUserById(ticket.userID);
      
      if (!user) {
        return {
          ...ticket,
          customerName: 'Unknown Customer',
          customerEmail: '',
          customerPhone: '',
          customer: null
        };
      }

      return {
        ...ticket,
        customerName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown Customer',
        customerEmail: user.email || '',
        customerPhone: user.phoneNumber || '',
        customer: {
          userID: user.userID,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim()
        }
      };
    } catch (error) {
      console.error('Error enriching ticket with customer data:', error);
      return {
        ...ticket,
        customerName: 'Unknown Customer',
        customerEmail: '',
        customerPhone: '',
        customer: null
      };
    }
  }

  /**
   * Enrich multiple tickets with customer data
   */
  static async enrichTicketsWithCustomers(tickets) {
    try {
      if (!Array.isArray(tickets) || tickets.length === 0) {
        return tickets;
      }

      // Use Promise.all for parallel processing
      const enrichedTickets = await Promise.all(
        tickets.map(ticket => this.enrichTicketWithCustomer(ticket))
      );

      return enrichedTickets;
    } catch (error) {
      console.error('Error enriching tickets with customer data:', error);
      return tickets;
    }
  }
}

export default CustomerService;