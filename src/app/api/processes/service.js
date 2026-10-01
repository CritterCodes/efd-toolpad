import { ProcessModel } from './model.js';
import { generateProcessSku } from '@/utils/skuGenerator';
import { db } from '@/lib/database';
import { prepareProcessForSaving } from '@/utils/processes.util';
import { loadPricingContext } from '@/services/pricing/catalog';
import { processPricing } from '@/services/pricing/taskPricing';
import { VALID_SKILL_LEVELS } from '@/constants/pricing.constants.mjs';

/**
 * Process Business Logic Service
 * Handles business rules, validation, and complex operations
 */
export class ProcessService {

  /**
   * Attach each process's LIVE price (THE engine — services/pricing/taskPricing.js processPricing) and
   * drop the one stored on the document. Processes used to carry `pricing` / `metalPrices` snapshots
   * written at save time, priced with per-skill labor rates; reads showed those. If the pricing
   * settings are missing, processes still list — with no price, and the reason.
   */
  static async withLivePricing(processes = []) {
    let ctx = null;
    let unavailable = '';
    try { ctx = await loadPricingContext(); } catch (error) { unavailable = error?.message || 'Pricing did not load.'; }
    return processes.map((process) => {
      // eslint-disable-next-line no-unused-vars
      const { pricing: _stored, metalPrices: _storedByMetal, ...rest } = process;
      if (!ctx) return { ...rest, pricing: null, pricingMessage: unavailable };
      return { ...rest, ...processPricing(process, ctx) };
    });
  }

  
  /**
   * Get all processes with optional filtering
   */
  static async getAllProcesses(filters = {}) {
    try {
      const query = {};
      
      if (filters.category) query.category = filters.category;
      if (filters.skillLevel) query.skillLevel = filters.skillLevel;
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.metalType) query.metalType = filters.metalType;
      
      const processes = await ProcessModel.findAll(query);
      
      return {
        success: true,
        processes: await this.withLivePricing(processes || [])
      };
    } catch (error) {
      console.error('ProcessService.getAllProcesses error:', error);
      throw new Error('Failed to fetch processes');
    }
  }

  /**
   * Get a single process by ID
   */
  static async getProcessById(id) {
    try {
      const process = await ProcessModel.findById(id);
      
      if (!process) {
        throw new Error('Process not found');
      }
      
      const [priced] = await this.withLivePricing([process]);
      return {
        success: true,
        process: priced
      };
    } catch (error) {
      console.error('ProcessService.getProcessById error:', error);
      throw error;
    }
  }

  /**
   * Create a new process
   */
  static async createProcess(processData, userEmail) {
    try {
      // Validate required fields
      this.validateProcessData(processData);
      
      // Check for duplicate display name
      const existingProcess = await ProcessModel.findByDisplayName(processData.displayName);
      if (existingProcess) {
        throw new Error('A process with this display name already exists');
      }
      
      // Generate SKU
      const sku = generateProcessSku(processData.category, processData.skillLevel);
      
      // Only the recipe is stored — never a price (it is computed on every read).
      const processDataWithSku = { ...processData, sku };
      const processForSaving = prepareProcessForSaving(processDataWithSku);
      
      // Prepare process data
      const newProcessData = {
        ...processForSaving,
        createdBy: userEmail,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await ProcessModel.create(newProcessData);
      
      return {
        success: true,
        message: 'Process created successfully',
        processId: result.insertedId,
        process: result.process
      };
    } catch (error) {
      console.error('ProcessService.createProcess error:', error);
      throw error;
    }
  }

  /**
   * Update an existing process
   */
  static async updateProcess(id, processData, userEmail) {
    try {
      // Validate required fields
      this.validateProcessData(processData);
      
      // Check if process exists
      const existingProcess = await ProcessModel.findById(id);
      if (!existingProcess) {
        throw new Error('Process not found');
      }
      
      // Check for duplicate display name (excluding current process)
      const duplicateProcess = await ProcessModel.findByDisplayName(processData.displayName, id);
      if (duplicateProcess) {
        throw new Error('A process with this display name already exists');
      }
      
      // Only the recipe is stored — never a price (it is computed on every read).
      const processForSaving = prepareProcessForSaving(processData);
      
      // Prepare update data
      const updateData = {
        ...processForSaving,
        updatedBy: userEmail,
        updatedAt: new Date()
      };
      
      const result = await ProcessModel.updateById(id, updateData);
      
      if (result.matchedCount === 0) {
        throw new Error('Process not found');
      }
      
      return {
        success: true,
        message: 'Process updated successfully'
      };
    } catch (error) {
      console.error('ProcessService.updateProcess error:', error);
      throw error;
    }
  }

  /**
   * Delete a process
   */
  static async deleteProcess(id) {
    try {
      const result = await ProcessModel.deleteById(id);
      
      if (result.deletedCount === 0) {
        throw new Error('Process not found');
      }
      
      return {
        success: true,
        message: 'Process deleted successfully'
      };
    } catch (error) {
      console.error('ProcessService.deleteProcess error:', error);
      throw error;
    }
  }

  /**
   * Get process statistics
   */
  static async getProcessStats() {
    try {
      const stats = await ProcessModel.getStats();
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('ProcessService.getProcessStats error:', error);
      throw new Error('Failed to fetch process statistics');
    }
  }

  /**
   * Validate process data
   */
  static validateProcessData(data) {
    if (!data.displayName || !data.displayName.trim()) {
      throw new Error('Display name is required');
    }
    
    if (!data.category || !data.category.trim()) {
      throw new Error('Category is required');
    }
    
    const laborHours = parseFloat(data.laborHours);
    if (isNaN(laborHours) || laborHours < 0 || laborHours > 8) {
      throw new Error('Labor hours must be between 0 and 8');
    }
    
    // Use constants from pricing.constants to avoid duplication and enable strong type checking
    if (data.skillLevel && !VALID_SKILL_LEVELS.includes(data.skillLevel)) {
      throw new Error('Invalid skill level');
    }
  }

  /**
   * Search processes by name or description
   */
  static async searchProcesses(searchTerm) {
    try {
      await db.connect();
      const processes = await db._instance
        .collection(ProcessModel.collectionName)
        .find({
          $or: [
            { displayName: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { category: { $regex: searchTerm, $options: 'i' } }
          ]
        })
        .sort({ displayName: 1 })
        .toArray();
      
      return {
        success: true,
        processes: await this.withLivePricing(processes || [])
      };
    } catch (error) {
      console.error('ProcessService.searchProcesses error:', error);
      throw new Error('Failed to search processes');
    }
  }
}
