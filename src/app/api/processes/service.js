import { ProcessModel } from './model.js';
import { generateProcessSku } from '@/utils/skuGenerator';
import { db } from '@/lib/database';

/**
 * Process Business Logic Service
 * Handles business rules, validation, and complex operations
 */
export class ProcessService {
  
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
        processes: processes || []
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
      
      return {
        success: true,
        process
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
      
      // Get admin settings for pricing
      const adminSettings = await this.getAdminSettings();
      
      // Generate SKU
      const sku = generateProcessSku(processData.category, processData.skillLevel);
      
      // Calculate pricing
      const pricing = this.calculateProcessPricing(processData, adminSettings);
      
      // Prepare process data
      const newProcessData = {
        sku,
        displayName: processData.displayName.trim(),
        category: processData.category.toLowerCase(),
        laborHours: parseFloat(processData.laborHours) || 0,
        skillLevel: processData.skillLevel || 'standard',
        metalType: processData.metalType || '',
        karat: processData.karat || '',
        metalComplexityMultiplier: parseFloat(processData.metalComplexityMultiplier) || 1.0,
        description: processData.description || '',
        materials: processData.materials || [],
        pricing,
        isActive: true,
        createdBy: userEmail
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
      
      // Get admin settings for pricing
      const adminSettings = await this.getAdminSettings();
      
      // Calculate updated pricing
      const pricing = this.calculateProcessPricing(processData, adminSettings);
      
      // Prepare update data
      const updateData = {
        displayName: processData.displayName.trim(),
        category: processData.category.toLowerCase(),
        laborHours: parseFloat(processData.laborHours) || 0,
        skillLevel: processData.skillLevel || 'standard',
        metalType: processData.metalType || '',
        karat: processData.karat || '',
        metalComplexityMultiplier: parseFloat(processData.metalComplexityMultiplier) || 1.0,
        description: processData.description || '',
        materials: processData.materials || [],
        pricing,
        updatedBy: userEmail
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
    
    const validSkillLevels = ['basic', 'standard', 'advanced', 'expert'];
    if (data.skillLevel && !validSkillLevels.includes(data.skillLevel)) {
      throw new Error('Invalid skill level');
    }
  }

  /**
   * Calculate process pricing
   */
  static calculateProcessPricing(processData, adminSettings) {
    const laborHours = parseFloat(processData.laborHours) || 0;
    const baseWage = adminSettings.pricing?.wage || 30;
    const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
    const hourlyRate = baseWage * (skillMultipliers[processData.skillLevel] || 1.0);
    const laborCost = laborHours * hourlyRate;

    // Calculate materials cost
    const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
    const baseMaterialsCost = (processData.materials || []).reduce((total, material) => {
      return total + (material.estimatedCost || 0);
    }, 0);
    const materialsCost = baseMaterialsCost * materialMarkup;

    // Apply metal complexity multiplier
    const multiplier = parseFloat(processData.metalComplexityMultiplier) || 1.0;
    const totalCost = (laborCost + materialsCost) * multiplier;

    return {
      laborCost: Math.round(laborCost * 100) / 100,
      baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
      materialsCost: Math.round(materialsCost * 100) / 100,
      materialMarkup: materialMarkup,
      totalCost: Math.round(totalCost * 100) / 100,
      hourlyRate: hourlyRate,
      calculatedAt: new Date()
    };
  }

  /**
   * Get admin settings
   */
  static async getAdminSettings() {
    await db.connect();
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({});
    
    if (!adminSettings?.pricing) {
      throw new Error('Admin pricing settings not configured');
    }
    
    return adminSettings;
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
        processes: processes || []
      };
    } catch (error) {
      console.error('ProcessService.searchProcesses error:', error);
      throw new Error('Failed to search processes');
    }
  }
}
