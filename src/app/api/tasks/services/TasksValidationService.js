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


export class TasksValidationService {
  static validateTaskData(data, isCreate = true) {
    return TasksValidationService.validateTaskData(data, isCreate);
  }

  static transformTaskForDatabase(data) {
    return TasksValidationService.transformTaskForDatabase(data);
  }

  static transformTaskForResponse(task) {
    return TasksValidationService.transformTaskForResponse(task);
  }

}
