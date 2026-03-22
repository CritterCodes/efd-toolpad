/**
 * Processes Utilities Barrel File
 * 
 * Re-exports constants, formatters, validation, and data helpers for repair processes.
 * This file has been refactored into modular files to abide by the < 300 lines rule.
 */

// Constants
export {
  PROCESS_CATEGORIES,
  SKILL_LEVELS,
  METAL_TYPES,
  KARAT_OPTIONS,
  COMPLEXITY_MULTIPLIERS,
  DEFAULT_PROCESS_FORM
} from '@/constants/processes.constants';

// Formatting Helpers
export {
  getKaratOptionsForMetal,
  formatPrice,
  formatCategoryDisplay,
  formatSkillLevelDisplay,
  formatMetalTypeDisplay,
  getSkillLevelMultiplier,
  getSkillLevelLabel,
  getMetalTypeLabel,
  getKaratLabel,
  getComplexityMultiplierLabel
} from './processes/formatting.helpers';

// Validation & Process Helpers
export {
  validateProcessForm,
  calculateProcessCost,
  prepareProcessForSaving,
  transformProcessForForm
} from './processes/validation.helpers';

// Data Helpers
export {
  parseMetalKey,
  filterProcesses,
  sortProcesses,
  generateProcessStats,
  getUniqueValues,
  getMetalVariantsFromMaterials,
  getMetalTypesFromMaterials,
  shouldProcessBeMetalDependent
} from './processes/data.helpers';
