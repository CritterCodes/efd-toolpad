# Job Costing Logic - Complete Isolation & Review

This document isolates all job costing logic including multipliers for comprehensive review.

---

## 📋 Table of Contents

1. [Core Multiplier Definitions](#core-multiplier-definitions)
2. [Pricing Calculation Utilities](#pricing-calculation-utilities)
3. [Service Layer Calculations](#service-layer-calculations)
4. [API Layer Calculations](#api-layer-calculations)
5. [Material Pricing Logic](#material-pricing-logic)
6. [Process Pricing Logic](#process-pricing-logic)
7. [Task Pricing Logic](#task-pricing-logic)
8. [Repair Pricing Logic](#repair-pricing-logic)
9. [Wholesale Pricing Logic](#wholesale-pricing-logic)

---

## 🔢 Core Multiplier Definitions

### Skill Level Multipliers
**Location**: Multiple files (see below)

```javascript
const skillMultipliers = {
  basic: 0.75,      // 75% of base rate
  standard: 1.0,    // 100% of base rate (default)
  advanced: 1.25,   // 125% of base rate
  expert: 1.5       // 150% of base rate
};
```

**Used in**:
- `src/app/api/tasks/service.js` (line 699)
- `src/app/api/processes/service.js` (line 225)
- `src/services/processes.service.js` (line 156)
- `src/utils/processes.util.js` (via `getSkillLevelMultiplier()`)

---

### Business Multiplier Formula
**Location**: `src/utils/repair-pricing.util.js` (lines 76-89)

```javascript
function applyBusinessMultiplier(basePrice, adminSettings) {
  if (!basePrice || basePrice === 0) {
    return 0;
  }
  
  if (!adminSettings?.pricing) {
    return basePrice;
  }
  
  const { 
    administrativeFee = 0.10,  // 10% default
    businessFee = 0.15,        // 15% default
    consumablesFee = 0.05      // 5% default
  } = adminSettings.pricing;
  
  const businessMultiplier = (administrativeFee + businessFee + consumablesFee) + 1;
  
  return basePrice * businessMultiplier;
}
```

**Formula**: `(administrativeFee + businessFee + consumablesFee) + 1`

**Default Total**: `(0.10 + 0.15 + 0.05) + 1 = 1.30x` (30% markup)

**Used in**:
- `src/utils/repair-pricing.util.js` - `getMetalSpecificPrice()` function
- Applied to all task, process, and material prices

---

### Material Markup Multiplier
**Location**: Multiple files

**Default Value**: `1.5` (50% markup) or `2.0` (100% markup) depending on context

**Used in**:
- `src/app/api/tasks/service.js` (line 721): `adminSettings.pricing.materialMarkup || 1.5`
- `src/app/api/processes/service.js` (line 230): `adminSettings.pricing?.materialMarkup || 1.3`
- `src/services/cascadingUpdates.service.js` (line 299): `adminSettings.pricing?.materialMarkup || 1.3`
- `src/utils/task-pricing.util.js` (line 24): `adminSettings.pricing?.materialMarkup || 2`
- `src/utils/processes.util.js` (line 695): `parseFloat(adminSettings.materialMarkup) || 1.0`

**Note**: Inconsistent defaults across files (1.0, 1.3, 1.5, 2.0) - **REVIEW NEEDED**

---

### Metal Complexity Multiplier
**Location**: Multiple files

**Default Value**: `1.0` (no adjustment)

**Used in**:
- `src/app/api/tasks/service.js` (line 726): `process.metalComplexityMultiplier || 1.0`
- `src/app/api/processes/service.js` (line 237): `parseFloat(processData.metalComplexityMultiplier) || 1.0`
- `src/services/cascadingUpdates.service.js` (line 306): `process.metalComplexityMultiplier || 1.0`
- `src/utils/processes.util.js` (line 761): `metalMultipliers[metalTypeValue] || 1.0`

**Applied to**: Process total cost (labor + materials) before final calculation

---

## 🧮 Pricing Calculation Utilities

### 1. Repair Pricing Utility
**File**: `src/utils/repair-pricing.util.js`

**Key Functions**:
- `applyBusinessMultiplier(basePrice, adminSettings)` - Applies business multiplier
- `getMetalSpecificPrice(item, repairMetalType, karat, isWholesale, adminSettings)` - Gets metal-specific pricing

**Business Multiplier Application**:
```javascript
// Applied to all price lookups:
- item.price (universal pricing)
- item.processPrice
- item.universalPricing[metalKey].retailPrice
- item.pricing.totalCost (process pricing)
- stullerProduct.pricePerPortion
- stullerProduct.markedUpPrice
```

---

### 2. Task Pricing Utility
**File**: `src/utils/task-pricing.util.js`

**Key Functions**:
- `calculateTaskPricing(taskData, selectedMetal, adminSettings)` - Main task pricing calculator
- `buildVariantPricing(metalVariantPricing, businessMultiplier, hourlyRate)` - Multi-variant pricing
- `calculateVariantPricing(taskData, metalKey, adminSettings)` - Single variant pricing

**Pricing Formula**:
```javascript
// Labor Cost
const hourlyRate = adminSettings.pricing?.wage || 40;
const processLaborCost = processLaborHours * hourlyRate;

// Material Cost
const materialMarkup = adminSettings.pricing?.materialMarkup || 2;
const materialCost = baseMaterialCost * materialMarkup;

// Base Cost
const totalBaseCost = totalLaborCost + totalMaterialsCost;

// Retail Price
const retailPrice = totalBaseCost * businessMultiplier;
```

---

### 3. Material Pricing Utility
**File**: `src/utils/material-pricing.util.js`

**Key Functions**:
- `calculateCleanPricing(stullerProduct, portionsPerUnit)` - Calculates portion-based pricing
- `getCostPerPortion(material, metalType, karat)` - Gets cost per portion
- `getPricePerPortion(material, metalType, karat)` - Gets price per portion

**Pricing Structure**:
```javascript
{
  stullerPrice: number,        // What we pay Stuller per unit
  markupRate: number,          // Our markup multiplier
  markedUpPrice: number,       // What we charge per unit
  costPerPortion: number,     // What we pay per portion (CRITICAL for cost)
  pricePerPortion: number,     // What we charge per portion (CRITICAL for pricing)
  portionsPerUnit: number
}
```

**Note**: No minimum multiplier enforcement found in this file (commit mentioned 2.0x minimum for materials)

---

### 4. Process Cost Calculation
**File**: `src/utils/processes.util.js` (lines 673-832)

**Key Function**: `calculateProcessCost(formData, adminSettings, availableMaterials)`

**Calculation Flow**:
```javascript
// 1. Base hourly rate
const baseHourlyRate = adminSettings.laborRates?.baseRate || 50;

// 2. Apply skill level multiplier
const skillMultiplier = getSkillLevelMultiplier(formData.skillLevel);
const hourlyRate = baseHourlyRate * skillMultiplier;

// 3. Calculate labor cost
const baseLaborCost = laborHours * hourlyRate;

// 4. Calculate base materials cost
const baseMaterialsCost = materials.reduce((total, material) => {
  return total + (material.estimatedCost || 0);
}, 0);

// 5. Apply material markup
const materialMarkup = parseFloat(adminSettings.materialMarkup) || 1.0;
const materialsCost = baseMaterialsCost * materialMarkup;

// 6. For metal-dependent processes:
//    - Apply metal complexity multiplier to labor
const metalComplexity = metalMultipliers[metalTypeValue] || 1.0;
const adjustedLaborCost = baseLaborCost * metalComplexity;

// 7. Calculate metal-specific material costs
const materialsCostForVariant = calculateMetalSpecificMaterials(...);

// 8. Final cost
const totalCost = adjustedLaborCost + finalMaterialsCost;
```

---

## 🔧 Service Layer Calculations

### 1. Tasks Service - Process-Based Pricing
**File**: `src/app/api/tasks/service.js` (lines 571-869)

**Function**: `calculateProcessBasedPricing(taskData)`

**Calculation Steps**:

```javascript
// 1. For each process:
const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
const skillMultiplier = skillMultipliers[process.skillLevel] || 1.0;
const hourlyRate = (adminSettings.pricing.wage || 30) * skillMultiplier;
const laborCost = laborHours * hourlyRate;

// 2. Process material costs
const rawMatCost = process.materials.reduce((total, material) => {
  return total + (material.estimatedCost || 0);
}, 0);
const processMatCost = rawMatCost * (adminSettings.pricing.materialMarkup || 1.5);

// 3. Apply metal complexity multiplier
const complexityMultiplier = process.metalComplexityMultiplier || 1.0;
const processTotal = (laborCost + processMatCost) * complexityMultiplier * quantity;

// 4. Task-level materials
// (similar calculation with materialMarkup)

// 5. Apply business formula
const materialMarkup = adminSettings.pricing.materialMarkup || 1.5;
const markedUpTaskMaterials = taskMaterialCost * materialMarkup;
const baseCost = totalProcessCost + markedUpTaskMaterials;

const businessMultiplier = (
  (adminSettings.pricing.administrativeFee || 0) + 
  (adminSettings.pricing.businessFee || 0) + 
  (adminSettings.pricing.consumablesFee || 0) + 1
);

const retailPrice = baseCost * businessMultiplier;
const wholesalePrice = retailPrice * 0.5;  // Simple 50% of retail
```

---

### 2. Process Service - Process Pricing
**File**: `src/app/api/processes/service.js` (lines 222-249)

**Function**: `calculateProcessPricing(processData, adminSettings)`

**Calculation**:
```javascript
// 1. Labor cost
const baseWage = adminSettings.pricing?.wage || 30;
const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
const hourlyRate = baseWage * (skillMultipliers[processData.skillLevel] || 1.0);
const laborCost = laborHours * hourlyRate;

// 2. Materials cost
const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
const baseMaterialsCost = (processData.materials || []).reduce((total, material) => {
  return total + (material.estimatedCost || 0);
}, 0);
const materialsCost = baseMaterialsCost * materialMarkup;

// 3. Apply metal complexity multiplier
const multiplier = parseFloat(processData.metalComplexityMultiplier) || 1.0;
const totalCost = (laborCost + materialsCost) * multiplier;
```

---

### 3. Cascading Updates Service
**File**: `src/services/cascadingUpdates.service.js`

#### Process Pricing Recalculation (lines 292-321)
```javascript
recalculateProcessPricing(process, adminSettings) {
  const laborRates = adminSettings.laborRates || { 
    basic: 22.5, standard: 30, advanced: 37.5, expert: 45 
  };
  const hourlyRate = laborRates[process.skillLevel] || laborRates.standard;
  const laborCost = (process.laborHours || 0) * hourlyRate;
  
  const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
  const baseMaterialsCost = (process.materials || []).reduce((total, material) => {
    return total + (material.estimatedCost || 0);
  }, 0);
  const materialsCost = baseMaterialsCost * materialMarkup;
  
  const multiplier = process.metalComplexityMultiplier || 1.0;
  const totalCost = (laborCost + materialsCost) * multiplier;
}
```

#### Task Pricing Recalculation (lines 326-401)
```javascript
recalculateTaskPricing(task, adminSettings) {
  // Sum labor hours and costs from processes
  // Sum material costs from processes and task materials
  
  // Apply business formula
  const markedUpMaterialCost = totalMaterialCost * (adminSettings.pricing?.materialMarkup || 1.5);
  const laborRate = adminSettings.pricing?.wage || 25;
  const fallbackLaborCost = totalLaborHours * laborRate;
  const baseCost = fallbackLaborCost + totalProcessCost + markedUpMaterialCost;
  
  const businessMultiplier = (
    (adminSettings.pricing?.administrativeFee || 0) + 
    (adminSettings.pricing?.businessFee || 0) + 
    (adminSettings.pricing?.consumablesFee || 0) + 1
  );
  
  const retailPrice = baseCost * businessMultiplier;
  const wholesalePrice = retailPrice * 0.5;  // Simple 50% of retail
}
```

---

## 🌐 API Layer Calculations

### Task Creation Page - Metal-Specific Pricing
**File**: `src/app/dashboard/admin/tasks/create/page.js` (lines 880-913)

**Calculation**:
```javascript
const materialMarkup = adminSettings.pricing?.materialMarkup || 1.5;
const markedUpMaterials = taskMaterialCostWithoutMarkup * materialMarkup;
const totalMaterialCost = markedUpMaterials + (taskMaterialCost - taskMaterialCostWithoutMarkup);

const baseCost = totalProcessCost + totalMaterialCost;

const adminFee = adminSettings.pricing?.administrativeFee || 0;
const businessFee = adminSettings.pricing?.businessFee || 0;
const consumablesFee = adminSettings.pricing?.consumablesFee || 0;
const businessMultiplier = adminFee + businessFee + consumablesFee + 1;

const retailPrice = baseCost * businessMultiplier;
const wholesalePrice = baseCost * (businessMultiplier * 0.75);  // 75% of business multiplier
```

**Note**: Different wholesale formula here (`baseCost * (businessMultiplier * 0.75)`) vs elsewhere (`retailPrice * 0.5`)

---

## 📦 Material Pricing Logic

### Material Markup Application
**Location**: Multiple files

**Default Markup Values**:
- `src/app/api/tasks/service.js`: `1.5` (50% markup)
- `src/app/api/processes/service.js`: `1.3` (30% markup)
- `src/services/cascadingUpdates.service.js`: `1.3` (30% markup)
- `src/utils/task-pricing.util.js`: `2` (100% markup)
- `src/utils/processes.util.js`: `1.0` (no markup)

**Application Pattern**:
```javascript
const baseMaterialsCost = materials.reduce((total, material) => {
  return total + (material.estimatedCost || 0);
}, 0);

const materialMarkup = adminSettings.pricing?.materialMarkup || DEFAULT_VALUE;
const materialsCost = baseMaterialsCost * materialMarkup;
```

---

## ⚙️ Process Pricing Logic

### Process Cost Components
1. **Labor Cost**: `laborHours × hourlyRate × skillMultiplier`
2. **Material Cost**: `baseMaterialCost × materialMarkup`
3. **Metal Complexity Adjustment**: `(laborCost + materialCost) × metalComplexityMultiplier`

### Process Total Cost Formula
```javascript
processTotal = (
  (laborHours × baseWage × skillMultiplier) + 
  (baseMaterialCost × materialMarkup)
) × metalComplexityMultiplier × quantity
```

---

## 📋 Task Pricing Logic

### Task Total Cost Formula
```javascript
// Step 1: Sum all process costs
totalProcessCost = Σ(processTotal for each process)

// Step 2: Sum all task-level materials
taskMaterialCost = Σ(materialCost for each material)

// Step 3: Apply material markup to task materials
markedUpTaskMaterials = taskMaterialCost × materialMarkup

// Step 4: Calculate base cost
baseCost = totalProcessCost + markedUpTaskMaterials

// Step 5: Apply business multiplier
businessMultiplier = (administrativeFee + businessFee + consumablesFee) + 1
retailPrice = baseCost × businessMultiplier

// Step 6: Calculate wholesale (varies by implementation)
wholesalePrice = retailPrice × 0.5  // OR
wholesalePrice = baseCost × (businessMultiplier × 0.75)
```

---

## 🔧 Repair Pricing Logic

### Repair Item Pricing
**Location**: `src/utils/repair-pricing.util.js`

**Function**: `getMetalSpecificPrice(item, repairMetalType, karat, isWholesale, adminSettings)`

**Price Lookup Priority**:
1. Universal price: `item.price` → apply business multiplier
2. Process price: `item.processPrice` → apply business multiplier
3. Universal pricing structure: `item.universalPricing[metalKey].retailPrice` → apply business multiplier
4. Process pricing structure: `item.pricing.totalCost[metalKey]` → apply business multiplier
5. Stuller products: `stullerProduct.pricePerPortion` or `markedUpPrice` → apply business multiplier
6. Legacy: `item.metalSpecificPricing[metalKey]` → apply business multiplier

**All prices go through**: `applyBusinessMultiplier(basePrice, adminSettings)`

---

## 💰 Wholesale Pricing Logic

### Wholesale Calculation Variations

#### Variation 1: Simple 50% of Retail
**Location**: 
- `src/app/api/tasks/service.js` (line 821)
- `src/services/cascadingUpdates.service.js` (line 376)

```javascript
const wholesalePrice = Math.round(retailPrice * 0.5 * 100) / 100;
```

#### Variation 2: 75% of Business Multiplier
**Location**: `src/app/dashboard/admin/tasks/create/page.js` (line 885)

```javascript
const wholesalePrice = baseCost * (businessMultiplier * 0.75);
```

#### Variation 3: Wholesale Formula (Mentioned in Commit)
**From commit message**: `((admin + business + consumables) ÷ 2) + 1`

**Status**: **NOT FOUND IN CODE** - May need implementation

**Expected Implementation**:
```javascript
const wholesalePrice = ((baseCost * administrativeFee) + 
                        (baseCost * businessFee) + 
                        (baseCost * consumablesFee)) / 2 + baseCost;
```

---

## ⚠️ Issues & Inconsistencies Found

### 1. Material Markup Default Values
- **Issue**: Inconsistent defaults across files (1.0, 1.3, 1.5, 2.0)
- **Impact**: Different pricing calculations depending on which code path is used
- **Recommendation**: Standardize to single default value

### 2. Wholesale Pricing Formula
- **Issue**: Three different wholesale calculation methods
- **Impact**: Inconsistent wholesale pricing
- **Recommendation**: Implement single standardized formula

### 3. Minimum Multiplier Enforcement
- **Issue**: Commit message mentions 2.0x minimum for materials, 2.0x for business, 1.5x for wholesale
- **Status**: **NOT FOUND IN CODE**
- **Recommendation**: Implement minimum enforcement as described in commit

### 4. Business Multiplier Calculation
- **Issue**: Consistent formula but applied at different stages
- **Impact**: May cause confusion in pricing breakdowns
- **Recommendation**: Document when multiplier is applied

### 5. Skill Level Multiplier
- **Issue**: Consistent values but different base wage sources
- **Impact**: Different hourly rates depending on source
- **Recommendation**: Standardize base wage source

---

## 📝 Summary of All Multipliers

| Multiplier Type | Default Value | Location | Applied To |
|----------------|---------------|----------|------------|
| **Skill Level - Basic** | 0.75x | Multiple | Hourly rate |
| **Skill Level - Standard** | 1.0x | Multiple | Hourly rate |
| **Skill Level - Advanced** | 1.25x | Multiple | Hourly rate |
| **Skill Level - Expert** | 1.5x | Multiple | Hourly rate |
| **Material Markup** | 1.0-2.0x (varies) | Multiple | Material costs |
| **Business Multiplier** | 1.30x (default) | `repair-pricing.util.js` | Base cost |
| **Metal Complexity** | 1.0x | Multiple | Process total cost |
| **Wholesale** | 0.5x retail (varies) | Multiple | Retail price |

---

## 🔍 Files Containing Job Costing Logic

### Core Utilities
- `src/utils/repair-pricing.util.js` - Business multiplier, metal-specific pricing
- `src/utils/task-pricing.util.js` - Task pricing calculations
- `src/utils/material-pricing.util.js` - Material portion pricing
- `src/utils/processes.util.js` - Process cost calculations

### Service Layer
- `src/app/api/tasks/service.js` - Task pricing service
- `src/app/api/processes/service.js` - Process pricing service
- `src/services/cascadingUpdates.service.js` - Recalculation services
- `src/services/processes.service.js` - Process service

### UI Components
- `src/app/dashboard/admin/tasks/create/page.js` - Task creation pricing
- `src/app/components/repairs/NewRepairForm.js` - Repair form pricing

---

## ✅ Review Checklist

- [ ] Standardize material markup default values
- [ ] Implement minimum multiplier enforcement (2.0x materials, 2.0x business, 1.5x wholesale)
- [ ] Standardize wholesale pricing formula
- [ ] Document all multiplier application points
- [ ] Add unit tests for all pricing calculations
- [ ] Verify business multiplier consistency across all code paths
- [ ] Review skill level multiplier application
- [ ] Validate metal complexity multiplier usage

---

**Document Generated**: 2025-01-XX  
**Last Commit Reviewed**: `fc85217` - "COMPLETE: Cascading Pricing System Optimization"

