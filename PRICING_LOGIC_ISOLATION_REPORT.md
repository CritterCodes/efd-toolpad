# Pricing Logic Isolation Report

Complete analysis of all pricing calculations not yet using PricingEngine.

---

## 🔍 Files with Inline Pricing Calculations

### 1. **`src/app/dashboard/admin/tasks/create/page.js`**

#### Location 1: Lines 545-586 (calculateMetalSpecificPricing function)
**Code**:
```javascript
let totalProcessCost = 0;
// ... process cost accumulation ...
totalProcessCost += process.pricing.totalCost * quantity;

// Material markup
const materialMarkup = adminSettings.pricing?.materialMarkup || 1.5;
const markedUpMaterials = taskMaterialCostWithoutMarkup * materialMarkup;

// Base cost
const baseCost = totalProcessCost + totalMaterialCost;

// Business multiplier
const adminFee = adminSettings.pricing?.administrativeFee || 0;
const businessFee = adminSettings.pricing?.businessFee || 0;
const consumablesFee = adminSettings.pricing?.consumablesFee || 0;
const businessMultiplier = adminFee + businessFee + consumablesFee + 1;

// Retail and wholesale
const retailPrice = baseCost * businessMultiplier;
const wholesalePrice = baseCost * (businessMultiplier * 0.75);
```

**Issues**:
- ❌ Inline business multiplier (no minimum enforcement)
- ❌ Inline wholesale calculation (inconsistent formula)
- ❌ Inline material markup (no minimum enforcement)
- ❌ Manual process cost accumulation

**Recommendation**: Replace entire function with `PricingEngine.calculateTaskCost()`

---

#### Location 2: Lines 880-914 (Debug calculation section)
**Code**:
```javascript
const businessMultiplier = adminFee + businessFee + consumablesFee + 1;
const retailPrice = baseCost * businessMultiplier;
const wholesalePrice = baseCost * (businessMultiplier * 0.75);
```

**Issues**: Same as Location 1

---

### 2. **`src/app/dashboard/admin/tasks/process-based/page.js`**

#### Location: Lines 220-252 (calculatePricePreview function)
**Code**:
```javascript
const markedUpTaskMaterials = taskMaterialCost * (adminSettings.pricing.materialMarkup || 1.5);
const baseCost = totalProcessCost + markedUpTaskMaterials;

const businessMultiplier = (
  (adminSettings.pricing?.administrativeFee || 0) + 
  (adminSettings.pricing?.businessFee || 0) + 
  (adminSettings.pricing?.consumablesFee || 0) + 1
);

const retailPrice = Math.round(baseCost * businessMultiplier * 100) / 100;
const wholesalePrice = Math.round(retailPrice * 0.5 * 100) / 100;
```

**Issues**:
- ❌ Inline business multiplier
- ❌ Different wholesale formula (`retailPrice * 0.5` vs `baseCost * (businessMultiplier * 0.75)`)
- ❌ Inline material markup
- ❌ No minimum enforcement

**Recommendation**: Replace with `PricingEngine.calculateTaskCost()`

---

### 3. **`src/app/api/admin/settings/pricing-impact/route.js`**

#### Location: Lines 61-69
**Code**:
```javascript
const laborCost = task.laborHours * pricing.wage;
const materialMarkup = task.materialCost * 1.5;  // Hardcoded!
const subtotal = laborCost + materialMarkup;

const businessMultiplier = pricing.administrativeFee + 
                           pricing.businessFee + 
                           pricing.consumablesFee + 1;

const newPrice = Math.round(subtotal * businessMultiplier * 100) / 100;
```

