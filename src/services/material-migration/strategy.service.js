export class StrategyService {
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
}
