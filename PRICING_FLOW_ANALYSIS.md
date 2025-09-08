# EFD Pricing Flow - Detailed Code Analysis

## 🔄 COMPLETE PRICING CALCULATION FLOW

### Phase 1: MATERIAL PRICE CALCULATION

**File: `material-pricing.util.js` & `repair-pricing.util.js`**

```javascript
// Step 1: Raw Stuller Cost
stullerPrice = 50.00 // What EFD pays Stuller

// Step 2: Material-Level Markup (Applied at creation/import)
markupRate = 2.0 // 100% markup (from admin.pricing.materialMarkup)
markedUpPrice = stullerPrice * markupRate = 100.00

// Step 3: Portion Calculation (For process use)
portionsPerUnit = 4
costPerPortion = stullerPrice / portionsPerUnit = 12.50 // EFD's cost per piece
pricePerPortion = markedUpPrice / portionsPerUnit = 25.00 // Customer price per piece

// Step 4: Repair-Level Pricing (When added to repair)
// In getMetalSpecificPrice() function:
basePrice = pricePerPortion // 25.00
if (!isWholesale) {
  finalPrice = applyBusinessMultiplier(basePrice, adminSettings)
  // businessMultiplier = (0.10 + 0.15 + 0.05) + 1 = 1.30
  finalPrice = 25.00 * 1.30 = 32.50
} else {
  finalPrice = basePrice // 25.00 (no business multiplier for wholesale)
}
```

**❌ CRITICAL ISSUE: Double Markup on Materials**
- Material markup: 2.0x (100%)
- Business multiplier: 1.3x (30%)  
- **Total retail markup: 2.6x (160%)**

### Phase 2: TASK PRICE CALCULATION

**File: `repair-pricing.util.js` (universalPricing structure)**

```javascript
// Task pricing structure (pre-defined in database)
task.universalPricing = {
  "yellow_gold_14K": {
    retailPrice: 150.00,    // ❓ UNCLEAR: Does this include business multiplier?
    wholesalePrice: 100.00, // Optional wholesale price
    totalCost: 150.00       // Fallback price
  }
}

// Repair-level pricing calculation:
if (isWholesale) {
  basePrice = pricing.wholesalePrice || pricing.retailPrice // 100.00 or 150.00
  finalPrice = basePrice // NO multiplier for wholesale
} else {
  basePrice = pricing.retailPrice || pricing.totalCost // 150.00
  finalPrice = applyBusinessMultiplier(basePrice, adminSettings)
  finalPrice = 150.00 * 1.30 = 195.00 // ❓ POTENTIAL DOUBLE MARKUP
}
```

**❓ UNKNOWN: Are task retailPrice values already marked up?**

### Phase 3: PROCESS PRICE CALCULATION

**File: `processes.util.js` & `repair-pricing.util.js`**

```javascript
// Process pricing (calculated or pre-set)
process.pricing = {
  totalCost: 120.00 // ❓ UNCLEAR: Cost to EFD or price to customer?
}

// OR metal-specific:
process.pricing = {
  totalCost: {
    "Yellow Gold 14K": 150.00,
    "Sterling Silver 925": 100.00
  }
}

// Repair-level pricing:
basePrice = process.pricing.totalCost // 120.00
if (!isWholesale) {
  finalPrice = applyBusinessMultiplier(basePrice, adminSettings)
  finalPrice = 120.00 * 1.30 = 156.00 // ❓ POTENTIAL DOUBLE MARKUP
} else {
  finalPrice = basePrice // 120.00
}
```

**❓ UNKNOWN: Are process totalCost values cost or customer price?**

### Phase 4: REPAIR TOTAL CALCULATION

**File: `NewRepairForm.js` (calculateTotalCost)**

```javascript
// Step 1: Sum all item prices (already processed above)
subtotal = tasksCost + processesCost + materialsCost + customCost
// Example: 195.00 + 156.00 + 32.50 + 0 = 383.50

// Step 2: Rush job markup (applied to entire subtotal)
if (formData.isRush) {
  subtotal *= adminSettings.rushMultiplier // 1.5x
  subtotal = 383.50 * 1.5 = 575.25
}

// Step 3: Delivery fee (flat rate, not marked up)
if (formData.includeDelivery) {
  subtotal += adminSettings.deliveryFee // +$25.00
  subtotal = 575.25 + 25.00 = 600.25
}

// Step 4: Tax (applied to final amount, wholesale exempt)
if (formData.includeTax && !formData.isWholesale) {
  subtotal *= (1 + adminSettings.taxRate) // +8.75%
  subtotal = 600.25 * 1.0875 = 652.77
}
```

