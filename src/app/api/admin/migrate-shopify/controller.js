
import { MigrateShopifyService } from './service.js';

export class Controller {
  static async handleMigration(request) {
    return await MigrateShopifyService.handleMigration(request);
  }
}
