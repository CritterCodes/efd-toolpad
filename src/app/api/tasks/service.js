/**
 * Tasks Service
 * Business logic layer for task management
 */

import { TasksModel } from './model';
import { generateTaskSku, generateShortCode } from '@/utils/skuGenerator';
import { ObjectId } from 'mongodb';

export class TasksService {
  /**
   * Get all tasks with filtering and pagination
   */
  static async getTasks(filters = {}) {
    try {
      const result = await TasksModel.getTasks(filters);
      
      // Transform tasks data if needed
      const transformedTasks = result.tasks.map(task => this.transformTaskForResponse(task));
      
      return {
        success: true,
        data: transformedTasks,
        pagination: result.pagination,
        message: `Retrieved ${transformedTasks.length} tasks`
      };
    } catch (error) {
      console.error('Service error getting tasks:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(id) {
    try {
      if (!id) {
        throw new Error('Task ID is required');
      }

      const task = await TasksModel.getTaskById(id);
      
      return {
        success: true,
        data: this.transformTaskForResponse(task),
        message: 'Task retrieved successfully'
      };
    } catch (error) {
      console.error('Service error getting task by ID:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create new task with enhanced validation
   */
  static async createTask(taskData, userEmail = null) {
    try {
      // Validate required fields
      const validation = this.validateTaskData(taskData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check for duplicate title
      const titleExists = await TasksModel.taskTitleExists(taskData.title);
      if (titleExists) {
        throw new Error('A task with this title already exists');
      }

      // Generate SKU and shortCode if not provided
      const shortCode = taskData.shortCode || generateShortCode(
        taskData.category, 
        taskData.metalType, 
        taskData.karat
      );
      const sku = taskData.sku || generateTaskSku(taskData.category, shortCode);

      // Transform and clean data with user tracking
      const cleanedData = {
        ...this.transformTaskForDatabase(taskData),
        sku,
        shortCode,
        createdBy: userEmail,
        isActive: taskData.isActive !== false
      };
      
      const task = await TasksModel.createTask(cleanedData);
      
      return {
        success: true,
        data: this.transformTaskForResponse(task),
        message: 'Task created successfully'
      };
    } catch (error) {
      console.error('Service error creating task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new process-based task with pricing calculations
   * @param {Object} taskData - Task data with processes and materials
   * @param {string} userEmail - Email of the user creating the task
   * @returns {Promise<Object>} Created task with pricing
   */
  static async createProcessBasedTask(taskData, userEmail) {
    try {
      // Validate required fields for process-based tasks
      if (!taskData.title || !taskData.category || !taskData.processes || taskData.processes.length === 0) {
        throw new Error('Missing required fields: title, category, processes');
      }

      // Check for duplicate title
      if (taskData.title) {
        const titleExists = await TasksModel.taskTitleExists(taskData.title);
        if (titleExists) {
          throw new Error(`Task with title "${taskData.title}" already exists`);
        }
      }

      // Generate SKU if needed
      if (!taskData.sku) {
        taskData.sku = generateTaskSku(taskData.category);
      }

      // Calculate process-based pricing
      const pricingData = await this.calculateProcessBasedPricing(taskData);

      // Add audit fields and pricing
      const taskWithPricing = {
        ...taskData,
        ...pricingData,
        createdBy: userEmail,
        updatedBy: userEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: taskData.isActive !== false
      };

      const task = await TasksModel.createTask(taskWithPricing);
      
      return {
        success: true,
        data: this.transformTaskForResponse(task),
        message: 'Process-based task created successfully'
      };
    } catch (error) {
      console.error('Service error creating process-based task:', error);
      throw error;
    }
  }

  /**
   * Update task with enhanced validation
   */
  static async updateTask(id, updateData, userEmail = null) {
    try {
      if (!id) {
        throw new Error('Task ID is required');
      }

      // Validate update data
      const validation = this.validateTaskData(updateData, false);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check for duplicate title (excluding current task)
      if (updateData.title) {
        const titleExists = await TasksModel.taskTitleExists(updateData.title, id);
        if (titleExists) {
          throw new Error('A task with this title already exists');
        }
      }

      // Transform and clean data with user tracking
      const cleanedData = {
        ...this.transformTaskForDatabase(updateData),
        updatedBy: userEmail
      };
      
      const task = await TasksModel.updateTask(id, cleanedData);
      
      return {
        success: true,
        data: this.transformTaskForResponse(task),
        message: 'Task updated successfully'
      };
    } catch (error) {
      console.error('Service error updating task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete task with user tracking
   */
  static async deleteTask(id, hardDelete = false, userEmail = null) {
    try {
      if (!id) {
        throw new Error('Task ID is required');
      }

      const result = await TasksModel.deleteTask(id, hardDelete, userEmail);
      
      return {
        success: true,
        data: null,
        message: result.message
      };
    } catch (error) {
      console.error('Service error deleting task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStatistics() {
    try {
      const stats = await TasksModel.getTaskStatistics();
      
      return {
        success: true,
        data: stats,
        message: 'Statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Service error getting task statistics:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Bulk update task pricing
   */
  static async bulkUpdatePricing(updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const result = await this.updateTask(update.id, { price: update.price });
        results.push(result);
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      return {
        success: true,
        data: { successful, failed, results },
        message: `Updated ${successful} tasks successfully, ${failed} failed`
      };
    } catch (error) {
      console.error('Service error in bulk update pricing:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Recalculate and update all task prices based on current admin settings
   */
  static async recalculateAllTaskPrices() {
    try {
      console.log('🔥 SERVICE - Starting bulk price recalculation');
      console.log('🔥 SERVICE - Timestamp:', new Date().toISOString());
      
      // Get all active tasks
      console.log('🔥 SERVICE - Fetching tasks from database...');
      console.log('🔥 SERVICE - Calling TasksModel.getTasks with filters:', { isActive: true });
      
      // First, let's try to get ALL tasks without filters to see if there are any tasks at all
      console.log('🔥 SERVICE - First checking if ANY tasks exist...');
      const allTasksCheck = await TasksModel.getTasks({});
      console.log('🔥 SERVICE - All tasks check result:', {
        totalFound: allTasksCheck?.tasks?.length || 0,
        paginationTotal: allTasksCheck?.pagination?.total || 0
      });
      
      const allTasksResult = await TasksModel.getTasks({ isActive: true });
      console.log('🔥 SERVICE - TasksModel.getTasks result:', {
        success: allTasksResult?.success || 'undefined',
        tasksLength: allTasksResult?.tasks?.length || 0,
        hasData: !!allTasksResult?.tasks,
        resultKeys: Object.keys(allTasksResult || {}),
        rawResult: allTasksResult
      });
      
      const tasks = allTasksResult.tasks || [];
      
      console.log(`🔥 SERVICE - Found ${tasks.length} tasks to recalculate`);
      
      if (tasks.length === 0) {
        console.log('🔥 SERVICE - No tasks found, returning early');
        return {
          success: true,
          data: { updated: 0, skipped: 0, errors: 0 },
          message: 'No tasks found to update'
        };
      }

      // Log sample task data structure
      console.log('🔥 SERVICE - Sample task structure:', {
        taskId: tasks[0]._id?.toString(),
        title: tasks[0].title,
        hasProcesses: !!tasks[0].processes,
        processesCount: tasks[0].processes?.length || 0,
        processesData: tasks[0].processes ? tasks[0].processes.slice(0, 2) : 'none',
        hasMaterials: !!tasks[0].materials,
        materialsCount: tasks[0].materials?.length || 0,
        currentBasePrice: tasks[0].basePrice,
        currentPricing: tasks[0].pricing ? Object.keys(tasks[0].pricing) : 'none'
      });

      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const updateResults = [];

      // Process each task
      console.log('🔥 SERVICE - Starting task processing loop');
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`🔥 SERVICE - Processing task ${i + 1}/${tasks.length}: ${task.title}`);
        
        try {
          // Skip tasks without processes (can't recalculate pricing)
          if (!task.processes || task.processes.length === 0) {
            console.log(`🔥 SERVICE - Skipping task ${task.title} - no processes (has: ${!!task.processes}, length: ${task.processes?.length || 0})`);
            skipped++;
            updateResults.push({
              taskId: task._id.toString(),
              title: task.title,
              reason: 'No processes found',
              success: false
            });
            continue;
          }

          console.log(`🔥 SERVICE - Task ${task.title} has ${task.processes.length} processes, proceeding with calculation`);

          // Prepare task data for price calculation
          const taskData = {
            ...task,
            pricing: null // Force recalculation
          };

          console.log(`🔥 SERVICE - Calling calculateProcessBasedPricing for task: ${task.title}`);
          // Recalculate pricing with fresh data
          const newPricingData = await this.calculateProcessBasedPricing(taskData);
          
          console.log(`🔥 SERVICE - Price calculation result for ${task.title}:`, {
            hasNewPricing: !!newPricingData,
            newBasePrice: newPricingData.basePrice,
            pricingKeys: newPricingData ? Object.keys(newPricingData) : 'none',
            retailPrice: newPricingData.pricing?.retailPrice
          });

          // Update the task with new pricing
          console.log(`🔥 SERVICE - Updating task ${task.title} in database with new pricing`);
          const updateResult = await TasksModel.updateTask(task._id, {
            ...newPricingData,
            updatedAt: new Date()
          });

          console.log(`🔥 SERVICE - Database update result for ${task.title}:`, {
            updateSuccess: !!updateResult,
            updateResultKeys: updateResult ? Object.keys(updateResult) : 'none'
          });

          console.log(`🔥 SERVICE - Successfully updated pricing for task: ${task.title}`, {
            oldPrice: task.basePrice || 0,
            newPrice: newPricingData.basePrice || 0,
            pricingChange: (newPricingData.basePrice || 0) - (task.basePrice || 0)
          });

          updated++;
          updateResults.push({
            taskId: task._id.toString(),
            title: task.title,
            oldPrice: task.basePrice || 0,
            newPrice: newPricingData.basePrice || 0,
            pricingData: newPricingData.pricing,
            success: true
          });

        } catch (error) {
          console.error(`🔥 SERVICE - Error updating task ${task.title}:`, {
            error: error.message,
            stack: error.stack?.substring(0, 500),
            taskId: task._id?.toString(),
            taskHasProcesses: !!task.processes,
            processesCount: task.processes?.length || 0
          });
          errors++;
          updateResults.push({
            taskId: task._id.toString(),
            title: task.title,
            error: error.message,
            errorStack: error.stack?.substring(0, 300),
            success: false
          });
        }
      }

      console.log(`🔥 SERVICE - Bulk price update complete:`, {
        updated,
        skipped,
        errors,
        totalTasks: tasks.length,
        successRate: tasks.length > 0 ? Math.round((updated / tasks.length) * 100) : 0
      });

      console.log(`🔥 SERVICE - Update results summary:`, {
        successfulUpdates: updateResults.filter(r => r.success).length,
        failedUpdates: updateResults.filter(r => !r.success).length,
        sampleResults: updateResults.slice(0, 3)
      });

      return {
        success: true,
        data: {
          updated,
          skipped,
          errors,
          totalTasks: tasks.length,
          updateResults
        },
        message: `Price update complete: ${updated} tasks updated, ${skipped} skipped, ${errors} errors`
      };

    } catch (error) {
      console.error('🔥 SERVICE - Critical error in bulk price recalculation:', {
        error: error.message,
        stack: error.stack?.substring(0, 500),
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error.message,
        data: { updated: 0, skipped: 0, errors: 0 }
      };
    }
  }

  /**
   * Validate task data
   */
  static validateTaskData(data, isCreate = true) {
    const errors = [];
    
    if (isCreate) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push('Title is required and must be a non-empty string');
      }
      
      if (!data.category || typeof data.category !== 'string') {
        errors.push('Category is required and must be a string');
      }
    }
    
    if (data.price !== undefined) {
      const price = parseFloat(data.price);
      if (isNaN(price) || price < 0) {
        errors.push('Price must be a valid positive number');
      }
    }
    
    if (data.laborHours !== undefined) {
      const hours = parseFloat(data.laborHours);
      if (isNaN(hours) || hours < 0) {
        errors.push('Labor hours must be a valid positive number');
      }
    }
    
    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform task data for database storage
   */
  static transformTaskForDatabase(data) {
    const cleaned = { ...data };
    
    // Convert string numbers to actual numbers
    if (cleaned.price !== undefined) {
      cleaned.price = parseFloat(cleaned.price) || 0;
    }
    
    if (cleaned.laborHours !== undefined) {
      cleaned.laborHours = parseFloat(cleaned.laborHours) || 0;
    }
    
    // Ensure boolean fields are proper booleans
    if (cleaned.isActive !== undefined) {
      cleaned.isActive = Boolean(cleaned.isActive);
    }
    
    // Trim string fields
    if (cleaned.title) cleaned.title = cleaned.title.trim();
    if (cleaned.description) cleaned.description = cleaned.description.trim();
    if (cleaned.sku) cleaned.sku = cleaned.sku.trim();
    
    return cleaned;
  }

  /**
   * Transform task data for API response
   */
  static transformTaskForResponse(task) {
    if (!task) return null;
    
    return {
      ...task,
      id: task._id?.toString(),
      // Ensure all numeric fields are numbers
      price: typeof task.price === 'number' ? task.price : parseFloat(task.price) || 0,
      laborHours: typeof task.laborHours === 'number' ? task.laborHours : parseFloat(task.laborHours) || 0,
      // Ensure boolean fields
      isActive: Boolean(task.isActive !== false), // Default to true if not explicitly false
      // Format dates
      createdAt: task.createdAt?.toISOString?.() || task.createdAt,
      updatedAt: task.updatedAt?.toISOString?.() || task.updatedAt,
      deletedAt: task.deletedAt?.toISOString?.() || task.deletedAt
    };
  }

  /**
   * Calculate process-based pricing for a task
   * @param {Object} taskData - Task data with processes and materials
   * @returns {Promise<Object>} Pricing data
   */
  static async calculateProcessBasedPricing(taskData) {
    try {
      console.log('🔥 SERVICE - Starting calculateProcessBasedPricing for task:', {
        title: taskData.title,
        processesCount: taskData.processes?.length || 0,
        materialsCount: taskData.materials?.length || 0,
        hasFrontendPricing: !!taskData.pricing,
        forceRecalculation: taskData.pricing === null,
        taskId: taskData._id?.toString()
      });

      // If the frontend already calculated pricing and sent it, use that (unless forced to recalculate)
      if (taskData.pricing && taskData.pricing.retailPrice > 0 && taskData.pricing !== null) {
        console.log('🔥 SERVICE - Using frontend-calculated pricing for task:', taskData.title, taskData.pricing);
        return {
          pricing: {
            totalLaborHours: taskData.pricing.totalLaborHours || 0,
            totalProcessCost: taskData.pricing.totalProcessCost || 0,
            totalMaterialCost: taskData.pricing.totalMaterialCost || 0,
            markedUpMaterialCost: taskData.pricing.markedUpMaterialCost || 0,
            baseCost: taskData.pricing.baseCost || 0,
            retailPrice: taskData.pricing.retailPrice || 0,
            wholesalePrice: taskData.pricing.wholesalePrice || 0,
            businessMultiplier: taskData.pricing.businessMultiplier || 1,
            calculatedAt: new Date().toISOString()
          },
          basePrice: taskData.pricing.retailPrice || 0,
          laborHours: taskData.pricing.totalLaborHours || 0
        };
      }

      // For recalculation or new tasks without frontend pricing, calculate from scratch
      console.log('🔥 SERVICE - Performing backend price calculation for task:', taskData.title);
      
      if (!taskData.processes || taskData.processes.length === 0) {
        console.log('🔥 SERVICE - No processes found for task:', taskData.title, ', returning zero pricing');
        return this.getDefaultPricing();
      }

      // Fetch admin settings for current pricing parameters
      console.log('🔥 SERVICE - Fetching admin settings from database...');
      const { db } = await import('@/lib/database');
      await db.connect();
      console.log('🔥 SERVICE - Database connected, fetching admin settings...');
      
      const adminCollection = db._instance.collection('adminSettings');
      const adminSettings = await adminCollection.findOne({ _id: 'repair_task_admin_settings' });

      console.log('🔥 SERVICE - Admin settings fetched:', {
        hasSettings: !!adminSettings,
        hasPricing: !!adminSettings?.pricing,
        wage: adminSettings?.pricing?.wage,
        materialMarkup: adminSettings?.pricing?.materialMarkup,
        settingsKeys: adminSettings ? Object.keys(adminSettings) : 'none',
        pricingKeys: adminSettings?.pricing ? Object.keys(adminSettings.pricing) : 'none'
      });

      if (!adminSettings || !adminSettings.pricing) {
        console.log('🔥 SERVICE - No admin settings found for task:', taskData.title, ', using defaults');
        return this.getDefaultPricing();
      }

      // Calculate pricing from processes
      let totalLaborHours = 0;
      let totalProcessCost = 0;
      let processMaterialCost = 0;

      console.log('🔥 SERVICE - Starting process calculations...');
      
      // Fetch process details for pricing calculations
      const processesCollection = db._instance.collection('processes');
      console.log(`🔥 SERVICE - Processing ${taskData.processes.length} processes for task:`, taskData.title);
      
      for (let i = 0; i < taskData.processes.length; i++) {
        const processSelection = taskData.processes[i];
        console.log(`🔥 SERVICE - Processing process ${i + 1}/${taskData.processes.length}:`, {
          hasProcessId: !!processSelection.processId,
          hasProcess: !!processSelection.process,
          hasProcessObjectId: !!processSelection.process?._id,
          quantity: processSelection.quantity
        });
        
        try {
          const quantity = processSelection.quantity || 1;
          
          // Fetch process data from database
          const processId = processSelection.processId || processSelection.process?._id;
          console.log(`🔥 SERVICE - Looking up process by ID:`, processId?.toString());
          
          let processQuery;
          try {
            // Handle both ObjectId and string formats
            if (typeof processId === 'string' && processId.length === 24) {
              processQuery = { _id: new ObjectId(processId) };
            } else if (processId && processId.constructor && processId.constructor.name === 'ObjectId') {
              processQuery = { _id: processId };
            } else {
              console.warn('🔥 SERVICE - Invalid process ID format:', processId, typeof processId);
              continue;
            }
          } catch (error) {
            console.error('🔥 SERVICE - Error creating process query:', error);
            continue;
          }
          
          const process = await processesCollection.findOne(processQuery);
          
          console.log(`🔥 SERVICE - Process lookup result:`, {
            query: processQuery,
            found: !!process,
            processName: process?.displayName || 'unknown',
            laborHours: process?.laborHours,
            skillLevel: process?.skillLevel,
            hasMaterials: !!process?.materials,
            materialsCount: process?.materials?.length || 0
          });
          
          if (!process) {
            console.warn('🔥 SERVICE - Process not found for ID:', processId?.toString());
            continue;
          }

          // Calculate labor hours
          const laborHours = (process.laborHours || 0) * quantity;
          totalLaborHours += laborHours;
          console.log(`🔥 SERVICE - Added labor hours: ${laborHours} (${process.laborHours} × ${quantity}), total now: ${totalLaborHours}`);

          // Calculate process cost using admin settings
          const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
          const skillMultiplier = skillMultipliers[process.skillLevel] || 1.0;
          const hourlyRate = (adminSettings.pricing.wage || 30) * skillMultiplier;
          const laborCost = laborHours * hourlyRate;

          console.log(`🔥 SERVICE - Labor cost calculation:`, {
            skillLevel: process.skillLevel,
            skillMultiplier,
            baseWage: adminSettings.pricing.wage,
            hourlyRate,
            laborHours,
            laborCost
          });

          // Calculate process material costs
          let processMatCost = 0;
          if (process.materials && process.materials.length > 0) {
            const rawMatCost = process.materials.reduce((total, material) => {
              const cost = material.estimatedCost || 0;
              console.log(`🔥 SERVICE - Process material: ${material.name || 'unknown'}, cost: ${cost}`);
              return total + cost;
            }, 0);
            processMatCost = rawMatCost * (adminSettings.pricing.materialMarkup || 1.5);
            console.log(`🔥 SERVICE - Process materials: raw cost ${rawMatCost}, marked up to ${processMatCost}`);
          }

          // Apply metal complexity multiplier
          const complexityMultiplier = process.metalComplexityMultiplier || 1.0;
          const processTotal = (laborCost + processMatCost) * complexityMultiplier * quantity;
          
          totalProcessCost += processTotal;
          processMaterialCost += processMatCost * quantity;

          console.log('🔥 SERVICE - Process cost breakdown:', {
            processName: process.displayName,
            laborHours,
            hourlyRate,
            laborCost,
            processMatCost,
            complexityMultiplier,
            quantity,
            processTotal,
            runningTotalProcessCost: totalProcessCost,
            runningProcessMaterialCost: processMaterialCost
          });

        } catch (error) {
          console.error('🔥 SERVICE - Error calculating process cost:', {
            error: error.message,
            stack: error.stack?.substring(0, 300),
            processIndex: i,
            processSelection
          });
        }
      }

      // Calculate task material costs
      let taskMaterialCost = 0;
      console.log('🔥 SERVICE - Starting task materials calculation...');
      
      if (taskData.materials && taskData.materials.length > 0) {
        // Use the materials collection (no longer repairMaterials)
        const materialsCollection = db._instance.collection('materials');
        console.log(`🔥 SERVICE - Processing ${taskData.materials.length} task materials`);
        
        for (let i = 0; i < taskData.materials.length; i++) {
          const materialSelection = taskData.materials[i];
          try {
            const quantity = materialSelection.quantity || 1;
            const materialId = materialSelection.materialId || materialSelection.material?._id;
            
            let materialQuery;
            try {
              // Handle both ObjectId and string formats
              if (typeof materialId === 'string' && materialId.length === 24) {
                materialQuery = { _id: new ObjectId(materialId) };
              } else if (materialId && materialId.constructor && materialId.constructor.name === 'ObjectId') {
                materialQuery = { _id: materialId };
              } else {
                console.warn('🔥 SERVICE - Invalid material ID format:', materialId, typeof materialId);
                continue;
              }
            } catch (error) {
              console.error('🔥 SERVICE - Error creating material query:', error);
              continue;
            }
            
            const material = await materialsCollection.findOne(materialQuery);
            
            if (material) {
              const unitCost = material.unitCost || material.costPerPortion || 0;
              const materialCost = unitCost * quantity;
              taskMaterialCost += materialCost;
              console.log(`🔥 SERVICE - Task material: ${material.name}, unit cost: ${unitCost}, quantity: ${quantity}, total: ${materialCost}`);
            } else {
              console.warn('🔥 SERVICE - Task material not found:', materialId?.toString());
            }
          } catch (error) {
            console.error('🔥 SERVICE - Error fetching task material:', {
              error: error.message,
              materialIndex: i,
              materialSelection
            });
          }
        }
      } else {
        console.log('🔥 SERVICE - No task materials to process');
      }

      // Apply business formula
      console.log('🔥 SERVICE - Applying business formula...');
      const materialMarkup = adminSettings.pricing.materialMarkup || 1.5;
      const markedUpTaskMaterials = taskMaterialCost * materialMarkup;
      const baseCost = totalProcessCost + markedUpTaskMaterials;
      
      const businessMultiplier = (
        (adminSettings.pricing.administrativeFee || 0) + 
        (adminSettings.pricing.businessFee || 0) + 
        (adminSettings.pricing.consumablesFee || 0) + 1
      );
      
      const retailPrice = Math.round(baseCost * businessMultiplier * 100) / 100;
      const wholesalePrice = Math.round(retailPrice * 0.5 * 100) / 100;

      console.log('🔥 SERVICE - Business formula breakdown:', {
        totalProcessCost,
        taskMaterialCost,
        materialMarkup,
        markedUpTaskMaterials,
        baseCost,
        administrativeFee: adminSettings.pricing.administrativeFee,
        businessFee: adminSettings.pricing.businessFee,
        consumablesFee: adminSettings.pricing.consumablesFee,
        businessMultiplier,
        retailPrice,
        wholesalePrice
      });

      const calculatedPricing = {
        totalLaborHours: Math.round(totalLaborHours * 100) / 100,
        totalProcessCost: Math.round(totalProcessCost * 100) / 100,
        totalMaterialCost: Math.round((processMaterialCost + taskMaterialCost) * 100) / 100,
        markedUpMaterialCost: Math.round((processMaterialCost + markedUpTaskMaterials) * 100) / 100,
        baseCost: Math.round(baseCost * 100) / 100,
        retailPrice: retailPrice,
        wholesalePrice: wholesalePrice,
        businessMultiplier: Math.round(businessMultiplier * 100) / 100,
        calculatedAt: new Date().toISOString()
      };

      console.log('🔥 SERVICE - Final calculated pricing for task:', taskData.title, calculatedPricing);

      const result = {
        pricing: calculatedPricing,
        basePrice: retailPrice,
        laborHours: totalLaborHours
      };

      console.log('🔥 SERVICE - Returning pricing result:', result);
      return result;

    } catch (error) {
      console.error('🔥 SERVICE - Critical error in calculateProcessBasedPricing:', {
        taskTitle: taskData?.title,
        taskId: taskData?._id?.toString(),
        error: error.message,
        stack: error.stack?.substring(0, 500)
      });
      return this.getDefaultPricing();
    }
  }

  /**
   * Get default pricing structure
   */
  static getDefaultPricing() {
    return {
      pricing: {
        totalLaborHours: 0,
        totalProcessCost: 0,
        totalMaterialCost: 0,
        baseCost: 0,
        retailPrice: 0,
        wholesalePrice: 0,
        calculatedAt: new Date().toISOString()
      },
      basePrice: 0,
      laborHours: 0
    };
  }
}
