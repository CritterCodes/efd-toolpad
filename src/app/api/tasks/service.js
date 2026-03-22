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

import { TasksQueryService } from './services/TasksQueryService';
import { TasksMutationService } from './services/TasksMutationService';
import { TasksValidationService } from './services/TasksValidationService';
import { TasksPricingService } from './services/TasksPricingService';

export class TasksService {
  static async getTasks(filters = {}) {
    return TasksQueryService.getTasks(filters);
  }

  static async getTaskById(id) {
    return TasksQueryService.getTaskById(id);
  }

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

  static async getTaskStatistics() {
    return TasksQueryService.getTaskStatistics();
  }

  static async bulkUpdatePricing(updates) {
    return TasksMutationService.bulkUpdatePricing(updates);
  }

  static async recalculateAllTaskPrices() {
    return TasksPricingService.recalculateAllTaskPrices();
  }

  static validateTaskData(data, isCreate = true) {
    return TasksValidationService.validateTaskData(data, isCreate);
  }

  static transformTaskForDatabase(data) {
    return TasksValidationService.transformTaskForDatabase(data);
  }

  static transformTaskForResponse(task) {
    return TasksValidationService.transformTaskForResponse(task);
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

  static async getTaskPriceForMetal(taskId, metalType, karat) {
    return TasksQueryService.getTaskPriceForMetal(taskId, metalType, karat);
  }

  static async getTaskSupportedMetals(taskId) {
    return TasksQueryService.getTaskSupportedMetals(taskId);
  }

  static async getTasksForMetalContext(metalType, karat, filters = {}) {
    return TasksQueryService.getTasksForMetalContext(metalType, karat, filters);
  }

  static async recalculateUniversalPricingForTasks(taskIds, userEmail) {
    return TasksPricingService.recalculateUniversalPricingForTasks(taskIds, userEmail);
  }

  static async recalculateAllUniversalPricing(userEmail) {
    return TasksPricingService.recalculateAllUniversalPricing(userEmail);
  }

  static async getAllSupportedMetalKeys(processes = []) {
    return TasksQueryService.getAllSupportedMetalKeys(processes);
  }

  static async getAllSupportedMetals() {
    return TasksQueryService.getAllSupportedMetals();
  }

}
