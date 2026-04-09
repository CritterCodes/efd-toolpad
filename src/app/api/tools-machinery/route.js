import ToolMachineryController from './controller.js';

export async function GET(req) {
  return ToolMachineryController.getTools(req);
}

export async function POST(req) {
  return ToolMachineryController.createTool(req);
}

export async function PUT(req) {
  return ToolMachineryController.updateTool(req);
}

export async function DELETE(req) {
  return ToolMachineryController.deleteTool(req);
}
