# Pricing Validation Tests

Comprehensive validation tests for the standardized pricing system.

## 📋 Test Files

### 1. `test-pricing-constants.mjs`
Tests all constants, helper functions, and validation logic in `src/constants/pricing.constants.js`.

**Test Coverage**:
- ✅ Skill level multipliers
- ✅ Material markup constants
- ✅ Business fee constants
- ✅ Business multiplier calculations
- ✅ Metal complexity multipliers
- ✅ Wholesale configuration
- ✅ Helper functions (getSkillLevelMultiplier, getMetalComplexityMultiplier, etc.)
- ✅ Minimum enforcement functions
- ✅ Validation function

**Run**: `node test-pricing-constants.mjs`

---

### 2. `test-pricing-engine.mjs`
Tests all calculation methods in `src/services/PricingEngine.js`.

**Test Coverage**:
- ✅ `calculateProcessCost()` - Process pricing calculations
- ✅ `calculateMaterialCost()` - Material pricing calculations
- ✅ `applyBusinessMultiplier()` - Business multiplier application
- ✅ `calculateWholesalePrice()` - Wholesale pricing (all 3 formula types)
- ✅ `calculateTaskCost()` - Task pricing calculations
- ✅ `getHourlyRateForSkill()` - Skill-based hourly rates
- ✅ `getBusinessMultiplier()` - Business multiplier retrieval
- ✅ Edge cases (zero values, null settings, negative values)

**Run**: `node test-pricing-engine.mjs`

---

### 3. `test-pricing-runner.mjs`
Test runner script to execute all tests or specific test suites.

**Usage**:
```bash
# Run all tests
node test-pricing-runner.mjs

# Run only constants tests
node test-pricing-runner.mjs --constants

# Run only engine tests
node test-pricing-runner.mjs --engine

# Show help
node test-pricing-runner.mjs --help
```

---

## 🧪 Running Tests

### Individual Test Files
```bash
# Test constants
node test-pricing-constants.mjs

# Test pricing engine
node test-pricing-engine.mjs
```

### Using Test Runner
```bash
# Run all tests
node test-pricing-runner.mjs --all

# Run specific suite
node test-pricing-runner.mjs --constants
node test-pricing-runner.mjs --engine
```

---

## ✅ Test Results

Tests output:
- ✅ **PASS** - Test passed
- ❌ **FAIL** - Test failed (with expected vs actual values)
- 📊 **Summary** - Total passed/failed and success rate

### Example Output
```
🧪 Pricing Constants Validation Tests
=====================================

Test Suite 1: Skill Level Multipliers
--------------------------------------
✅ PASS: Basic skill multiplier should be 0.75
✅ PASS: Standard skill multiplier should be 1.0
...

📊 Test Summary
===============
✅ Tests Passed: 45
❌ Tests Failed: 0
📈 Success Rate: 100.0%

🎉 All tests passed!
```

---

## 📊 Test Coverage

### Constants Tests (15 test suites)
1. Skill Level Multipliers
2. Material Markup
3. Business Fees
4. Business Multiplier
5. Metal Complexity Multipliers
6. Base Wage
7. Wholesale Configuration
8. calculateBusinessMultiplier Function
9. getSkillLevelMultiplier Function
10. getMetalComplexityMultiplier Function
11. enforceMinimumMaterialMarkup Function
12. enforceMinimumBusinessMultiplier Function
13. enforceMinimumWholesaleMultiplier Function
14. calculateHourlyRateForSkill Function
15. validatePricingConstants Function

### Pricing Engine Tests (8 test suites)
1. calculateProcessCost
2. calculateMaterialCost
3. applyBusinessMultiplier
4. calculateWholesalePrice
5. calculateTaskCost
6. getHourlyRateForSkill
7. getBusinessMultiplier
8. Edge Cases

---

## 🔍 What's Tested

### Minimum Multiplier Enforcement
- ✅ Material markup enforced to 2.0x minimum
- ✅ Business multiplier enforced to 2.0x minimum
- ✅ Wholesale multiplier enforced to 1.5x minimum

### Calculation Accuracy
- ✅ Process costs with skill levels
- ✅ Material costs with markup
- ✅ Business multiplier application
- ✅ Wholesale pricing (all 3 formula types)
- ✅ Task costs from processes and materials

### Edge Cases
- ✅ Zero values
- ✅ Null/undefined admin settings
- ✅ Invalid skill levels
- ✅ Unknown metal types
- ✅ Negative values (graceful handling)

### Consistency
- ✅ Same calculations produce same results
- ✅ Defaults are consistent
- ✅ Enforcement is consistent

---

## 🚨 Troubleshooting

### Import Errors
If you see import errors, ensure:
- Files are in correct locations
- Using `.mjs` extension for ES modules
- Node.js version supports ES modules (v14+)

### Test Failures
If tests fail:
1. Check the error message for expected vs actual values
2. Verify constants match your business requirements
3. Check that PricingEngine is using correct formulas
4. Review minimum enforcement values

### Missing Dependencies
Tests use only Node.js built-in modules. No external dependencies required.

---

## 📝 Adding New Tests

To add new tests:

1. **For Constants**: Add to `test-pricing-constants.mjs`
   ```javascript
   console.log('Test Suite X: New Feature');
   console.log('--------------------------');
   assertEqual(actual, expected, 'Description');
   ```

2. **For PricingEngine**: Add to `test-pricing-engine.mjs`
   ```javascript
   console.log('Test Suite X: New Method');
   console.log('------------------------');
   const result = pricingEngine.newMethod(data, settings);
   assertEqual(result, expected, 'Description');
   ```

---

## ✅ Pre-Commit Checklist

Before committing code changes:
- [ ] All constants tests pass
- [ ] All pricing engine tests pass
- [ ] No new test failures
- [ ] Edge cases covered
- [ ] Minimum enforcement verified

---

**Last Updated**: Based on standardized pricing system  
**Test Framework**: Node.js ES Modules  
**Coverage**: Constants + PricingEngine

