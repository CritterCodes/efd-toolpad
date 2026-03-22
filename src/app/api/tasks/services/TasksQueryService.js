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


export class TasksQueryService {
  static async getTasks(filters = {}) {
    return TasksQueryService.getTasks(filters);
  }

  static async getTaskById(id) {
    return TasksQueryService.getTaskById(id);
  }

  static async getTaskStatistics() {
    return TasksQueryService.getTaskStatistics();
  }

  static async getTaskPriceForMetal(taskId, metalType, karat) {
    return TasksQueryService.getTaskPriceForMetal(taskId, metalType, karat);
  }

  static async getTaskSupportedMetals(taskId) {
    return TasksQueryService.getTaskSupportedMetals(taskId);
  }

  static async getTasksForMetalContext(metalType, karat, filters = {}) {
    return TasksQueryService.getTasksForMetalContext(metalType, karat, filters);
  }

  static async getAllSupportedMetalKeys(processes = []) {
    return TasksQueryService.getAllSupportedMetalKeys(processes);
  }

  static async getAllSupportedMetals() {
    return TasksQueryService.getAllSupportedMetals();
  }

}