**Issues**:
- ❌ Hardcoded material markup (1.5)
- ❌ Simplified calculation (doesn't use process-based pricing)
- ❌ Inline business multiplier
- ❌ No minimum enforcement
- ❌ Doesn't account for metal complexity, skill levels, etc.

**Recommendation**: Use `PricingEngine.calculateTaskCost()` for accurate impact analysis

---

### 4. **`src/app/api/processes/bulk-update-pricing/route.js`**

#### Location: Lines 24-41
**Code**:
```javascript
const laborRates = adminSettings.laborRates || { basic: 22.5, standard: 30, advanced: 37.5, expert: 45 };
const hourlyRate = laborRates[process.skillLevel] || laborRates.standard;
const laborCost = (process.laborHours || 0) * hourlyRate;

const baseMaterialsCost = (process.materials || []).reduce((total, material) => {
  return total + (material.estimatedCost || 0);
}, 0);
const materialsCost = baseMaterialsCost * materialMarkup;

const multiplier = process.metalComplexityMultiplier || 1.0;
const totalCost = (laborCost + materialsCost) * multiplier;
```

**Issues**:
- ❌ Inline labor rate lookup (should use constants)
- ❌ Inline material markup
- ❌ Inline metal complexity multiplier
- ❌ No minimum enforcement
- ❌ Hardcoded labor rates

**Recommendation**: Use `PricingEngine.calculateProcessCost()`

---

### 5. **`src/app/api/materials/bulk-update-pricing/route.js`**

#### Location: Lines 28-33
**Code**:
```javascript
const materialMarkup = adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup || 1.3;
const basePrice = material.basePrice || material.costPerPortion || 0;
const newCostPerPortion = basePrice * materialMarkup;
```

**Issues**:
- ❌ Inline material markup
- ❌ No minimum enforcement
- ❌ Inconsistent default (1.3 vs 2.0)

**Recommendation**: Use `PricingEngine.calculateMaterialCost()`

---

### 6. **`src/app/components/repairs/NewRepairForm.js`**

#### Location: Line 558
**Code**:
```javascript
const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
const basePrice = stullerData.data.price || 0;
const markedUpPrice = basePrice * materialMarkup;
```

**Issues**:
- ❌ Inline material markup
- ❌ No minimum enforcement
- ❌ Inconsistent default (1.3 vs 2.0)

**Recommendation**: Use `PricingEngine.calculateMaterialCost()`

---

## 📊 Detailed Analysis

### Business Multiplier Calculations (3 instances)

| File | Line | Formula | Issue |
|------|------|---------|-------|
| `create/page.js` | 882, 911 | `adminFee + businessFee + consumablesFee + 1` | No minimum enforcement |
| `process-based/page.js` | 231-235 | Same | No minimum enforcement |
| `pricing-impact/route.js` | 65-67 | Same | No minimum enforcement |

**All should use**: `PricingEngine.applyBusinessMultiplier()` or `PricingEngine.getBusinessMultiplier()`

---

### Wholesale Price Calculations (2 instances, different formulas)

| File | Line | Formula | Issue |
|------|------|---------|-------|
| `create/page.js` | 885, 914 | `baseCost * (businessMultiplier * 0.75)` | Inconsistent formula |
| `process-based/page.js` | 252 | `retailPrice * 0.5` | Different formula |

**All should use**: `PricingEngine.calculateWholesalePrice()`

---

### Material Markup Applications (4 instances)

| File | Line | Default | Issue |
|------|------|---------|-------|
| `create/page.js` | 902 | 1.5 | No minimum enforcement |
| `process-based/page.js` | 220 | 1.5 | No minimum enforcement |
| `bulk-update-pricing/route.js` | 28 | 1.3 | Inconsistent default |
| `NewRepairForm.js` | 558 | 1.3 | Inconsistent default |

**All should use**: `PricingEngine.calculateMaterialCost()` (enforces 2.0x minimum)

---

### Process Cost Calculations (1 instance)

| File | Line | Issue |
|------|------|-------|
| `bulk-update-pricing/route.js` | 24-41 | Manual calculation, no minimum enforcement |

**Should use**: `PricingEngine.calculateProcessCost()`

---

## 🎯 Migration Recommendations

### Priority 1: UI Components (High Impact)

#### `src/app/dashboard/admin/tasks/create/page.js`
**Function**: `calculateMetalSpecificPricing()`
**Lines**: 482-946
**Action**: Replace entire calculation with `PricingEngine.calculateTaskCost()`

**Before**:
```javascript
const businessMultiplier = adminFee + businessFee + consumablesFee + 1;
const retailPrice = baseCost * businessMultiplier;
const wholesalePrice = baseCost * (businessMultiplier * 0.75);
```

**After**:
```javascript
import pricingEngine from '@/services/PricingEngine';

const taskData = { processes: [...], materials: [...] };
const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings);
// pricing.retailPrice and pricing.wholesalePrice are already calculated
```

---

#### `src/app/dashboard/admin/tasks/process-based/page.js`
**Function**: `calculatePricePreview()`
**Lines**: 93-286
**Action**: Replace calculation with `PricingEngine.calculateTaskCost()`

**Before**:
```javascript
const businessMultiplier = (adminFee + businessFee + consumablesFee) + 1;
const retailPrice = baseCost * businessMultiplier;
const wholesalePrice = retailPrice * 0.5;
```

**After**:
```javascript
import pricingEngine from '@/services/PricingEngine';

const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings);
// Use pricing.retailPrice and pricing.wholesalePrice
```

---

### Priority 2: API Routes (Medium Impact)

#### `src/app/api/admin/settings/pricing-impact/route.js`
**Function**: Impact analysis calculation
**Lines**: 61-69
**Action**: Use `PricingEngine.calculateTaskCost()` for accurate analysis

**Before**:
```javascript
const laborCost = task.laborHours * pricing.wage;
const materialMarkup = task.materialCost * 1.5;  // Hardcoded!
const newPrice = subtotal * businessMultiplier;
```

**After**:
```javascript
import pricingEngine from '@/services/PricingEngine';

const pricing = pricingEngine.calculateTaskCost(task, { pricing });
const newPrice = pricing.retailPrice;
```

---

#### `src/app/api/processes/bulk-update-pricing/route.js`
**Function**: Bulk process pricing update
**Lines**: 24-41
**Action**: Use `PricingEngine.calculateProcessCost()`

**Before**:
```javascript
const hourlyRate = laborRates[process.skillLevel] || laborRates.standard;
const laborCost = process.laborHours * hourlyRate;
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

#### `src/app/api/materials/bulk-update-pricing/route.js`
**Function**: Bulk material pricing update
**Lines**: 28-33
**Action**: Use `PricingEngine.calculateMaterialCost()`

**Before**:
```javascript
const newCostPerPortion = basePrice * materialMarkup;
```

**After**:
```javascript
import pricingEngine from '@/services/PricingEngine';

const cost = pricingEngine.calculateMaterialCost(material, 1, adminSettings);
const newCostPerPortion = cost.markedUpCost;
```

---

### Priority 3: UI Helpers (Low Impact)

#### `src/app/components/repairs/NewRepairForm.js`
**Function**: Material markup in Stuller import
**Line**: 558
**Action**: Use `PricingEngine.calculateMaterialCost()`

**Before**:
```javascript
const markedUpPrice = basePrice * materialMarkup;
```

**After**:
```javascript
import pricingEngine from '@/services/PricingEngine';

const material = { estimatedCost: basePrice };
const cost = pricingEngine.calculateMaterialCost(material, 1, adminSettings);
const markedUpPrice = cost.markedUpCost;
```

---

## 📈 Impact Summary

### Files Requiring Migration: 6
1. ✅ `src/app/dashboard/admin/tasks/create/page.js` - **HIGH PRIORITY**
2. ✅ `src/app/dashboard/admin/tasks/process-based/page.js` - **HIGH PRIORITY**
3. ✅ `src/app/api/admin/settings/pricing-impact/route.js` - **MEDIUM PRIORITY**
4. ✅ `src/app/api/processes/bulk-update-pricing/route.js` - **MEDIUM PRIORITY**
5. ✅ `src/app/api/materials/bulk-update-pricing/route.js` - **MEDIUM PRIORITY**
6. ✅ `src/app/components/repairs/NewRepairForm.js` - **LOW PRIORITY**

### Inline Calculations Found: ~15+
- Business multiplier: 3 instances
- Wholesale price: 2 instances (different formulas)
- Material markup: 4 instances
- Process cost: 1 instance
- Labor cost: 1 instance
- Task cost: 2 instances (partial)

---

## ✅ Benefits of Migration

1. **Consistency**: All pricing uses same formulas
2. **Minimum Enforcement**: All multipliers enforced to minimums
3. **Maintainability**: Single place to update pricing logic
4. **Accuracy**: Proper handling of edge cases
5. **Testing**: Centralized logic is easier to test

---

**Status**: ⚠️ 6 files need migration  
**Estimated Effort**: 2-3 hours  
**Priority**: High (UI) → Medium (API) → Low (Helpers)

