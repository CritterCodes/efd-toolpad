# Migration Guide: Standardizing Job Costing Logic

This guide shows how to migrate existing code to use the centralized `PricingEngine` and `pricing.constants.js`.

---

## 📋 Overview

**Before**: Scattered multiplier definitions and inconsistent calculations  
**After**: Single source of truth with `PricingEngine` service

---

## 🔄 Migration Pattern

### Step 1: Import PricingEngine
```javascript
// OLD: Multiple imports from different files
import { calculateProcessPricing } from '@/utils/processes.util';
import { applyBusinessMultiplier } from '@/utils/repair-pricing.util';

// NEW: Single import
import pricingEngine from '@/services/PricingEngine';
```

### Step 2: Replace Calculation Functions
Replace all pricing calculations with PricingEngine methods.

---

## 📝 Code Examples

### Example 1: Process Cost Calculation

#### Before:
```javascript
// src/app/api/processes/service.js
static calculateProcessPricing(processData, adminSettings) {
  const laborHours = parseFloat(processData.laborHours) || 0;
  const baseWage = adminSettings.pricing?.wage || 30;
  const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
  const hourlyRate = baseWage * (skillMultipliers[processData.skillLevel] || 1.0);
  const laborCost = laborHours * hourlyRate;

  const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
  const baseMaterialsCost = (processData.materials || []).reduce((total, material) => {
    return total + (material.estimatedCost || 0);
  }, 0);
  const materialsCost = baseMaterialsCost * materialMarkup;

  const multiplier = parseFloat(processData.metalComplexityMultiplier) || 1.0;
  const totalCost = (laborCost + materialsCost) * multiplier;

  return {
    laborCost: Math.round(laborCost * 100) / 100,
    baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
    materialsCost: Math.round(materialsCost * 100) / 100,
    materialMarkup: materialMarkup,
    totalCost: Math.round(totalCost * 100) / 100,
    hourlyRate: hourlyRate,
    calculatedAt: new Date()
  };
}
```

#### After:
```javascript
// src/app/api/processes/service.js
import pricingEngine from '@/services/PricingEngine';

static calculateProcessPricing(processData, adminSettings) {
  return pricingEngine.calculateProcessCost(processData, adminSettings);
}
```

**Benefits**:
- ✅ Consistent calculations
- ✅ Minimum multiplier enforcement
- ✅ Single source of truth
- ✅ Reduced code duplication

---

### Example 2: Business Multiplier Application

#### Before:
```javascript
// src/utils/repair-pricing.util.js
function applyBusinessMultiplier(basePrice, adminSettings) {
  if (!basePrice || basePrice === 0) {
    return 0;
  }
  
  if (!adminSettings?.pricing) {
    return basePrice;
  }
  
  const { 
    administrativeFee = 0.10,
    businessFee = 0.15,
    consumablesFee = 0.05
  } = adminSettings.pricing;
  
  const businessMultiplier = (administrativeFee + businessFee + consumablesFee) + 1;
  
  return basePrice * businessMultiplier;
}
```

#### After:
```javascript
// src/utils/repair-pricing.util.js
import pricingEngine from '@/services/PricingEngine';

function applyBusinessMultiplier(basePrice, adminSettings) {
  return pricingEngine.applyBusinessMultiplier(basePrice, adminSettings);
}
```

**Benefits**:
- ✅ Minimum multiplier enforcement (2.0x)
- ✅ Consistent defaults
- ✅ Centralized logic

---

### Example 3: Task Cost Calculation

#### Before:
```javascript
// src/app/api/tasks/service.js
static async calculateProcessBasedPricing(taskData) {
  // ... 300+ lines of calculation logic ...
  const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
  const skillMultiplier = skillMultipliers[process.skillLevel] || 1.0;
  const hourlyRate = (adminSettings.pricing.wage || 30) * skillMultiplier;
  // ... more calculations ...
}
```

#### After:
```javascript
// src/app/api/tasks/service.js
import pricingEngine from '@/services/PricingEngine';

static async calculateProcessBasedPricing(taskData) {
  // Fetch admin settings
  const adminSettings = await this.getAdminSettings();
  
  // Use PricingEngine
  return pricingEngine.calculateTaskCost(taskData, adminSettings);
}
```

**Benefits**:
- ✅ Reduced from 300+ lines to ~5 lines
- ✅ Consistent calculations
- ✅ All multipliers enforced

---

### Example 4: Using Constants Directly

#### Before:
```javascript
// Multiple files with hardcoded values
const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
const materialMarkup = 1.5; // Different in different files
```

#### After:
```javascript
// Single import
import {
  SKILL_LEVEL_MULTIPLIERS,
  DEFAULT_MATERIAL_MARKUP,
  getSkillLevelMultiplier
} from '@/constants/pricing.constants';

// Use constants
const skillMultiplier = getSkillLevelMultiplier(skillLevel);
const materialMarkup = DEFAULT_MATERIAL_MARKUP;
```

---

## 🔧 File-by-File Migration

### Priority 1: Core Utilities

#### `src/utils/repair-pricing.util.js`
**Changes**:
- Replace `applyBusinessMultiplier()` to use `pricingEngine.applyBusinessMultiplier()`
- Keep function signature for backward compatibility

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';

