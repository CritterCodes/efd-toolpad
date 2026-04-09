import { UtilsService } from './utils.service.js';
import { StrategyService } from './strategy.service.js';

export class AnalysisService {
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
      const baseKey = UtilsService.createBaseKey(material);
      
      if (!materialGroups[baseKey]) {
        materialGroups[baseKey] = {
          baseName: UtilsService.extractBaseName(material.displayName),
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
        analysis.migrationStrategies[baseKey] = StrategyService.suggestMigrationStrategy(candidate);
      }
    });

    // Sort candidates by potential savings
    analysis.candidatesForVariants.sort((a, b) => b.potentialSavings - a.potentialSavings);

    return analysis;
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
}
