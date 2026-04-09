import pricingEngine from '@/services/PricingEngine';

export class ProcessUpdateService {
  static async updateAllProcesses(adminSettings) {
    const response = await fetch('/api/processes/bulk-update-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSettings })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update processes');
    }
    
    return await response.json();
  }
  
  /**
   * Update all tasks with new admin settings
   */
  static async findProcessesUsingMaterials(materialIds) {
    const response = await fetch('/api/processes/find-by-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialIds })
    });
    
    if (!response.ok) {
      throw new Error('Failed to find processes using materials');
    }
    
    const data = await response.json();
    return data.processes || [];
  }
  
  /**
   * Find tasks that use specific materials or processes
   */
  static async updateSpecificProcesses(processes) {
    const response = await fetch('/api/processes/update-specific', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processes })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update specific processes');
    }
    
    return await response.json();
  }
  
  /**
   * Update specific tasks
   */
}
