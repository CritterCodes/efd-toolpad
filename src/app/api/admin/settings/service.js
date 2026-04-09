import SettingsManagerService from './services/settingsManager.service.js';
import PriceRecalculationService from './services/priceRecalculation.service.js';

export default class AdminSettingsService {
  /**
   * Fetch current admin settings (public pricing info only)
   */
  static async getSettings() {
    return await SettingsManagerService.getSettings();
  }

  /**
   * Update admin settings and recalculate all repair task prices
   */
  static async updateSettings(body, userEmail, ipAddress) {
    return await SettingsManagerService.updateSettings(body, userEmail, ipAddress);
  }

  /**
   * Update financial settings (no security code required)
   */
  static async updateFinancialSettings(financial, userEmail) {
    return await SettingsManagerService.updateFinancialSettings(financial, userEmail);
  }

  /**
   * Recalculate all repair task prices with new settings
   */
  static async recalculateAllPrices(dbInstance, pricingSettings) {
    return await PriceRecalculationService.recalculateAllPrices(dbInstance, pricingSettings);
  }
}

