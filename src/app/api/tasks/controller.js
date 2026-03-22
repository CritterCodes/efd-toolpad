/**
 * Tasks Controller (Facade)
 * Dispatches HTTP request handlers for task management to specialized controllers
 */

import { TasksCrudController } from './controllers/TasksCrudController';
import { TasksPricingController } from './controllers/TasksPricingController';
import { TasksMetalController } from './controllers/TasksMetalController';
import { TasksProcessController } from './controllers/TasksProcessController';
import { TasksAnalyticsController } from './controllers/TasksAnalyticsController';

export class TasksController {
  // Core CRUD Operations
  static getTasks = TasksCrudController.getTasks;
  static create = TasksCrudController.create;
  static update = TasksCrudController.update;
  static delete = TasksCrudController.delete;
  
  // Analytics
  static getStatistics = TasksAnalyticsController.getStatistics;
  
  // Pricing Operations
  static bulkUpdatePricing = TasksPricingController.bulkUpdatePricing;
  static updateAllPrices = TasksPricingController.updateAllPrices;
  static recalculateUniversalPricing = TasksPricingController.recalculateUniversalPricing;
  static calculateUniversalPricing = TasksPricingController.calculateUniversalPricing;
  
  // Metal Context Operations
  static getTaskPriceForMetal = TasksMetalController.getTaskPriceForMetal;
  static getCompatibleMetals = TasksMetalController.getCompatibleMetals;
  static getTasksForMetalContext = TasksMetalController.getTasksForMetalContext;
  
  // Specialized Process Operations
  static createProcessBasedTask = TasksProcessController.createProcessBasedTask;
}