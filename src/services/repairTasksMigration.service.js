/**
 * RepairTasks to Tasks Migration Service
 * Handles the migration of data from the old repairTasks system to the new tasks MVC system
 */

import { db } from '@/lib/database';
import RepairTasksDatabaseService from '@/services/repairTasksDatabase.service';
import { TasksService } from '@/app/api/tasks/service';

export class RepairTasksMigrationService {
  
  /**
   * Get migration status and statistics
   */
  static async getMigrationStatus() {
    try {
      await db.connect();
      
      const repairTasksCount = await db._instance.collection('repairTasks').countDocuments();
      const tasksCount = await db._instance.collection('tasks').countDocuments();
      const migratedCount = await db._instance.collection('tasks').countDocuments({
        'metadata.migratedFromRepairTasks': true
      });
      
      return {
        repairTasksTotal: repairTasksCount,
        tasksTotal: tasksCount,
        migratedCount,
        pendingMigration: repairTasksCount - migratedCount,
        migrationComplete: migratedCount === repairTasksCount
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  }

  /**
   * Map repairTask data structure to new tasks structure
   */
  static mapRepairTaskToTask(repairTask) {
    return {
      title: repairTask.title,
      description: repairTask.description || '',
      category: this.inferCategoryFromVendor(repairTask.vendor) || 'repair',
      subcategory: repairTask.vendor || '',
      metalType: this.inferMetalType(repairTask.title, repairTask.description),
      basePrice: parseFloat(repairTask.price) || 0,
      laborHours: 0, // Default - will need manual adjustment
      skillLevel: 'standard', // Default - will need manual adjustment
      riskLevel: 'low', // Default - will need manual adjustment  
      isActive: true,
      metadata: {
        migratedFromRepairTasks: true,
        originalRepairTaskId: repairTask._id,
        originalSku: repairTask.sku,
        originalVendor: repairTask.vendor,
        originalTags: repairTask.tags || [],
        originalShopifyProductId: repairTask.shopifyProductId,
        migratedAt: new Date()
      }
    };
  }

  /**
   * Infer category from vendor information
   */
  static inferCategoryFromVendor(vendor) {
    if (!vendor) return 'repair';
    
    const vendorLower = vendor.toLowerCase();
    
    const categoryMap = {
      'stone': 'stone_work',
      'setting': 'stone_work', 
      'sizing': 'sizing',
      'resize': 'sizing',
      'engrav': 'engraving',
      'polish': 'finishing',
      'finish': 'finishing',
      'design': 'design',
      '3d': '3d_printing',
      'print': '3d_printing',
      'assembly': 'assembly'
    };
    
    for (const [key, category] of Object.entries(categoryMap)) {
      if (vendorLower.includes(key)) {
        return category;
      }
    }
    
    return 'repair'; // Default fallback
  }

  /**
   * Infer metal type from title and description
   */
  static inferMetalType(title, description) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (text.includes('platinum') || text.includes('pt')) return 'platinum';
    if (text.includes('gold') || text.includes('14k') || text.includes('18k') || text.includes('10k')) return 'gold';
    if (text.includes('silver') || text.includes('sterling')) return 'silver';
    if (text.includes('mixed') || (text.includes('gold') && text.includes('silver'))) return 'mixed';
    
    return ''; // No specific metal type detected
  }

  /**
   * Migrate a single repairTask to the tasks system
   */
  static async migrateSingleRepairTask(repairTask, userEmail = 'system') {
    try {
      const mappedTask = this.mapRepairTaskToTask(repairTask);
      
      // Check if already migrated
      const existingMigrated = await db._instance.collection('tasks').findOne({
        'metadata.originalRepairTaskId': repairTask._id
      });
      
      if (existingMigrated) {
        return { 
          success: false, 
          message: 'Already migrated', 
          taskId: existingMigrated._id 
        };
      }
      
      // Use TasksService to create the new task (ensures all validations and business logic)
      const createdTask = await TasksService.createTask(mappedTask, userEmail);
      
      return {
        success: true,
        message: 'Successfully migrated',
        taskId: createdTask._id,
        originalId: repairTask._id
      };
      
    } catch (error) {
      console.error('Error migrating single repair task:', error);
      return {
        success: false,
        message: error.message,
        originalId: repairTask._id
      };
    }
  }

  /**
   * Migrate all repairTasks to tasks system
   */
  static async migrateAllRepairTasks(userEmail = 'system', batchSize = 50) {
    try {
      const repairTasks = await RepairTasksDatabaseService.getRepairTasks();
      const results = {
        total: repairTasks.length,
        migrated: 0,
        skipped: 0,
        errors: 0,
        details: []
      };
      
      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < repairTasks.length; i += batchSize) {
        const batch = repairTasks.slice(i, i + batchSize);
        
        for (const repairTask of batch) {
          const result = await this.migrateSingleRepairTask(repairTask, userEmail);
          results.details.push(result);
          
          if (result.success) {
            if (result.message === 'Already migrated') {
              results.skipped++;
            } else {
              results.migrated++;
            }
          } else {
            results.errors++;
          }
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return results;
      
    } catch (error) {
      console.error('Error during mass migration:', error);
      throw error;
    }
  }

  /**
   * Validate migration integrity
   */
  static async validateMigration() {
    try {
      const repairTasks = await RepairTasksDatabaseService.getRepairTasks();
      const validation = {
        totalRepairTasks: repairTasks.length,
        migratedTasks: 0,
        missingTasks: [],
        dataIntegrityIssues: []
      };
      
      for (const repairTask of repairTasks) {
        const migratedTask = await db._instance.collection('tasks').findOne({
          'metadata.originalRepairTaskId': repairTask._id
        });
        
        if (migratedTask) {
          validation.migratedTasks++;
          
          // Check data integrity
          if (migratedTask.title !== repairTask.title) {
            validation.dataIntegrityIssues.push({
              originalId: repairTask._id,
              issue: 'Title mismatch',
              original: repairTask.title,
              migrated: migratedTask.title
            });
          }
          
          if (Math.abs(migratedTask.basePrice - parseFloat(repairTask.price)) > 0.01) {
            validation.dataIntegrityIssues.push({
              originalId: repairTask._id,
              issue: 'Price mismatch',
              original: repairTask.price,
              migrated: migratedTask.basePrice
            });
          }
        } else {
          validation.missingTasks.push({
            id: repairTask._id,
            title: repairTask.title,
            sku: repairTask.sku
          });
        }
      }
      
      validation.migrationComplete = validation.missingTasks.length === 0;
      
      return validation;
      
    } catch (error) {
      console.error('Error validating migration:', error);
      throw error;
    }
  }

  /**
   * Rollback migration (remove migrated tasks)
   * USE WITH EXTREME CAUTION
   */
  static async rollbackMigration(confirmationToken) {
    if (confirmationToken !== 'CONFIRM_ROLLBACK_MIGRATION') {
      throw new Error('Invalid confirmation token. Migration rollback cancelled for safety.');
    }
    
    try {
      const result = await db._instance.collection('tasks').deleteMany({
        'metadata.migratedFromRepairTasks': true
      });
      
      return {
        success: true,
        deletedCount: result.deletedCount,
        message: `Rolled back ${result.deletedCount} migrated tasks`
      };
      
    } catch (error) {
      console.error('Error during rollback:', error);
      throw error;
    }
  }
}
