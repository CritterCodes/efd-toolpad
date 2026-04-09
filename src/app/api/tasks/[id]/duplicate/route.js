/**
 * Task Duplicate Route
 * POST /api/tasks/[id]/duplicate — Creates an inactive copy of the given task
 */

import { IndividualTaskController } from '../controller';

export async function POST(request, { params }) {
  return IndividualTaskController.duplicateTask(request, { params });
}
