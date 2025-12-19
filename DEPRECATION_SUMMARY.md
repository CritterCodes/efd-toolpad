# Pricing Functions Deprecation Summary

## ✅ Deprecated Functions (Now Use PricingEngine)

All deprecated functions now call `PricingEngine` internally for backward compatibility while maintaining consistent calculations.

---

## 📋 Deprecated Functions

### 1. `repair-pricing.util.js`

#### `applyBusinessMultiplier(basePrice, adminSettings)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.applyBusinessMultiplier(basePrice, adminSettings)`
- **Location**: `src/utils/repair-pricing.util.js:76`
- **Action**: Now calls PricingEngine internally

---

### 2. `task-pricing.util.js`

#### `TaskPricingUtil.calculateTaskPricing(taskData, selectedMetal, adminSettings)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.calculateTaskCost(taskData, adminSettings)`
- **Location**: `src/utils/task-pricing.util.js:23`
- **Action**: Now calls PricingEngine internally, transforms output for backward compatibility

---

### 3. `processes.service.js`

#### `ProcessesService.calculateProcessPricing(processData, adminSettings)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.calculateProcessCost(processData, adminSettings)`
- **Location**: `src/services/processes.service.js:153`
- **Action**: Now calls PricingEngine internally

---

### 4. `api/processes/service.js`

#### `ProcessService.calculateProcessPricing(processData, adminSettings)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.calculateProcessCost(processData, adminSettings)`
- **Location**: `src/app/api/processes/service.js:222`
- **Action**: Now calls PricingEngine internally

---

### 5. `cascadingUpdates.service.js`

#### `CascadingUpdatesService.recalculateProcessPricing(process, adminSettings)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.calculateProcessCost(process, adminSettings)`
- **Location**: `src/services/cascadingUpdates.service.js:292`
- **Action**: Now calls PricingEngine internally

#### `CascadingUpdatesService.recalculateTaskPricing(task, adminSettings)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.calculateTaskCost(task, adminSettings)`
- **Location**: `src/services/cascadingUpdates.service.js:326`
- **Action**: Now calls PricingEngine internally

---

### 6. `api/tasks/service.js`

#### `TasksService.calculateProcessBasedPricing(taskData)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.calculateTaskCost(taskData, adminSettings)`
- **Location**: `src/app/api/tasks/service.js:571`
- **Action**: Now calls PricingEngine internally (after fetching admin settings)

---

### 7. `processes.util.js`

#### `calculateProcessCost(formData, adminSettings, availableMaterials)`
- **Status**: ✅ Deprecated
- **Replacement**: `PricingEngine.calculateProcessCost(formData, adminSettings)`
- **Location**: `src/utils/processes.util.js:673`
- **Action**: Now calls PricingEngine internally

---

## 🔄 Migration Path

### Step 1: Update Imports
```javascript
// OLD
import { calculateProcessPricing } from '@/services/processes.service';
import { TaskPricingUtil } from '@/utils/task-pricing.util';

// NEW
import pricingEngine from '@/services/PricingEngine';
```

### Step 2: Update Function Calls
```javascript
// OLD
const pricing = calculateProcessPricing(processData, adminSettings);
const taskPricing = TaskPricingUtil.calculateTaskPricing(taskData, null, adminSettings);

// NEW
const pricing = pricingEngine.calculateProcessCost(processData, adminSettings);
const taskPricing = pricingEngine.calculateTaskCost(taskData, adminSettings);
```

---

## ⚠️ Deprecation Warnings

All deprecated functions now log warnings to the console:
```
⚠️ DEPRECATED: [FunctionName]() - Please migrate to PricingEngine.[MethodName]()
```

These warnings help identify code that needs migration.

---

## ✅ Backward Compatibility

All deprecated functions:
- ✅ Still work exactly as before
- ✅ Call PricingEngine internally
- ✅ Return same data structure
- ✅ Log deprecation warnings
- ✅ Will be removed in future version

---

## 📊 Files Updated

1. ✅ `src/utils/repair-pricing.util.js` - `applyBusinessMultiplier()`
2. ✅ `src/utils/task-pricing.util.js` - `calculateTaskPricing()`
3. ✅ `src/services/processes.service.js` - `calculateProcessPricing()`
4. ✅ `src/app/api/processes/service.js` - `calculateProcessPricing()`
5. ✅ `src/services/cascadingUpdates.service.js` - `recalculateProcessPricing()`, `recalculateTaskPricing()`
6. ✅ `src/app/api/tasks/service.js` - `calculateProcessBasedPricing()`
7. ✅ `src/utils/processes.util.js` - `calculateProcessCost()`

---

## 🎯 Next Steps

1. **Monitor Deprecation Warnings**: Check console for deprecated function usage
2. **Gradual Migration**: Update code to use PricingEngine directly
3. **Remove Deprecated Functions**: After all code is migrated (future version)

---

**Status**: ✅ All functions deprecated and updated  
**Backward Compatibility**: ✅ Maintained  
**Migration**: In Progress

