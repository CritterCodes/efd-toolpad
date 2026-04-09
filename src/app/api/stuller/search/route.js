import StullerSearchController from './controller.js';

export async function GET(request) {
  return await StullerSearchController.searchItems(request);
}
