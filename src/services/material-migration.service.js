/**
 * Material Migration Utility
 * Helps migrate existing single materials to multi-variant system
 */

import { MaterialHelpers, MaterialValidation } from '@/schemas/enhanced-material.schema';

export class MaterialMigrationService {
  /**
   * Analyze existing materials and suggest migration strategies
   * @param {Array} materials - Existing materials
   * @returns {Object} Migration analysis
   */
  static analyzeMaterials(materials) {
    const analysis = {
      totalMaterials: materials.length,
      candidatesForVariants: [],
      alreadyVariants: 0,
      migrationStrategies: {},
      potentialSavings: 0
    };

    // Group materials by base type to find variant candidates
    const materialGroups = {};
    
    materials.forEach(material => {
      if (material.hasVariants) {
        analysis.alreadyVariants++;
        return;
      }

      // Create a base key for grouping similar materials
      const baseKey = this.createBaseKey(material);
      
      if (!materialGroups[baseKey]) {
        materialGroups[baseKey] = {
          baseName: this.extractBaseName(material.displayName),
          category: material.category,
          materials: [],
          metalTypes: new Set(),
          karats: new Set()
        };
      }
      
      materialGroups[baseKey].materials.push(material);
      if (material.metalType) {
        materialGroups[baseKey].metalTypes.add(material.metalType);
      }
      if (material.karat) {
        materialGroups[baseKey].karats.add(material.karat);
      }
    });

    // Identify candidates for variants (groups with multiple materials)
    Object.entries(materialGroups).forEach(([baseKey, group]) => {
      if (group.materials.length > 1) {
        const candidate = {
          baseKey,
          baseName: group.baseName,
          category: group.category,
          materialCount: group.materials.length,
          materials: group.materials,
          metalTypes: Array.from(group.metalTypes),
          karats: Array.from(group.karats),
          potentialSavings: group.materials.length - 1 // Save n-1 material records
        };
        
        analysis.candidatesForVariants.push(candidate);
        analysis.potentialSavings += candidate.potentialSavings;
        
        // Suggest migration strategy
        analysis.migrationStrategies[baseKey] = this.suggestMigrationStrategy(candidate);
      }
    });

    // Sort candidates by potential savings
    analysis.candidatesForVariants.sort((a, b) => b.potentialSavings - a.potentialSavings);

    return analysis;
  }

