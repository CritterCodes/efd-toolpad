import pricingEngine from '@/services/PricingEngine';

export class MaterialUpdateService {
  static async updateAllMaterials(adminSettings) {
    const response = await fetch('/api/materials/bulk-update-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSettings })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update materials');
    }
    
    return await response.json();
  }
  
  /**
   * Update all processes with new admin settings
   */
}
