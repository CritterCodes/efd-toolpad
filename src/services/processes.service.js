import axiosInstance from '@/utils/axiosInstance';

/**
 * Processes Service
 * Client-side service for managing repair processes
 */
class ProcessesService {
  
  /**
   * Get all processes with optional filtering
   */
  async getProcesses(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.skillLevel) params.append('skillLevel', filters.skillLevel);
      if (filters.isActive !== undefined) params.append('active', filters.isActive.toString());
      if (filters.metalType) params.append('metalType', filters.metalType);
      if (filters.search) params.append('search', filters.search);

      const response = await axiosInstance.get(`/processes?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.processes || [];
      }
      throw new Error(response.data.error || 'Failed to fetch processes');
    } catch (error) {
      console.error('ProcessesService.getProcesses error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch processes');
    }
  }

  /**
   * Get a single process by ID
   */
  async getProcessById(id) {
    try {
      const response = await axiosInstance.get(`/processes?id=${id}`);
      
      if (response.data.success) {
        return response.data.process;
      }
      throw new Error(response.data.error || 'Process not found');
    } catch (error) {
      console.error('ProcessesService.getProcessById error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch process');
    }
  }

  /**
   * Create a new process
   */
  async createProcess(processData) {
    try {
      const response = await axiosInstance.post('/processes', processData);
      
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.error || 'Failed to create process');
    } catch (error) {
      console.error('ProcessesService.createProcess error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to create process');
    }
  }

  /**
   * Update an existing process
   */
  async updateProcess(id, processData) {
    try {
      const response = await axiosInstance.put(`/processes?id=${id}`, processData);
      
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.error || 'Failed to update process');
    } catch (error) {
      console.error('ProcessesService.updateProcess error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to update process');
    }
  }

  /**
   * Delete a process
   */
  async deleteProcess(id) {
    try {
      const response = await axiosInstance.delete(`/processes?id=${id}`);
      
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.error || 'Failed to delete process');
    } catch (error) {
      console.error('ProcessesService.deleteProcess error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete process');
    }
  }

  /**
   * Search processes
   */
  async searchProcesses(searchTerm) {
    try {
      return await this.getProcesses({ search: searchTerm });
    } catch (error) {
      console.error('ProcessesService.searchProcesses error:', error);
      throw error;
    }
  }

  /**
   * Get processes by category
   */
  async getProcessesByCategory(category) {
    try {
      return await this.getProcesses({ category });
    } catch (error) {
      console.error('ProcessesService.getProcessesByCategory error:', error);
      throw error;
    }
  }

  /**
   * Get processes by skill level
   */
  async getProcessesBySkillLevel(skillLevel) {
    try {
      return await this.getProcesses({ skillLevel });
    } catch (error) {
      console.error('ProcessesService.getProcessesBySkillLevel error:', error);
      throw error;
    }
  }

  /**
   * Get active processes only
   */
  async getActiveProcesses() {
    try {
      return await this.getProcesses({ isActive: true });
    } catch (error) {
      console.error('ProcessesService.getActiveProcesses error:', error);
      throw error;
    }
  }

  /**
   * Calculate process pricing based on data
   */
  calculateProcessPricing(processData, adminSettings) {
    const laborHours = parseFloat(processData.laborHours) || 0;
    const baseWage = adminSettings.pricing?.wage || 30;
    const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
    const hourlyRate = baseWage * (skillMultipliers[processData.skillLevel] || 1.0);
    const laborCost = laborHours * hourlyRate;

    // Calculate materials cost
    const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
    const baseMaterialsCost = (processData.materials || []).reduce((total, material) => {
      return total + (material.estimatedCost || 0);
    }, 0);
    const materialsCost = baseMaterialsCost * materialMarkup;

    // Apply metal complexity multiplier
    const multiplier = parseFloat(processData.metalComplexityMultiplier) || 1.0;
    const totalCost = (laborCost + materialsCost) * multiplier;

    return {
      laborCost: Math.round(laborCost * 100) / 100,
      baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
      materialsCost: Math.round(materialsCost * 100) / 100,
      materialMarkup: materialMarkup,
      totalCost: Math.round(totalCost * 100) / 100,
      hourlyRate: hourlyRate,
      calculatedAt: new Date()
    };
  }

  /**
   * Validate process data
   */
  validateProcessData(data) {
    const errors = [];

    if (!data.displayName || !data.displayName.trim()) {
      errors.push('Display name is required');
    }

    if (!data.category || !data.category.trim()) {
      errors.push('Category is required');
    }

    const laborHours = parseFloat(data.laborHours);
    if (isNaN(laborHours) || laborHours < 0 || laborHours > 8) {
      errors.push('Labor hours must be between 0 and 8');
    }

    const validSkillLevels = ['basic', 'standard', 'advanced', 'expert'];
    if (data.skillLevel && !validSkillLevels.includes(data.skillLevel)) {
      errors.push('Invalid skill level');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform process data for form editing
   */
  transformProcessForForm(process) {
    return {
      displayName: process.displayName || '',
      category: process.category || '',
      laborHours: process.laborHours || 0,
      skillLevel: process.skillLevel || 'standard',
      metalType: process.metalType || '',
      karat: process.karat || '',
      metalComplexityMultiplier: process.metalComplexityMultiplier || 1.0,
      description: process.description || '',
      materials: process.materials || [],
      isActive: process.isActive !== false
    };
  }

  /**
   * Generate process statistics
   */
  generateProcessStats(processes) {
    if (!processes || processes.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        averageLaborHours: 0,
        averageTotalCost: 0,
        categoryCounts: {},
        skillLevelCounts: {}
      };
    }

    const active = processes.filter(p => p.isActive !== false);
    const inactive = processes.filter(p => p.isActive === false);
    
    const totalLaborHours = processes.reduce((sum, p) => sum + (p.laborHours || 0), 0);
    const totalCost = processes.reduce((sum, p) => sum + (p.pricing?.totalCost || 0), 0);
    
    const categoryCounts = {};
    const skillLevelCounts = {};
    
    processes.forEach(process => {
      const category = process.category || 'unknown';
      const skillLevel = process.skillLevel || 'standard';
      
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      skillLevelCounts[skillLevel] = (skillLevelCounts[skillLevel] || 0) + 1;
    });

    return {
      total: processes.length,
      active: active.length,
      inactive: inactive.length,
      averageLaborHours: processes.length > 0 ? (totalLaborHours / processes.length).toFixed(2) : 0,
      averageTotalCost: processes.length > 0 ? (totalCost / processes.length).toFixed(2) : 0,
      categoryCounts,
      skillLevelCounts
    };
  }
}

// Export singleton instance
const processesService = new ProcessesService();
export default processesService;