function applyBusinessMultiplier(basePrice, adminSettings) {
  return pricingEngine.applyBusinessMultiplier(basePrice, adminSettings);
}
```

---

#### `src/utils/task-pricing.util.js`
**Changes**:
- Replace `calculateTaskPricing()` to use `pricingEngine.calculateTaskCost()`
- Keep class structure for backward compatibility

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';

export class TaskPricingUtil {
  static calculateTaskPricing(taskData, selectedMetal = null, adminSettings = {}) {
    return pricingEngine.calculateTaskCost(taskData, adminSettings);
  }
}
```

---

#### `src/utils/material-pricing.util.js`
**Changes**:
- Replace material cost calculations to use `pricingEngine.calculateMaterialCost()`
- Keep existing functions for backward compatibility

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';

export const calculateCleanPricing = (stullerProduct, portionsPerUnit = 1) => {
  // ... existing logic ...
  
  // Use PricingEngine for markup enforcement
  const material = { estimatedCost: stullerPrice };
  const cost = pricingEngine.calculateMaterialCost(material, 1, adminSettings);
  
  return {
    // ... use cost.markedUpCost ...
  };
};
```

---

#### `src/utils/processes.util.js`
**Changes**:
- Replace `calculateProcessCost()` to use `pricingEngine.calculateProcessCost()`
- Update `getSkillLevelMultiplier()` to use constants

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';
import { getSkillLevelMultiplier } from '@/constants/pricing.constants';

export const calculateProcessCost = (formData, adminSettings, availableMaterials = []) => {
  // Use PricingEngine for core calculation
  const baseCost = pricingEngine.calculateProcessCost(formData, adminSettings);
  
  // Add metal-specific logic if needed
  // ...
  
  return baseCost;
};

// Replace getSkillLevelMultiplier
export const getSkillLevelMultiplier = (skillLevel) => {
  return getSkillLevelMultiplier(skillLevel); // From constants
};
```

---

### Priority 2: Service Layer

#### `src/app/api/tasks/service.js`
**Changes**:
- Replace `calculateProcessBasedPricing()` to use `pricingEngine.calculateTaskCost()`
- Remove duplicate multiplier definitions

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';

export class TasksService {
  static async calculateProcessBasedPricing(taskData) {
    const adminSettings = await this.getAdminSettings();
    return pricingEngine.calculateTaskCost(taskData, adminSettings);
  }
}
```

---

#### `src/app/api/processes/service.js`
**Changes**:
- Replace `calculateProcessPricing()` to use `pricingEngine.calculateProcessCost()`

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';

export class ProcessService {
  static calculateProcessPricing(processData, adminSettings) {
    return pricingEngine.calculateProcessCost(processData, adminSettings);
  }
}
```

---

#### `src/services/cascadingUpdates.service.js`
**Changes**:
- Replace `recalculateProcessPricing()` and `recalculateTaskPricing()` to use PricingEngine

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';

class CascadingUpdatesService {
  recalculateProcessPricing(process, adminSettings) {
    const cost = pricingEngine.calculateProcessCost(process, adminSettings);
    return {
      ...process,
      pricing: cost
    };
  }
  
  recalculateTaskPricing(task, adminSettings) {
    const cost = pricingEngine.calculateTaskCost(task, adminSettings);
    return {
      ...task,
      pricing: cost
    };
  }
}
```

---

### Priority 3: UI Components

#### `src/app/dashboard/admin/tasks/create/page.js`
**Changes**:
- Replace inline calculations with PricingEngine
- Use constants for defaults

**Migration**:
```javascript
import pricingEngine from '@/services/PricingEngine';
import { DEFAULT_MATERIAL_MARKUP } from '@/constants/pricing.constants';

// Replace calculation logic
const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings);
```

---

## ✅ Testing Checklist

After migration, verify:

- [ ] All pricing calculations produce same results (or better with enforcement)
- [ ] Minimum multipliers are enforced
- [ ] Wholesale pricing is consistent
- [ ] No breaking changes to API responses
- [ ] UI displays correct prices
- [ ] Admin settings override defaults correctly

---

## 🚨 Breaking Changes Prevention

### Backward Compatibility Layer

Keep old function signatures and forward to PricingEngine:

```javascript
// OLD API (still works)
export function calculateProcessPricing(processData, adminSettings) {
  return pricingEngine.calculateProcessCost(processData, adminSettings);
}

// NEW API (preferred)
import pricingEngine from '@/services/PricingEngine';
pricingEngine.calculateProcessCost(processData, adminSettings);
```

---

## 📊 Migration Status Tracking

### Phase 1: Constants ✅
- [x] Create `pricing.constants.js`
- [x] Define all multipliers
- [x] Add enforcement functions

### Phase 2: PricingEngine ✅
- [x] Create `PricingEngine.js`
- [x] Implement all calculation methods
- [x] Add minimum enforcement

### Phase 3: Migration (In Progress)
- [ ] `src/utils/repair-pricing.util.js`
- [ ] `src/utils/task-pricing.util.js`
- [ ] `src/utils/material-pricing.util.js`
- [ ] `src/utils/processes.util.js`
- [ ] `src/app/api/tasks/service.js`
- [ ] `src/app/api/processes/service.js`
- [ ] `src/services/cascadingUpdates.service.js`

### Phase 4: Cleanup
- [ ] Remove duplicate code
- [ ] Update documentation
- [ ] Add deprecation warnings

---

## 🎯 Success Criteria

- ✅ Zero duplicate multiplier definitions
- ✅ All calculations use PricingEngine
- ✅ Minimum multipliers enforced everywhere
- ✅ Consistent wholesale pricing
- ✅ 100% backward compatibility
- ✅ All tests passing

---

**Last Updated**: Based on standardization plan  
**Status**: Ready for implementation

