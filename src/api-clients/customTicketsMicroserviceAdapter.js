/**
 * Microservice Integration Adapter
 * Provides interface between main application and custom tickets microservice
 * Handles local embedded service and remote API communication
 */

// Simple console logger for main app
const logger = {
  info: (message, meta = {}) => console.log(`INFO: ${message}`, meta),
  error: (message, meta = {}) => console.error(`ERROR: ${message}`, meta),
  warn: (message, meta = {}) => console.warn(`WARN: ${message}`, meta)
};

class CustomTicketsMicroserviceAdapter {
  constructor(options = {}) {
    this.mode = options.mode || (process.env.MICROSERVICE_MODE || 'embedded'); // Default to embedded mode
    this.baseUrl = options.baseUrl || process.env.CUSTOM_TICKETS_SERVICE_URL || 'http://localhost:3002';
    this.timeout = options.timeout || 5000;
    
    // For embedded mode, import service directly (only initialize on explicit request)
    if (this.mode === 'embedded') {
      this.initializeEmbeddedService();
    }
  }

  async initializeEmbeddedService() {
    try {
      // Only import when actually needed to avoid build-time dependency issues
      if (typeof window === 'undefined') { // Server-side only
        const { CustomTicketService } = await import('../../microservices/custom-tickets-service/src/services/CustomTicketService.js');
        await CustomTicketService.initializeDatabase();
        this.embeddedService = CustomTicketService;
        logger.info('Custom Tickets microservice initialized in embedded mode');
      }
    } catch (error) {
      logger.error('Failed to initialize embedded custom tickets service:', error);
      // Fallback to API mode
      this.mode = 'api';
      logger.info('Switched to API mode due to embedded service initialization failure');
    }
  }

  async makeApiRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error(`Microservice API request failed: ${url}`, error);
      
      // Auto-fallback to embedded mode on connection errors
      if (error.cause?.code === 'ECONNREFUSED' || error.name === 'AbortError') {
        logger.warn(`API connection failed, attempting fallback to embedded mode...`);
        
        // Switch to embedded mode and retry the operation
        if (this.mode !== 'embedded') {
          this.mode = 'embedded';
          await this.initializeEmbeddedService();
          
          // Retry with embedded service if it's now available
          if (this.embeddedService) {
            logger.info(`Successfully switched to embedded mode, retrying operation...`);
            // Let the calling method handle the embedded logic
            throw new Error('FALLBACK_TO_EMBEDDED');
          } else {
            logger.error(`Failed to initialize embedded service during fallback`);
            // In production, return a more specific error for graceful handling
            throw new Error('CUSTOM_TICKETS_SERVICE_UNAVAILABLE');
          }
        } else {
          // Already in embedded mode, but still failed - check if service exists
          if (this.embeddedService) {
            logger.info(`Already in embedded mode, signaling fallback...`);
            throw new Error('FALLBACK_TO_EMBEDDED');
          } else {
            logger.error(`In embedded mode but no embedded service available`);
            // Try to reinitialize the embedded service
            await this.initializeEmbeddedService();
            if (this.embeddedService) {
              throw new Error('FALLBACK_TO_EMBEDDED');
            } else {
              throw new Error('CUSTOM_TICKETS_SERVICE_UNAVAILABLE');
            }
          }
        }
      }
      
