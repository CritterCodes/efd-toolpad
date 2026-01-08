# Job Costing Standardization Plan

## 🎯 Objective
Standardize all job costing logic into consistent single-source definitions following SOLID principles.

---

## 📋 Architecture Overview

### Single Source of Truth Structure
```
src/
├── constants/
│   └── pricing.constants.js          # All multiplier definitions
├── services/
│   └── PricingEngine.js              # Centralized pricing calculations
└── utils/
    └── pricing-helpers.js            # Helper functions (deprecated, use PricingEngine)
```

---

## 🔧 Implementation Steps

### Phase 1: Create Centralized Constants ✅
**File**: `src/constants/pricing.constants.js`

**Purpose**: Single source for all multiplier definitions and defaults

**Contents**:
- Skill level multipliers
- Material markup defaults
- Business multiplier defaults
- Metal complexity multipliers
- Minimum multiplier enforcement values
- Wholesale pricing formulas

---

### Phase 2: Create Unified Pricing Engine ✅
**File**: `src/services/PricingEngine.js`

**Purpose**: Centralized service for all pricing calculations

**Responsibilities** (Single Responsibility Principle):
- Calculate process costs
- Calculate material costs
- Calculate task costs
- Apply business multipliers
- Calculate wholesale prices
- Enforce minimum multipliers

**Methods**:
- `calculateProcessCost(process, adminSettings)`
- `calculateMaterialCost(material, quantity, adminSettings)`
- `calculateTaskCost(task, adminSettings)`
- `applyBusinessMultiplier(baseCost, adminSettings)`
- `calculateWholesalePrice(retailPrice, baseCost, adminSettings)`
- `enforceMinimumMultipliers(cost, type, adminSettings)`

---

### Phase 3: Refactor Existing Code
**Strategy**: Gradual migration with backward compatibility

**Files to Update**:
1. `src/utils/repair-pricing.util.js` → Use `PricingEngine`
2. `src/utils/task-pricing.util.js` → Use `PricingEngine`
3. `src/utils/material-pricing.util.js` → Use `PricingEngine`
4. `src/utils/processes.util.js` → Use `PricingEngine`
5. `src/app/api/tasks/service.js` → Use `PricingEngine`
6. `src/app/api/processes/service.js` → Use `PricingEngine`
7. `src/services/cascadingUpdates.service.js` → Use `PricingEngine`

---

### Phase 4: Update Admin Settings Context
**File**: `src/context/AdminSettingsContext.js`

**Changes**:
- Use constants from `pricing.constants.js` for defaults
- Ensure consistency with PricingEngine

---

## ✅ GO / NO GO Checklist

### GO Criteria:
- [ ] All multiplier definitions in single constants file
- [ ] PricingEngine implements all calculation methods
- [ ] Minimum multiplier enforcement implemented
- [ ] Wholesale pricing formula standardized
- [ ] All existing code refactored to use PricingEngine
- [ ] Unit tests for all pricing calculations
- [ ] Backward compatibility maintained
- [ ] Documentation updated

### NO GO Criteria:
- [ ] Multiple definitions of same multiplier exist
- [ ] PricingEngine missing any calculation method
- [ ] Minimum multipliers not enforced
- [ ] Wholesale formula inconsistent
- [ ] Breaking changes to existing functionality
- [ ] No test coverage

---

## 🔒 SOLID Principles Applied

### Single Responsibility Principle (SRP)
- **PricingEngine**: Only responsible for pricing calculations
- **pricing.constants.js**: Only responsible for constant definitions
- Each calculation method has single responsibility

### Open/Closed Principle (OCP)
- PricingEngine can be extended with new calculation methods
- Constants can be extended without modifying existing code
- Admin settings can override defaults without code changes

### Liskov Substitution Principle (LSP)
- All pricing calculations follow same interface
- Admin settings can be substituted with defaults

### Interface Segregation Principle (ISP)
- PricingEngine exposes only necessary methods
- Constants organized by concern

### Dependency Inversion Principle (DIP)
- Code depends on PricingEngine abstraction
- Admin settings injected as dependency
- Constants injected rather than hardcoded

---

## 📊 Migration Strategy

### Step 1: Create New Files (Non-Breaking)
- Add `pricing.constants.js`
- Add `PricingEngine.js`
- Keep existing files unchanged

### Step 2: Update One File at a Time
- Start with least-used utility
- Update to use PricingEngine
- Test thoroughly
- Move to next file

### Step 3: Deprecate Old Files
- Mark old utilities as deprecated
- Add migration notes
- Remove after all code migrated

---

## 🧪 Testing Strategy

### Unit Tests Required:
- [ ] Skill level multiplier calculations
- [ ] Material markup calculations
- [ ] Business multiplier calculations
- [ ] Metal complexity multiplier calculations
- [ ] Process cost calculations
- [ ] Task cost calculations
- [ ] Wholesale price calculations
- [ ] Minimum multiplier enforcement
- [ ] Edge cases (zero values, missing data)

---

## 📝 Documentation Updates

### Files to Update:
- [ ] `JOB_COSTING_LOGIC_REVIEW.md` - Update with new architecture
- [ ] `JOB_COSTING_QUICK_REFERENCE.md` - Update file locations
- [ ] `README.md` - Add pricing architecture section
- [ ] API documentation - Update pricing endpoints

---

## 🚀 Implementation Order

1. **Create constants file** (Phase 1)
2. **Create PricingEngine** (Phase 2)
3. **Add unit tests** (Phase 2)
4. **Refactor repair-pricing.util.js** (Phase 3)
5. **Refactor task-pricing.util.js** (Phase 3)
6. **Refactor material-pricing.util.js** (Phase 3)
7. **Refactor processes.util.js** (Phase 3)
8. **Refactor API services** (Phase 3)
9. **Update AdminSettingsContext** (Phase 4)
10. **Remove deprecated code** (Phase 4)

---

## ⚠️ Breaking Changes Prevention

### Compatibility Layer:
- Keep old function signatures
- Forward to PricingEngine internally
- Add deprecation warnings
- Provide migration guide

---

## 📈 Success Metrics

- [ ] Zero duplicate multiplier definitions
- [ ] 100% of pricing calculations use PricingEngine
- [ ] All minimum multipliers enforced
- [ ] Consistent wholesale pricing
- [ ] 90%+ test coverage
- [ ] Zero breaking changes

---

**Status**: Ready for Implementation  
**Estimated Time**: 2-3 days  
**Risk Level**: Low (backward compatible approach)

