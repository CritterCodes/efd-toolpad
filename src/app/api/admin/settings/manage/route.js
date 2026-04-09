import AdminSettingsController from '../controller.js';

export async function GET(request) {
  return AdminSettingsController.getSettings(request);
}

export async function PUT(request) {
  return AdminSettingsController.updateSettings(request);
}