      throw error;
    }
  }

  async getAllTickets(filters = {}) {
    if (this.mode === 'embedded' && this.embeddedService) {
      return await this.embeddedService.getAllTickets(filters);
    }

    try {
      const queryParams = new URLSearchParams(filters);
      return await this.makeApiRequest(`/api/tickets?${queryParams}`);
    } catch (error) {
      // Handle fallback to embedded mode
      if (error.message === 'FALLBACK_TO_EMBEDDED' && this.embeddedService) {
        logger.info(`Using embedded service for getAllTickets fallback`);
        return await this.embeddedService.getAllTickets(filters);
      }
      
      // Production fallback: return empty result if service unavailable
      if (error.message === 'CUSTOM_TICKETS_SERVICE_UNAVAILABLE' || process.env.NODE_ENV === 'production') {
        logger.warn('Custom tickets service unavailable in production, returning empty result');
        return {
          tickets: [],
          totalCount: 0,
          pagination: {
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }
      
      throw error;
    }
  }

  async getTicketById(id) {
    if (this.mode === 'embedded' && this.embeddedService) {
      return await this.embeddedService.getTicketById(id);
    }

    return await this.makeApiRequest(`/api/tickets/${id}`);
  }

  async createTicket(ticketData) {
    if (this.mode === 'embedded' && this.embeddedService) {
      return await this.embeddedService.createTicket(ticketData);
    }

    return await this.makeApiRequest('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  }

  async updateTicket(id, updateData) {
    console.log('🔄 CustomTicketsMicroserviceAdapter.updateTicket - Starting:', {
      id,
      updateData,
      dataKeys: Object.keys(updateData),
      centerstone: updateData.centerstone,
      mode: this.mode,
      hasEmbeddedService: !!this.embeddedService
    });

    if (this.mode === 'embedded' && this.embeddedService) {
      console.log('🔄 Using embedded service directly');
      const embeddedResult = await this.embeddedService.updateTicket(id, updateData);
      console.log('✅ Embedded service result:', {
        embeddedResult,
        hasResult: !!embeddedResult,
        resultKeys: embeddedResult ? Object.keys(embeddedResult) : []
      });
      
      // Normalize embedded service response to match API format
      return {
        success: true,
        ticket: embeddedResult
      };
    }

    try {
      console.log('🔄 Attempting API request');
      return await this.makeApiRequest(`/api/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    } catch (error) {
      console.log('❌ API request failed:', error.message);
      logger.info(`updateTicket caught error: ${error.message}`);
      
      // Handle fallback to embedded mode
      if (error.message === 'FALLBACK_TO_EMBEDDED') {
        // Ensure embedded service is available
        if (!this.embeddedService) {
          console.log('🔄 Initializing embedded service for fallback');
          await this.initializeEmbeddedService();
        }
        
        if (this.embeddedService) {
          console.log('🔄 Using embedded service for fallback');
          logger.info(`Using embedded service for updateTicket fallback`);
          const embeddedResult = await this.embeddedService.updateTicket(id, updateData);
          console.log('✅ Embedded fallback result:', {
            embeddedResult,
            hasResult: !!embeddedResult,
            resultKeys: embeddedResult ? Object.keys(embeddedResult) : []
          });
          
          // Normalize embedded service response to match API format
          return {
            success: true,
            ticket: embeddedResult
          };
        } else {
          console.log('❌ Embedded service not available for fallback');
          logger.error(`Embedded service not available for fallback`);
        }
      }
      
      // Handle direct connection errors - attempt embedded fallback
      if ((error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed'))) {
        console.log('🔄 Connection failed, trying embedded service directly');
        logger.info(`Connection failed, trying embedded service directly for updateTicket`);
        
        // Ensure we're in embedded mode and service is initialized
        this.mode = 'embedded';
        if (!this.embeddedService) {
          console.log('🔄 Initializing embedded service for direct fallback');
          await this.initializeEmbeddedService();
        }
        
        if (this.embeddedService) {
          console.log('🔄 Using embedded service for direct connection fallback');
          const embeddedResult = await this.embeddedService.updateTicket(id, updateData);
          console.log('✅ Direct embedded fallback result:', {
            embeddedResult,
            hasResult: !!embeddedResult,
            resultKeys: embeddedResult ? Object.keys(embeddedResult) : []
          });
          
          // Normalize embedded service response to match API format
          return {
            success: true,
            ticket: embeddedResult
          };
        } else {
          console.log('❌ Could not initialize embedded service for direct fallback');
          logger.error(`Could not initialize embedded service for direct fallback`);
        }
      }
      
      throw error;
    }
  }

  async updateTicketStatus(id, status, metadata = {}) {
    if (this.mode === 'embedded' && this.embeddedService) {
      return await this.embeddedService.updateTicketStatus(id, status, metadata);
    }

    try {
      return await this.makeApiRequest(`/api/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, metadata }),
      });
    } catch (error) {
      // Handle fallback to embedded mode
      if (error.message === 'FALLBACK_TO_EMBEDDED' && this.embeddedService) {
        logger.info(`Using embedded service for updateTicketStatus fallback`);
        return await this.embeddedService.updateTicketStatus(id, status, metadata);
      }
      throw error;
    }
  }

  async deleteTicket(id) {
    if (this.mode === 'embedded' && this.embeddedService) {
      return await this.embeddedService.deleteTicket(id);
    }

    return await this.makeApiRequest(`/api/tickets/${id}`, {
      method: 'DELETE',
    });
  }

  async getTicketsSummary() {
    if (this.mode === 'embedded' && this.embeddedService) {
      return await this.embeddedService.getTicketsSummary();
    }

    try {
      return await this.makeApiRequest('/api/tickets/stats/summary');
    } catch (error) {
      // Handle fallback to embedded mode
      if (error.message === 'FALLBACK_TO_EMBEDDED' && this.embeddedService) {
        logger.info(`Using embedded service for getTicketsSummary fallback`);
        return await this.embeddedService.getTicketsSummary();
      }
      
      // Production fallback: return empty summary if service unavailable
      if (error.message === 'CUSTOM_TICKETS_SERVICE_UNAVAILABLE' || process.env.NODE_ENV === 'production') {
        logger.warn('Custom tickets service unavailable in production, returning empty summary');
        return {
          totalTickets: 0,
          pendingTickets: 0,
          completedTickets: 0,
          totalRevenue: 0,
          averageTicketValue: 0,
          statusBreakdown: {},
          monthlyStats: []
        };
      }
      
      throw error;
    }
  }

  async healthCheck() {
    if (this.mode === 'embedded') {
      return { status: 'healthy', mode: 'embedded' };
    }

    try {
      const result = await this.makeApiRequest('/health');
      return { ...result, mode: 'api' };
    } catch (error) {
      return { status: 'unhealthy', mode: 'api', error: error.message };
    }
  }

  getMode() {
    return this.mode;
  }

  async switchMode(newMode) {
    if (newMode === this.mode) return;

    this.mode = newMode;
    if (newMode === 'embedded') {
      await this.initializeEmbeddedService();
    }

    logger.info(`Custom Tickets microservice switched to ${newMode} mode`);
  }
}

// Singleton instance
let adapterInstance = null;

export function getCustomTicketsAdapter(options = {}) {
  if (!adapterInstance) {
    adapterInstance = new CustomTicketsMicroserviceAdapter(options);
  }
  return adapterInstance;
}

export { CustomTicketsMicroserviceAdapter };
export default getCustomTicketsAdapter;