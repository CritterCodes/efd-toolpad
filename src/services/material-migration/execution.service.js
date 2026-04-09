import { MaterialValidation } from '@/schemas/enhanced-material.schema';

export class ExecutionService {
  /**
   * Execute migration for a specific candidate group
   * @param {Object} candidate - Candidate group from analysis
   * @param {Object} strategy - Migration strategy
   * @returns {Object} Migration result
   */
  static async migrateCandidateGroup(candidate, strategy) {
    const result = {
      success: false,
      baseMaterial: null,
      archivedMaterials: [],
      errors: []
    };

    try {
      // Create the multi-variant material
      const baseMaterial = {
        ...strategy.baseMaterial,
        displayName: candidate.baseName,
        hasVariants: true,
        variants: strategy.variantsToCreate.map(v => ({
          ...v,
          lastUpdated: new Date()
        })),
        // Clear legacy fields
        unitCost: null,
        sku: null,
        stullerProductId: null,
        metalType: null,
        karat: null,
        updatedAt: new Date()
      };

      // Validate the new material
      MaterialValidation.validate(baseMaterial);

      result.baseMaterial = baseMaterial;
      result.archivedMaterials = strategy.materialsToArchive;
      result.success = true;

    } catch (error) {
      result.errors.push(`Migration failed: ${error.message}`);
    }

    return result;
  }
}
