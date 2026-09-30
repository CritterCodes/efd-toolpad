/**
 * Tasks Controller (Facade)
 * Dispatches HTTP request handlers for task management to specialized controllers.
 *
 * The pricing, metal-context and process-based controllers are gone (2026-09-30): they served routes
 * that wrote or read STORED task prices, none of which had a caller. Prices are calculated on every
 * read by services/pricing/engine.js.
 */

import { TasksCrudController } from './controllers/TasksCrudController';
import { TasksAnalyticsController } from './controllers/TasksAnalyticsController';

export class TasksController {
  // Core CRUD Operations
  static getTasks = TasksCrudController.getTasks;
  static create = TasksCrudController.create;
  static update = TasksCrudController.update;
  static delete = TasksCrudController.delete;

  // Analytics
  static getStatistics = TasksAnalyticsController.getStatistics;
}
