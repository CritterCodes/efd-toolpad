export class UtilsService {
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
}
