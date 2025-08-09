# Multi-Variant Materials System Proposal

## Problem Statement
Current system requires creating separate material records for each metal/karat combination, leading to exponential growth:
- Gold Solder 10K, 14K, 18K, 24K
- Silver Solder
- Platinum Solder
- Each with separate processes and tasks

## Proposed Enhanced Material Schema

### New Material Structure
```javascript
{
  // Core Material Info
  id: "solder_001",
  name: "solder",
  displayName: "Precious Metal Solder",
  category: "solder",
  unitType: "application",
  supplier: "Stuller",
  description: "Precious metal solder for jewelry repair",
  autoUpdate: true,
  isActive: true,
  
  // Multi-Variant Support
  hasVariants: true,
  variants: [
    {
      metalType: "gold",
      karat: "10k",
      sku: "SOL-10K-001",
      unitCost: 1.25,
      stullerProductId: "12345",
      compatibleMetals: ["gold"],
      isActive: true,
      lastUpdated: "2025-01-08"
    },
    {
      metalType: "gold", 
      karat: "14k",
      sku: "SOL-14K-001",
      unitCost: 1.85,
      stullerProductId: "12346",
      compatibleMetals: ["gold"],
      isActive: true,
      lastUpdated: "2025-01-08"
    },
    {
      metalType: "silver",
      karat: "sterling",
      sku: "SOL-SIL-001", 
      unitCost: 0.65,
      stullerProductId: "12347",
      compatibleMetals: ["silver", "gold"],
      isActive: true,
      lastUpdated: "2025-01-08"
    }
  ],
  
  // Legacy Support (for non-variant materials)
  unitCost: null, // null when hasVariants = true
  sku: null,
  stullerProductId: null
}
```

## Benefits

### 1. **Massive Reduction in Records**
- **Before**: 20+ solder materials (4 metals × 5 karats)
- **After**: 1 solder material with variants
- **Result**: 95% reduction in material records

### 2. **Simplified Process Creation**  
- Create ONE "Soldering" process
- Process automatically adapts pricing based on job's metal type
- No more "Soldering (14K Gold)" vs "Soldering (10K Gold)" processes

### 3. **Dynamic Pricing**
```javascript
// Process uses material like this:
const getVariantCost = (material, metalType, karat) => {
  if (!material.hasVariants) return material.unitCost;
  
  const variant = material.variants.find(v => 
    v.metalType === metalType && v.karat === karat
  );
  return variant?.unitCost || 0;
}
```

### 4. **Stuller Integration Enhancement**
- Search Stuller API from within app
- Import multiple variants at once
- Bulk update pricing across variants
- Automatic variant creation from Stuller data

## Implementation Strategy

### Phase 1: Schema Migration
1. Add `hasVariants` and `variants` fields to material schema
2. Migrate existing materials to variant structure  
3. Update material creation/editing UI

### Phase 2: Process Enhancement
1. Update processes to use base materials + variant selection
2. Implement dynamic pricing calculation
3. Update task cost calculation

### Phase 3: Stuller Integration
1. Add Stuller search interface
2. Bulk import functionality
3. Automated variant management

## UI/UX Changes

### Materials Management
- **List View**: Show base material with variant count badge
- **Detail View**: Expandable variants table
- **Create/Edit**: Toggle between single/multi-variant mode
- **Bulk Operations**: Update all variants at once

### Process Building  
- Select base material (e.g., "Solder")
- System automatically uses appropriate variant based on job metal type
- Clear indication of which variant will be used

### Stuller Integration
- **Search Interface**: Search Stuller products by category/keyword
- **Import Dialog**: Select multiple related products to create variants
- **Auto-Update**: Schedule automatic price updates for variants

## Migration Plan

### Backwards Compatibility
- Existing single materials continue to work (`hasVariants: false`)
- Gradual migration of high-volume materials (solder, wire, findings)
- Optional conversion tool for existing materials

### Data Migration
```sql
-- Example: Convert existing gold solders to variants
1. Create base "Precious Metal Solder" material
2. Convert existing solder materials to variants
3. Update process references
4. Archive old individual materials
```

## ROI Analysis

### Time Savings
- **Material Creation**: 80% reduction in time
- **Process Management**: 90% reduction in duplicate processes  
- **Price Updates**: Bulk update variants vs individual materials

### Maintenance Reduction
- Single source of truth for material types
- Automated pricing updates
- Simplified inventory management

### Scalability
- Easy addition of new metal types/karats
- Systematic organization
- Better reporting and analytics

## Next Steps

1. **Review & Approve** this proposal
2. **Create migration scripts** for existing data
3. **Update UI components** for variant management
4. **Implement Stuller search integration**
5. **Test with pilot material categories**
6. **Roll out gradually** across all material types

This system transforms the exponential complexity problem into a linear, manageable structure while adding powerful new capabilities for Stuller integration.
