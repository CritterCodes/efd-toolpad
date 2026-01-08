# Remaining Pricing Logic Not Using PricingEngine

This document identifies all pricing calculations in the codebase that are not yet using the centralized `PricingEngine`.

---

## 🔍 Files with Inline Pricing Calculations

### 1. **`src/app/dashboard/admin/tasks/create/page.js`**

**Location**: Lines 880-914, 902-914

**Pricing Logic Found**:
```javascript
// Business multiplier calculation
const adminFee = adminSettings.pricing?.administrativeFee || 0;
const businessFee = adminSettings.pricing?.businessFee || 0;
const consumablesFee = adminSettings.pricing?.consumablesFee || 0;
const businessMultiplier = adminFee + businessFee + consumablesFee + 1;

// Retail price calculation
const retailPrice = baseCost * businessMultiplier;

// Wholesale price calculation (inconsistent formula)
const wholesalePrice = baseCost * (businessMultiplier * 0.75);

// Material markup calculation
const materialMarkup = adminSettings.pricing?.materialMarkup || 1.5;
const markedUpMaterials = taskMaterialCostWithoutMarkup * materialMarkup;
```

**Issues**:
- ❌ Inline business multiplier calculation (should use `PricingEngine.applyBusinessMultiplier()`)
- ❌ Inline wholesale calculation with inconsistent formula (should use `PricingEngine.calculateWholesalePrice()`)
- ❌ Inline material markup (should use `PricingEngine.calculateMaterialCost()`)
- ❌ No minimum multiplier enforcement

**Recommendation**: Replace with `PricingEngine.calculateTaskCost()` or individual methods

---

### 2. **`src/app/dashboard/admin/tasks/process-based/page.js`**

**Location**: Lines 220-252

**Pricing Logic Found**:
```javascript
// Material markup
const markedUpTaskMaterials = taskMaterialCost * (adminSettings.pricing.materialMarkup || 1.5);

// Base cost calculation
const baseCost = totalProcessCost + markedUpTaskMaterials;

// Business multiplier calculation
const businessMultiplier = (
  (adminSettings.pricing?.administrativeFee || 0) + 
  (adminSettings.pricing?.businessFee || 0) + 
  (adminSettings.pricing?.consumablesFee || 0) + 1
);

// Retail price calculation
const retailPrice = Math.round(baseCost * businessMultiplier * 100) / 100;

// Wholesale price calculation (different formula)
const wholesalePrice = Math.round(retailPrice * 0.5 * 100) / 100;
```

**Issues**:
- ❌ Inline business multiplier calculation
- ❌ Inline wholesale calculation (50% of retail, different from create/page.js)
- ❌ Inline material markup
- ❌ No minimum multiplier enforcement

**Recommendation**: Replace with `PricingEngine.calculateTaskCost()`

---

### 3. **`src/app/api/admin/settings/pricing-impact/route.js`**

**Location**: Lines 61-69

**Pricing Logic Found**:
```javascript
// Labor cost calculation
const laborCost = task.laborHours * pricing.wage;

// Material markup (hardcoded 1.5)
const materialMarkup = task.materialCost * 1.5;

// Subtotal
const subtotal = laborCost + materialMarkup;

// Business multiplier calculation
const businessMultiplier = pricing.administrativeFee + 
                           pricing.businessFee + 
                           pricing.consumablesFee + 1;

// New price calculation
const newPrice = Math.round(subtotal * businessMultiplier * 100) / 100;
```

