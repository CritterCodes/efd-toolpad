
import { DesignApproveService } from './service.js';

export class Controller {
  static async handleApprove(request, context) {
    return await DesignApproveService.handleApprove(request, context);
  }
}
