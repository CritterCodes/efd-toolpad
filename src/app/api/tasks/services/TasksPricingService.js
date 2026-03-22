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


export class TasksPricingService {
  static async recalculateAllTaskPrices() {
    return TasksPricingService.recalculateAllTaskPrices();
  }

  static async calculateProcessBasedPricing(taskData) {
    return TasksPricingService.calculateProcessBasedPricing(taskData);
  }

  static getDefaultPricing() {
    return TasksPricingService.getDefaultPricing();
  }

  static async calculateUniversalTaskPricing(taskData) {
    return TasksPricingService.calculateUniversalTaskPricing(taskData);
  }

  static async recalculateUniversalPricingForTasks(taskIds, userEmail) {
    return TasksPricingService.recalculateUniversalPricingForTasks(taskIds, userEmail);
  }

  static async recalculateAllUniversalPricing(userEmail) {
    return TasksPricingService.recalculateAllUniversalPricing(userEmail);
  }

}