## 🚨 IDENTIFIED PRICING ISSUES

### Issue 1: Materials Double Markup
```
Stuller: $50 → Material Markup: $100 → Business Multiplier: $130
Total markup: 160% on materials
```

### Issue 2: Unclear Task/Process Pricing Origin
- **Tasks**: retailPrice values - are these cost or already marked up?
- **Processes**: totalCost values - are these cost or already marked up?
- **Risk**: Applying business multiplier to already marked-up prices

### Issue 3: Inconsistent Admin Settings Usage
```javascript
// Material creation (Stuller integration):
materialMarkup = adminSettings.pricing.materialMarkup || 0 // ERROR if missing

// Repair pricing:
businessMultiplier = (adminSettings.pricing.fees) + 1

// Total calculation:
rushMultiplier = adminSettings.rushMultiplier
deliveryFee = adminSettings.deliveryFee
taxRate = adminSettings.taxRate
```

### Issue 4: Multiple Admin Settings API Calls
- NewRepairForm: Loads admin settings on mount
- calculateTotalCost: Used cached admin settings (good)
- Stuller integration: Loads admin settings again
- **Optimization needed**: Single source admin settings

## 📊 CURRENT MARKUP STRUCTURE ANALYSIS

### Materials (Worst Case - Double Markup):
```
$50 Stuller → $100 Material Markup → $130 Business Multiplier
Customer pays: $130 (160% markup)
EFD cost: $50
EFD profit: $80 (160% margin)
```

### Tasks (If retailPrice is pre-marked up):
```
Unknown base cost → $150 retailPrice → $195 Business Multiplier  
Customer pays: $195 (30% additional markup)
Actual markup: Unknown (could be 300%+ total)
```

### Processes (If totalCost is pre-marked up):
```
Unknown base cost → $120 totalCost → $156 Business Multiplier
Customer pays: $156 (30% additional markup) 
Actual markup: Unknown (could be 200%+ total)
```

## 🎯 RECOMMENDED INVESTIGATION STEPS

### Step 1: Data Audit
1. **Check task retailPrice origins**: Are these cost-based or customer prices?
2. **Check process totalCost origins**: Are these cost-based or customer prices?
3. **Validate material pricing**: Confirm double markup is intentional

### Step 2: Standardization Options

#### Option A: Cost-Based Pricing (Recommended)
```javascript
// Store only base costs, apply markup at repair level
item.baseCost = 100.00           // What it costs EFD
item.laborMultiplier = 1.50      // Labor markup
item.materialMultiplier = 1.30   // Material markup
adminSettings.businessMultiplier = 1.30 // Business overhead

totalPrice = (baseCost * specificMultiplier * businessMultiplier)
```

#### Option B: Pre-Calculated Pricing
```javascript
// Store final prices, clearly labeled
item.pricing = {
  costToEFD: 100.00,
  retailPrice: 195.00,    // Final price (all markups included)
  wholesalePrice: 150.00  // Wholesale price (reduced markup)
}
```

#### Option C: Separated Markup Application
```javascript
// Apply business multiplier ONLY at repair level
itemPrice = getBaseCostPrice(item, metalType, karat)
if (!isWholesale) {
  finalPrice = itemPrice * adminSettings.businessMultiplier
}
```

## 📝 IMMEDIATE ACTION ITEMS

1. **Audit Existing Prices**: Determine if current prices include markups
2. **Document Intended Markup Structure**: Define markup policy
3. **Choose Standardization Strategy**: Cost-based vs pre-calculated
4. **Implement Consistently**: Apply same logic across all item types
5. **Add Price Transparency**: Show markup breakdown to staff
6. **Optimize Admin Settings**: Single load per session

---

*This analysis reveals potential overcharging due to unclear markup application. Immediate investigation into price origins is critical.*
