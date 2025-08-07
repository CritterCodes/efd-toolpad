/**
 * Individual Task API Routes
 * Routes for specific task operations (GET, PUT, DELETE by ID) using MVC structure
 */

import { IndividualTaskController } from './controller';

export async function GET(request, { params }) {
  return IndividualTaskController.getTask(request, { params });
}

export async function PUT(request, { params }) {
  return IndividualTaskController.updateTask(request, { params });
}

export async function DELETE(request, { params }) {
  return IndividualTaskController.deleteTask(request, { params });
}