  /**
   * Create a base key for grouping similar materials
   */
  static createBaseKey(material) {
    // Remove metal type and karat info from name to find base material
    const baseName = material.displayName
      .replace(/\b(10k|14k|18k|24k|sterling|platinum|palladium)\b/gi, '')
      .replace(/\b(gold|silver|platinum|palladium)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return `${baseName}_${material.category}`.toLowerCase();
  }

  /**
   * Extract base name from display name
   */
  static extractBaseName(displayName) {
    return displayName
      .replace(/\b(10k|14k|18k|24k|sterling|platinum|palladium)\b/gi, '')
      .replace(/\b(gold|silver|platinum|palladium)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Suggest migration strategy for a candidate group
   */
  static suggestMigrationStrategy(candidate) {
    const strategy = {
      action: 'merge_to_variants',
      confidence: 'high',
      baseMaterial: null,
      variantsToCreate: [],
      materialsToArchive: [],
      risks: [],
      benefits: []
    };

    // Select the most complete material as the base
    strategy.baseMaterial = candidate.materials.reduce((best, current) => {
      const currentScore = this.scoreMaterialCompleteness(current);
      const bestScore = this.scoreMaterialCompleteness(best);
      return currentScore > bestScore ? current : best;
    });

    // Create variants from all materials
    strategy.variantsToCreate = candidate.materials.map(material => ({
      originalId: material._id,
      metalType: material.metalType || 'other',
      karat: material.karat || 'na',
      sku: material.sku || '',
      unitCost: material.unitCost || 0,
      stullerProductId: material.stullerProductId || '',
      compatibleMetals: material.compatibleMetals || [],
      isActive: material.isActive !== false,
      notes: `Migrated from: ${material.displayName}`
    }));

    // Mark other materials for archival
    strategy.materialsToArchive = candidate.materials
      .filter(m => m._id !== strategy.baseMaterial._id)
      .map(m => m._id);

    // Assess risks
    if (candidate.materials.some(m => m.unitCost === 0)) {
      strategy.risks.push('Some materials have zero cost - review pricing');
    }
    
    if (candidate.metalTypes.length > 3) {
      strategy.risks.push('Many metal types - ensure compatibility');
    }

    // List benefits
    strategy.benefits.push(`Reduce from ${candidate.materialCount} to 1 material record`);
    strategy.benefits.push('Simplified process creation');
    strategy.benefits.push('Easier price management');

    return strategy;
  }

  /**
   * Score material completeness to select best base material
   */
  static scoreMaterialCompleteness(material) {
    let score = 0;
    if (material.description) score += 2;
    if (material.sku) score += 1;
    if (material.stullerProductId) score += 1;
    if (material.compatibleMetals && material.compatibleMetals.length > 0) score += 1;
    if (material.unitCost > 0) score += 2;
    if (material.supplier && material.supplier !== 'Other') score += 1;
    return score;
  }

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

  /**
   * Generate migration report
   * @param {Array} materials - All materials
   * @returns {Object} Detailed migration report
   */
  static generateMigrationReport(materials) {
    const analysis = this.analyzeMaterials(materials);
    
    const report = {
      summary: {
        totalMaterials: analysis.totalMaterials,
        candidatesCount: analysis.candidatesForVariants.length,
        potentialSavings: analysis.potentialSavings,
        migrationRecommendation: this.getMigrationRecommendation(analysis)
      },
      candidateGroups: analysis.candidatesForVariants.map(candidate => ({
        ...candidate,
        strategy: analysis.migrationStrategies[candidate.baseKey],
        priority: this.calculatePriority(candidate)
      })),
      riskAssessment: this.assessMigrationRisks(analysis),
      timeline: this.suggestMigrationTimeline(analysis)
    };

    return report;
  }

  /**
   * Get overall migration recommendation
   */
  static getMigrationRecommendation(analysis) {
    if (analysis.candidatesForVariants.length === 0) {
      return 'No migration needed - materials are already optimized';
    }
    
    if (analysis.potentialSavings > 20) {
      return 'Highly recommended - significant optimization potential';
    }
    
    if (analysis.potentialSavings > 5) {
      return 'Recommended - moderate optimization potential';
    }
    
    return 'Optional - minor optimization potential';
  }

  /**
   * Calculate migration priority for a candidate
   */
  static calculatePriority(candidate) {
    let priority = 0;
    
    // Higher priority for more materials
    priority += candidate.materialCount * 2;
    
    // Higher priority for common categories
    if (['solder', 'wire', 'findings'].includes(candidate.category)) {
      priority += 5;
    }
    
    // Higher priority for multiple metal types
    priority += candidate.metalTypes.length;
    
    if (priority >= 10) return 'HIGH';
    if (priority >= 6) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Assess overall migration risks
   */
  static assessMigrationRisks(analysis) {
    const risks = {
      dataIntegrity: [],
      processImpact: [],
      timeline: []
    };

    if (analysis.candidatesForVariants.length > 10) {
      risks.timeline.push('Large migration scope - plan phased approach');
    }

    if (analysis.potentialSavings > 50) {
      risks.dataIntegrity.push('Major data restructuring - extensive testing required');
    }

    risks.processImpact.push('Existing processes may need updates');
    risks.processImpact.push('User training on new variant system required');

    return risks;
  }

  /**
   * Suggest migration timeline
   */
  static suggestMigrationTimeline(analysis) {
    const phases = [];

    if (analysis.candidatesForVariants.length > 0) {
      phases.push({
        phase: 1,
        name: 'High Priority Materials',
        duration: '1 week',
        description: 'Migrate solder and wire materials (highest impact)',
        candidates: analysis.candidatesForVariants
          .filter(c => ['solder', 'wire'].includes(c.category))
          .slice(0, 5)
      });

      phases.push({
        phase: 2,
        name: 'Medium Priority Materials',
        duration: '1 week',
        description: 'Migrate findings and sheet materials',
        candidates: analysis.candidatesForVariants
          .filter(c => ['findings', 'sheet'].includes(c.category))
          .slice(0, 5)
      });

      phases.push({
        phase: 3,
        name: 'Remaining Materials',
        duration: '1 week',
        description: 'Migrate remaining candidate materials',
        candidates: analysis.candidatesForVariants.slice(10)
      });
    }

    return phases;
  }
}

export default MaterialMigrationService;