**Issues**:
- ❌ Hardcoded material markup (1.5) instead of using admin settings
- ❌ Inline business multiplier calculation
- ❌ Simplified calculation (doesn't account for process costs, metal complexity, etc.)
- ❌ No minimum multiplier enforcement

**Recommendation**: Use `PricingEngine.calculateTaskCost()` for accurate impact analysis

---

### 4. **`src/app/api/processes/bulk-update-pricing/route.js`**

**Location**: Lines 24-41

**Pricing Logic Found**:
```javascript
// Labor rates lookup
const laborRates = adminSettings.laborRates || { basic: 22.5, standard: 30, advanced: 37.5, expert: 45 };
const hourlyRate = laborRates[process.skillLevel] || laborRates.standard;

// Labor cost calculation
const laborCost = (process.laborHours || 0) * hourlyRate;

// Materials cost calculation
const baseMaterialsCost = (process.materials || []).reduce((total, material) => {
  return total + (material.estimatedCost || 0);
}, 0);
const materialsCost = baseMaterialsCost * materialMarkup;

// Total cost with complexity multiplier
const multiplier = process.metalComplexityMultiplier || 1.0;
const totalCost = (laborCost + materialsCost) * multiplier;
```

**Issues**:
- ❌ Inline labor rate calculation (should use `PricingEngine.getHourlyRateForSkill()`)
- ❌ Inline material markup application
- ❌ Inline metal complexity multiplier application
- ❌ No minimum multiplier enforcement

**Recommendation**: Use `PricingEngine.calculateProcessCost()`

---

### 5. **`src/app/api/materials/bulk-update-pricing/route.js`**

**Location**: Lines 28-33

**Pricing Logic Found**:
```javascript
// Material markup application
const materialMarkup = adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup || 1.3;
const basePrice = material.basePrice || material.costPerPortion || 0;
const newCostPerPortion = basePrice * materialMarkup;
```

**Issues**:
- ❌ Inline material markup application
- ❌ No minimum multiplier enforcement
- ❌ Inconsistent default (1.3 vs 2.0 standard)

**Recommendation**: Use `PricingEngine.calculateMaterialCost()`

---

### 6. **`src/app/components/repairs/NewRepairForm.js`**

**Location**: Line 558

**Pricing Logic Found**:
```javascript
// Material markup calculation
const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
const basePrice = stullerData.data.price || 0;
const markedUpPrice = basePrice * materialMarkup;
```

**Issues**:
- ❌ Inline material markup application
- ❌ No minimum multiplier enforcement
- ❌ Inconsistent default (1.3 vs 2.0 standard)

**Recommendation**: Use `PricingEngine.calculateMaterialCost()`

---

## 📊 Summary of Issues

### Inline Calculations Found
1. ✅ Business multiplier calculations (3 files)
2. ✅ Wholesale price calculations (2 files, different formulas)
3. ✅ Material markup applications (4 files)
4. ✅ Labor cost calculations (1 file)
5. ✅ Process cost calculations (1 file)

### Inconsistencies
- **Material Markup Defaults**: 1.3, 1.5, 2.0 (should be 2.0 standard)
- **Wholesale Formulas**: 
  - `baseCost * (businessMultiplier * 0.75)` in create/page.js
  - `retailPrice * 0.5` in process-based/page.js
  - Should use `PricingEngine.calculateWholesalePrice()`

### Missing Features
- ❌ No minimum multiplier enforcement in any inline calculations
- ❌ No consistent error handling
- ❌ No validation of admin settings

---

## 🎯 Migration Priority

### High Priority (UI Components)
1. **`src/app/dashboard/admin/tasks/create/page.js`**
   - Large inline calculation function
   - Used in task creation UI
   - Multiple pricing formulas

2. **`src/app/dashboard/admin/tasks/process-based/page.js`**
   - Price preview calculation
   - Used in process-based task builder
   - Different wholesale formula

### Medium Priority (API Routes)
3. **`src/app/api/admin/settings/pricing-impact/route.js`**
   - Impact analysis calculations
   - Should use accurate pricing for analysis

4. **`src/app/api/processes/bulk-update-pricing/route.js`**
   - Bulk update operations
   - Should use consistent pricing

5. **`src/app/api/materials/bulk-update-pricing/route.js`**
   - Bulk update operations
   - Should use consistent pricing

### Low Priority (UI Helpers)
6. **`src/app/components/repairs/NewRepairForm.js`**
   - Single material markup calculation
   - Quick fix

---

## ✅ Recommended Actions

### For Each File:

1. **Import PricingEngine**
   ```javascript
   import pricingEngine from '@/services/PricingEngine';
   ```

2. **Replace Inline Calculations**
   - Business multiplier → `pricingEngine.applyBusinessMultiplier()`
   - Wholesale price → `pricingEngine.calculateWholesalePrice()`
   - Material cost → `pricingEngine.calculateMaterialCost()`
   - Process cost → `pricingEngine.calculateProcessCost()`
   - Task cost → `pricingEngine.calculateTaskCost()`

3. **Add Deprecation Comments**
   - Document old calculation method
   - Note migration to PricingEngine

---

## 📝 Example Migrations

### Example 1: Task Creation Page
**Before**:
```javascript
const businessMultiplier = adminFee + businessFee + consumablesFee + 1;
const retailPrice = baseCost * businessMultiplier;
const wholesalePrice = baseCost * (businessMultiplier * 0.75);
```

**After**:
```javascript
import pricingEngine from '@/services/PricingEngine';

const retailPrice = pricingEngine.applyBusinessMultiplier(baseCost, adminSettings);
const wholesalePrice = pricingEngine.calculateWholesalePrice(retailPrice, baseCost, adminSettings);
```

### Example 2: Bulk Update Route
**Before**:
```javascript
const hourlyRate = laborRates[process.skillLevel] || laborRates.standard;
const laborCost = (process.laborHours || 0) * hourlyRate;
const materialsCost = baseMaterialsCost * materialMarkup;
const totalCost = (laborCost + materialsCost) * multiplier;
```

**After**:
```javascript
import pricingEngine from '@/services/PricingEngine';

const pricing = pricingEngine.calculateProcessCost(process, adminSettings);
const totalCost = pricing.totalCost;
```

---

## 🔢 Statistics

- **Files with Inline Pricing**: 6
- **Inline Business Multiplier Calculations**: 3
- **Inline Wholesale Calculations**: 2 (different formulas)
- **Inline Material Markup**: 4
- **Inline Process Calculations**: 1
- **Total Inline Calculations**: ~15+ instances

---

**Status**: ⚠️ Needs Migration  
**Priority**: High (UI components) to Medium (API routes)  
**Estimated Effort**: 2-3 hours for complete migration

