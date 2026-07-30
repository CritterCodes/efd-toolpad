import ToolMachineryController from './controller.js';
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * STAFF ONLY. This was anonymous full CRUD — including DELETE — on the tools/machinery cost
 * catalog, which feeds labor and job costing.
 */

export async function GET(req) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return ToolMachineryController.getTools(req);
}

export async function POST(req) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return ToolMachineryController.createTool(req);
}

export async function PUT(req) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return ToolMachineryController.updateTool(req);
}

export async function DELETE(req) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return ToolMachineryController.deleteTool(req);
}
