/**
 * Tasks Service
 * Business logic layer for task management
 */

import { TasksModel } from './model';
import { generateTaskSku, generateShortCode } from '@/utils/skuGenerator';
import { ObjectId } from 'mongodb';
import pricingEngine from '@/services/PricingEngine';

import { TasksQueryService } from './services/TasksQueryService';
import { TasksMutationService } from './services/TasksMutationService';
import { TasksValidationService } from './services/TasksValidationService';
import { TasksPricingService } from './services/TasksPricingService';

import { TasksQueryService } from './services/TasksQueryService.js';
import { TasksMutationService } from './services/TasksMutationService.js';
import { TasksValidationService } from './services/TasksValidationService.js';
import { TasksPricingService } from './services/TasksPricingService.js';


export class TasksMutationService {
  static async createTask(taskData, userEmail = null) {
    return TasksMutationService.createTask(taskData, userEmail);
  }

  static async createProcessBasedTask(taskData, userEmail) {
    return TasksMutationService.createProcessBasedTask(taskData, userEmail);
  }

  static async updateTask(id, updateData, userEmail = null) {
    return TasksMutationService.updateTask(id, updateData, userEmail);
  }

  static async deleteTask(id, hardDelete = false, userEmail = null) {
    return TasksMutationService.deleteTask(id, hardDelete, userEmail);
  }

  static async bulkUpdatePricing(updates) {
    return TasksMutationService.bulkUpdatePricing(updates);
  }

}
