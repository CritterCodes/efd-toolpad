import { AnalysisService } from './analysis.service.js';

export class ReportingService {
  /**
   * Generate migration report
   * @param {Array} materials - All materials
   * @returns {Object} Detailed migration report
   */
  static generateMigrationReport(materials) {
    const analysis = AnalysisService.analyzeMaterials(materials);
    
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
      riskAssessment: AnalysisService.assessMigrationRisks(analysis),
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
