/**
 * Tasks API Routes
 * Main routes for task management using MVC structure
 */

import { TasksController } from './controller';

export async function GET(request) {
  return TasksController.getTasks(request);
}

export async function POST(request) {
  return TasksController.create(request);
}

export async function PUT(request) {
  return TasksController.update(request);
}

export async function DELETE(request) {
  return TasksController.delete(request);
}
