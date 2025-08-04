import { ProcessService } from './service.js';
import { auth } from '../../../../auth';

/**
 * Process Controller
 * Handles HTTP requests and responses for process operations
 */
export class ProcessController {
  
  /**
   * Handle GET requests - fetch processes
   */
  static async handleGet(request) {
    try {
      const session = await auth();
      if (!session || !session.user?.email?.includes('@')) {
        return {
          error: 'Unauthorized',
          status: 401
        };
      }

      const { searchParams } = new URL(request.url);
      const filters = {
        category: searchParams.get('category'),
        skillLevel: searchParams.get('skillLevel'),
        isActive: searchParams.get('active') !== null ? searchParams.get('active') === 'true' : undefined,
        metalType: searchParams.get('metalType'),
        search: searchParams.get('search')
      };

      // Remove null/undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined) {
          delete filters[key];
        }
      });

      let result;
      if (filters.search) {
        result = await ProcessService.searchProcesses(filters.search);
      } else {
        result = await ProcessService.getAllProcesses(filters);
      }

      return {
        ...result,
        status: 200
      };

    } catch (error) {
      console.error('ProcessController.handleGet error:', error);
      return {
        error: error.message || 'Internal server error',
        status: 500
      };
    }
  }

  /**
   * Handle POST requests - create process
   */
  static async handlePost(request) {
    try {
      const session = await auth();
      if (!session || !session.user?.email?.includes('@')) {
        return {
          error: 'Unauthorized',
          status: 401
        };
      }

      const processData = await request.json();
      const result = await ProcessService.createProcess(processData, session.user.email);

      return {
        ...result,
        status: 201
      };

    } catch (error) {
      console.error('ProcessController.handlePost error:', error);
      return {
        error: error.message || 'Internal server error',
        status: error.message.includes('already exists') ? 400 : 500
      };
    }
  }

  /**
   * Handle PUT requests - update process
   */
  static async handlePut(request) {
    try {
      const session = await auth();
      if (!session || !session.user?.email?.includes('@')) {
        return {
          error: 'Unauthorized',
          status: 401
        };
      }

      const { searchParams } = new URL(request.url);
      const processId = searchParams.get('id');

      if (!processId) {
        return {
          error: 'Process ID is required',
          status: 400
        };
      }

      const processData = await request.json();
      const result = await ProcessService.updateProcess(processId, processData, session.user.email);

      return {
        ...result,
        status: 200
      };

    } catch (error) {
      console.error('ProcessController.handlePut error:', error);
      return {
        error: error.message || 'Internal server error',
        status: error.message.includes('not found') ? 404 : 
               error.message.includes('already exists') ? 400 : 500
      };
    }
  }

  /**
   * Handle DELETE requests - delete process
   */
  static async handleDelete(request) {
    try {
      const session = await auth();
      if (!session || !session.user?.email?.includes('@')) {
        return {
          error: 'Unauthorized',
          status: 401
        };
      }

      const { searchParams } = new URL(request.url);
      const processId = searchParams.get('id');

      if (!processId) {
        return {
          error: 'Process ID is required',
          status: 400
        };
      }

      const result = await ProcessService.deleteProcess(processId);

      return {
        ...result,
        status: 200
      };

    } catch (error) {
      console.error('ProcessController.handleDelete error:', error);
      return {
        error: error.message || 'Internal server error',
        status: error.message.includes('not found') ? 404 : 500
      };
    }
  }
}
