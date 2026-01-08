# Job Costing Logic - Quick Reference

Quick reference guide to all job costing logic locations in the codebase.

## 🔢 Multiplier Definitions

### Skill Level Multipliers
```javascript
{ basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 }
```

**Locations**:
- `src/app/api/tasks/service.js:699`
- `src/app/api/processes/service.js:225`
- `src/services/processes.service.js:156`
- `src/utils/processes.util.js` (via `getSkillLevelMultiplier()`)

### Business Multiplier
```javascript
(administrativeFee + businessFee + consumablesFee) + 1
```

**Default**: `(0.10 + 0.15 + 0.05) + 1 = 1.30x`

**Locations**:
- `src/utils/repair-pricing.util.js:76-89` (function definition)
- `src/app/api/tasks/service.js:814-818`
- `src/services/cascadingUpdates.service.js:369-373`
- `src/app/dashboard/admin/tasks/create/page.js:908-911`

### Material Markup
**Default Values** (varies by file):
- `1.0` - `src/utils/processes.util.js:695`
- `1.3` - `src/app/api/processes/service.js:230`, `src/services/cascadingUpdates.service.js:299`
- `1.5` - `src/app/api/tasks/service.js:721,810`
- `2.0` - `src/utils/task-pricing.util.js:24`

### Metal Complexity Multiplier
**Default**: `1.0`

**Locations**:
- `src/app/api/tasks/service.js:726`
- `src/app/api/processes/service.js:237`
- `src/services/cascadingUpdates.service.js:306`
- `src/utils/processes.util.js:761`

---

## 📊 Pricing Calculation Functions

### Repair Pricing
**File**: `src/utils/repair-pricing.util.js`

- `applyBusinessMultiplier()` - **Lines 76-89**
- `getMetalSpecificPrice()` - **Lines 100-234**

### Task Pricing
**File**: `src/utils/task-pricing.util.js`

- `calculateTaskPricing()` - **Lines 14-201**
- `buildVariantPricing()` - **Lines 206-244**
- `calculateVariantPricing()` - **Lines 275-290**

### Material Pricing
**File**: `src/utils/material-pricing.util.js`

- `calculateCleanPricing()` - **Lines 13-38**
- `getCostPerPortion()` - **Lines 75-96**
- `getPricePerPortion()` - **Lines 105-129**

### Process Cost Calculation
**File**: `src/utils/processes.util.js`

- `calculateProcessCost()` - **Lines 673-832**

---

## 🔧 Service Layer Functions

### Tasks Service
**File**: `src/app/api/tasks/service.js`

- `calculateProcessBasedPricing()` - **Lines 571-869**
  - Skill multiplier: **Line 699**
  - Material markup: **Line 721**
  - Metal complexity: **Line 726**
  - Business multiplier: **Lines 814-818**
  - Wholesale: **Line 821**

### Process Service
**File**: `src/app/api/processes/service.js`

- `calculateProcessPricing()` - **Lines 222-249**
  - Skill multiplier: **Line 225**
  - Material markup: **Line 230**
  - Metal complexity: **Line 237**

### Cascading Updates Service
**File**: `src/services/cascadingUpdates.service.js`

- `recalculateProcessPricing()` - **Lines 292-321**
- `recalculateTaskPricing()` - **Lines 326-401**
  - Business multiplier: **Lines 369-373**
  - Wholesale: **Line 376**

---

## 💰 Wholesale Pricing Formulas

### Formula 1: 50% of Retail
```javascript
wholesalePrice = retailPrice * 0.5
```
**Locations**:
- `src/app/api/tasks/service.js:821`
- `src/services/cascadingUpdates.service.js:376`

### Formula 2: 75% of Business Multiplier
```javascript
wholesalePrice = baseCost * (businessMultiplier * 0.75)
```
**Location**:
- `src/app/dashboard/admin/tasks/create/page.js:885`

### Formula 3: Expected (Not Found)
```javascript
wholesalePrice = ((admin + business + consumables) / 2) + 1
```
**Status**: Mentioned in commit but not implemented

---

## 📋 Pricing Formula Summary

### Process Cost
```
processTotal = (
  (laborHours × baseWage × skillMultiplier) + 
  (baseMaterialCost × materialMarkup)
) × metalComplexityMultiplier × quantity
```

### Task Cost
```
baseCost = totalProcessCost + (taskMaterialCost × materialMarkup)
retailPrice = baseCost × businessMultiplier
wholesalePrice = retailPrice × 0.5  (varies)
```

### Business Multiplier
```
businessMultiplier = (administrativeFee + businessFee + consumablesFee) + 1
```

---

## ⚠️ Known Issues

1. **Material Markup Inconsistency**: Defaults range from 1.0 to 2.0
2. **Wholesale Formula Inconsistency**: Three different formulas in use
3. **Minimum Multiplier Enforcement**: Not implemented (mentioned in commit)
4. **Wholesale Formula from Commit**: Not found in codebase

---

## 📁 All Files with Job Costing Logic

### Core Utilities
- `src/utils/repair-pricing.util.js`
- `src/utils/task-pricing.util.js`
- `src/utils/material-pricing.util.js`
- `src/utils/processes.util.js`

### Service Layer
- `src/app/api/tasks/service.js`
- `src/app/api/processes/service.js`
- `src/services/cascadingUpdates.service.js`
- `src/services/processes.service.js`

### UI Components
- `src/app/dashboard/admin/tasks/create/page.js`
- `src/app/components/repairs/NewRepairForm.js`

---

**Last Updated**: Based on commit `fc85217`

