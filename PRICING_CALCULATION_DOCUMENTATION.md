# PRICING CALCULATION DOCUMENTATION
## Complete Analysis of How, When, and Where Prices Are Calculated

**Updated:** September 8, 2025  
**Analysis Scope:** All pricing calculations across materials, processes, tasks, and repairs

---

## 🎯 **EXECUTIVE SUMMARY**

The EFD pricing system needs to track **both cost and price** at every level for:
- **Business analytics** - Understanding true costs vs revenue
- **Profit analysis** - Calculating margins and profitability  
- **Employee payouts** - Labor cost tracking for compensation
- **Wholesale price sheets** - Transparent pricing for wholesale clients
- **Internal reporting** - Cost analysis and optimization

### **Dual-Tracking Structure**
**Cost = Materials + Labor** (for internal analysis)  
**Price = Cost × Business Multipliers** (for customer pricing)  
**Wholesale Price = Price ÷ 2** (for wholesale clients)  
**Invoice = ((Price × Quantity) × Rush? + Delivery) + Tax** (final billing)

### **Current Issue: Inconsistent Cost vs Price Tracking**
The system needs to properly maintain both cost and price data at each level while ensuring the pricing formula uses the correct values.

---

## 📊 **PRICING CALCULATION LAYERS**

### **LAYER 1: MATERIAL COST & PRICE TRACKING**
**Location:** `src/utils/material-pricing.util.js`

#### **When Calculated:**
- During material creation in `MaterialForm.js`
- When Stuller data is fetched and processed
- During material updates via API

#### **Dual-Tracking Structure:**
```javascript
// Material COST tracking (for internal analysis)
stullerCost = 10.00          // What we pay Stuller
portionsPerUnit = 4
costPerPortion = stullerCost / portionsPerUnit = 2.50

// Material PRICE tracking (for customer billing)
materialMarkup = 2.0         // Business markup on materials
markedUpPrice = stullerCost * materialMarkup = 20.00
pricePerPortion = markedUpPrice / portionsPerUnit = 5.00

// Dual tracking structure
material: {
  // Cost tracking (internal)
  stullerCost: 10.00,
  costPerPortion: 2.50,
  
  // Price tracking (customer-facing)
  customerPrice: 20.00,
  pricePerPortion: 5.00,
  
  // Markup tracking (for analysis)
  markupRate: 2.0,
  margin: 10.00              // customerPrice - stullerCost
}
```

#### **Business Value:**
- **Cost tracking:** True material costs for profit analysis
- **Price tracking:** Customer pricing for consistency
- **Margin analysis:** Track markup effectiveness
- **Employee payouts:** Use cost data for commission calculations

#### **Key Functions:**
- `calculateCleanPricing()` - Generate both cost and price data
- `getCostPerPortion()` - Return true cost for profit analysis
- `getPricePerPortion()` - Return customer price for billing
- `getMarginAnalysis()` - Calculate profit margins

---

### **LAYER 2: PROCESS COST & PRICE TRACKING**
**Location:** `src/utils/processes.util.js`

#### **When Calculated:**
- During process creation in `ProcessForm.js`
- When materials are added to processes
- During process cost previews

#### **Dual-Tracking Structure:**
```javascript
// Process COST calculation (for internal analysis)
laborHours = 2.0
hourlyRate = 62.50 (baseRate × skillMultiplier)
laborCost = laborHours × hourlyRate = 125.00

materialTrueCost = costPerPortion × quantity = 2.50 × 3 = 7.50
processTrueCost = laborCost + materialTrueCost = 132.50

// Process PRICE calculation (for customer billing)
materialCustomerCost = pricePerPortion × quantity = 5.00 × 3 = 15.00
processCustomerPrice = laborCost + materialCustomerCost = 140.00

// Dual tracking structure
process: {
  // Cost tracking (internal)
  laborCost: 125.00,
  materialTrueCost: 7.50,
  totalTrueCost: 132.50,
  
  // Price tracking (customer-facing)
  materialCustomerCost: 15.00,
  totalCustomerPrice: 140.00,
  
  // Analysis data
  materialMargin: 7.50,      // materialCustomerCost - materialTrueCost
  laborHours: 2.0,           // For employee payout calculations
  hourlyRate: 62.50          // For labor cost analysis
}
```

#### **Business Value:**
- **Cost tracking:** True process costs for profit analysis
- **Price tracking:** Consistent customer pricing
- **Labor analysis:** Track labor costs for employee payouts
- **Material margin:** Understand material profit contribution

#### **Key Functions:**
- `calculateProcessCost()` - Generate both cost and price data
- `calculateLaborCost()` - Track true labor costs for payouts
- `calculateMaterialCost()` - Track true material costs vs customer pricing
- `getProcessMargins()` - Calculate profit margins per process

---

### **LAYER 3: TASK COST & PRICE AGGREGATION**
**Location:** `src/utils/task-pricing.util.js`

#### **When Calculated:**
- During task creation/building
- When processes are selected for tasks
- During task pricing previews

#### **Dual-Tracking Structure:**
```javascript
// Task COST aggregation (for internal analysis)
taskTrueCost = 0
taskLaborCost = 0
taskMaterialCost = 0

processSelections.forEach(selection => {
  quantity = selection.quantity || 1
  processTrueCost = selection.process.totalTrueCost = 132.50
  processLaborCost = selection.process.laborCost = 125.00
  processMaterialCost = selection.process.materialTrueCost = 7.50
  
  taskTrueCost += processTrueCost × quantity
  taskLaborCost += processLaborCost × quantity
  taskMaterialCost += processMaterialCost × quantity
})

// Task PRICE aggregation (for customer billing)
taskCustomerPrice = 0
processSelections.forEach(selection => {
  quantity = selection.quantity || 1
  processCustomerPrice = selection.process.totalCustomerPrice = 140.00
  taskCustomerPrice += processCustomerPrice × quantity
})

// Dual tracking structure
task: {
  // Cost tracking (internal)
  totalTrueCost: taskTrueCost,
  totalLaborCost: taskLaborCost,
  totalMaterialCost: taskMaterialCost,
  
  // Price tracking (customer-facing)
  totalCustomerPrice: taskCustomerPrice,
  
  // Analysis data
  totalMargin: taskCustomerPrice - taskTrueCost,
  laborHours: totalLaborHours,          // For employee payouts
  processBreakdown: processDetails      // For detailed analysis
}
```

#### **Business Value:**
- **Cost tracking:** True task costs for profitability analysis
- **Price tracking:** Consistent customer pricing across tasks
- **Labor tracking:** Total labor hours and costs for employee payouts
- **Process breakdown:** Detailed cost analysis per process

#### **Key Functions:**
- `calculateTaskPricing()` - Generate both cost and price aggregations
- `aggregateLaborCosts()` - Sum labor costs for payout calculations
- `aggregateMaterialCosts()` - Sum true material costs vs customer prices
- `getTaskMargins()` - Calculate profit margins per task

---

### **LAYER 4: FINAL PRICING & BUSINESS ANALYTICS**
**Location:** `src/utils/repair-pricing.util.js` & `src/services/pricingCalculation.service.js`

#### **When Calculated:**
- During repair creation in `NewRepairForm.js`
- When repair totals are updated
- During checkout/finalization

#### **Complete Business Analytics Structure:**
```javascript
// Step 1: Aggregate TRUE COSTS (for profit analysis)
totalTrueCost = aggregateTaskTrueCosts() = 132.50
totalLaborCost = aggregateTaskLaborCosts() = 125.00
totalMaterialCost = aggregateTaskMaterialCosts() = 7.50

// Step 2: Calculate BUSINESS PRICE (using customer prices)
totalCustomerPrice = aggregateTaskCustomerPrices() = 140.00
businessMultiplier = 1.5
finalPrice = totalCustomerPrice × businessMultiplier = 210.00

// Alternative: Calculate from true cost + markup
// finalPrice = totalTrueCost × businessMultiplier = 198.75

// Step 3: Calculate WHOLESALE PRICE
wholesalePrice = finalPrice ÷ 2 = 105.00

// Step 4: Calculate INVOICE
subtotal = finalPrice × quantity = 210.00
rushMultiplier = repair.isRush ? 1.5 : 1.0
rushAdjustedSubtotal = subtotal × rushMultiplier
deliveryFee = repair.requiresDelivery ? deliveryFee : 0
taxableAmount = rushAdjustedSubtotal + deliveryFee
tax = repair.isWholesale ? 0 : (taxableAmount × taxRate / 100)
finalInvoice = taxableAmount + tax

// Complete tracking structure
repair: {
  // Cost analysis (internal)
  totalTrueCost: 132.50,
  totalLaborCost: 125.00,
  totalMaterialCost: 7.50,
  
  // Revenue tracking
  customerPrice: 140.00,
  finalPrice: 210.00,
  wholesalePrice: 105.00,
  invoiceTotal: 357.52,
  
  // Business analytics
  grossMargin: 77.50,        // finalPrice - totalTrueCost
  marginPercent: 58.5,       // (grossMargin / finalPrice) × 100
  laborMargin: 0,            // Labor typically no markup
  materialMargin: 70.50,     // finalPrice - totalTrueCost - laborCost
  
  // Employee payout data
  totalLaborHours: 2.0,
  laborCostBreakdown: [...], // Per process/employee
  hourlyRates: [...],        // For commission calculations
}
```

#### **Business Value:**
- **Profit analysis:** True costs vs revenue margins
- **Employee payouts:** Detailed labor cost tracking
- **Wholesale pricing:** Transparent pricing for wholesale clients
- **Business intelligence:** Margin analysis per repair/client

#### **Key Functions:**
- `calculateRepairAnalytics()` - Complete cost/price/margin analysis
- `generateLaborPayouts()` - Calculate employee compensation
- `generateWholesalePriceSheet()` - Create wholesale pricing documents
- `calculateProfitMargins()` - Business profitability analysis

---

## 🔄 **DUAL-TRACKING PRICING FLOW**

### **Complete Cost & Price Analysis**

#### **Level 1: Materials**
```
True Cost: $10.00 Stuller cost
Customer Price: $20.00 (with markup)
Margin: $10.00 (100% markup)
```

#### **Level 2: Process (2 hours + 3 portions)**
```
Cost Tracking:
- Labor Cost: $125.00 (2 × $62.50)
- Material Cost: $7.50 (3 × $2.50 true cost)
- Total True Cost: $132.50

Price Tracking:  
- Labor Price: $125.00 (same as cost)
- Material Price: $15.00 (3 × $5.00 customer price)
- Total Customer Price: $140.00

Analysis:
- Material Margin: $7.50
- Labor Margin: $0.00
- Total Margin: $7.50
```

#### **Level 3: Task Aggregation**
```
Cost Tracking:
- Total True Cost: $132.50
- Total Labor Cost: $125.00 (for payouts)
- Total Material Cost: $7.50

Price Tracking:
- Total Customer Price: $140.00

Analysis:
- Total Margin: $7.50
- Labor Hours: 2.0 (for employee tracking)
```

#### **Level 4: Business Pricing**
```
Business Multiplier: 1.5

Option A (Apply to Customer Prices):
- Final Price: $140.00 × 1.5 = $210.00
- Wholesale: $105.00
- True Margin: $77.50 ($210 - $132.50 true cost)

Option B (Apply to True Costs):  
- Final Price: $132.50 × 1.5 = $198.75
- Wholesale: $99.38
- True Margin: $66.25

Invoice (using Option A):
- Base: $210.00
- Rush (1.5×): $315.00
- Delivery: $25.00
- Tax: $29.75
- Total: $369.75
```

### **Business Intelligence Benefits**

#### **Profit Analysis:**
- **True Cost:** $132.50 (what it actually costs us)
- **Revenue:** $210.00 (what we charge)
- **Gross Margin:** $77.50 (58.5% margin)
- **Material Contribution:** $7.50 margin
- **Labor Contribution:** $0.00 margin (pure cost recovery)

#### **Employee Payouts:**
- **Total Labor Hours:** 2.0 hours
- **Labor Cost Basis:** $125.00
- **Commission Base:** True cost or revenue (configurable)
- **Skill Level Tracking:** Advanced ($62.50/hr)

#### **Wholesale Price Sheets:**
- **Retail Price:** $210.00
- **Wholesale Price:** $105.00 (50% discount)
- **Cost Basis:** $132.50 (for minimum pricing)
- **Margin at Wholesale:** $105.00 - $132.50 = **-$27.50 LOSS**

**⚠️ Wholesale Pricing Issue:** Current formula creates losses at wholesale level!

---

## 📁 **PRICING CALCULATION FILES**

### **Core Utilities (Business Logic)**

#### **Material Pricing: `src/utils/material-pricing.util.js`**
- **Purpose:** Material cost and pricing calculations with Stuller integration
- **Key Functions:**
  - `calculateCleanPricing()` - Clean pricing structure calculation
  - `getCostPerPortion()` - Cost per portion for metal variants
  - `getPricePerPortion()` - Price per portion for metal variants
  - `getPriceRange()` - Price range for multi-variant materials

#### **Process Pricing: `src/utils/processes.util.js`**
- **Purpose:** Process cost calculation with labor and materials
- **Key Functions:**
  - `calculateProcessCost()` - Main process cost calculation
  - `prepareProcessForSaving()` - Process data with calculated pricing
  - `getMetalVariantsFromMaterials()` - Extract metal variants
  - `shouldProcessBeMetalDependent()` - Determine pricing structure

#### **Task Pricing: `src/utils/task-pricing.util.js`**
- **Purpose:** Task pricing based on process and material structures
- **Key Functions:**
  - `calculateTaskPricing()` - Main task pricing calculation
  - `buildVariantPricing()` - Metal-variant pricing builder
  - `getDefaultPricing()` - Fallback pricing structure

#### **Repair Pricing: `src/utils/repair-pricing.util.js`**
- **Purpose:** Final repair pricing with admin multiplier
- **Key Functions:**
  - `applyBusinessMultiplier()` - Admin multiplier application
  - `getMetalSpecificPrice()` - Metal-variant price selection

#### **Pricing Calculation Service: `src/services/pricingCalculation.service.js`**
- **Purpose:** Central repair pricing service
- **Key Functions:**
  - `calculateSubtotal()` - Aggregate all repair items
  - `calculateRepairTotal()` - Complete pricing breakdown
  - `calculateWholesaleDiscount()` - Wholesale pricing adjustments
  - `calculateTax()` - Tax calculations

### **API Services**

#### **Material Service: `src/app/api/materials/service.js`**
- **Purpose:** Material CRUD with pricing integration
- **Pricing Role:** Creates materials with cost structure, handles Stuller pricing

#### **Process Service: `src/app/api/processes/service.js`**
- **Purpose:** Process CRUD with cost calculation
- **Pricing Role:** Uses `prepareProcessForSaving()` to calculate process costs

#### **Task Service: `src/services/tasks.service.js`**
- **Purpose:** Task CRUD operations
- **Pricing Role:** Stores calculated task pricing for reuse

### **UI Components**

#### **Material Form: `src/app/components/materials/MaterialForm.js`**
- **Pricing Role:** Sets up material cost structure and Stuller pricing
- **Key Features:** Auto-update pricing toggle, cost per portion display

#### **Process Form: `src/app/components/processes/ProcessForm.js`**
- **Pricing Role:** Material cost calculations, labor cost display
- **Key Features:** Material line management, cost preview

#### **Repair Form: `src/app/components/repairs/NewRepairForm.js`**
- **Pricing Role:** Final pricing display and admin multiplier application
- **Key Features:** Total cost calculation, fee management

---

## ⚠️ **CRITICAL BUSINESS ISSUES IDENTIFIED**

### **1. Wholesale Pricing Creates Losses**
**Issue:** Price ÷ 2 formula can create losses when applied to marked-up prices.

**Example:**
- True Cost: $132.50
- Customer Price: $210.00
- Wholesale Price: $105.00 (Price ÷ 2)
- **Wholesale Loss:** $27.50 per job!

**Solution:** Wholesale should be: `Max(TrueCost × 1.2, Price ÷ 2)` for minimum viability.

### **2. Inconsistent Cost vs Price Usage**
**Issue:** The system mixes true costs and customer prices in calculations.

**Problems:**
- Business multiplier sometimes applied to costs, sometimes to prices
- Profit margins calculated inconsistently
- Employee payouts may use inflated or deflated bases

### **3. Missing Business Intelligence**
**Issue:** No clear separation of cost tracking from revenue tracking.

**Missing Analytics:**
- Material margin contribution analysis
- Labor cost vs revenue tracking
- Process profitability by type
- Client profitability analysis
- Employee productivity metrics

### **4. Pricing Strategy Conflicts**
**Issue:** Multiple pricing approaches create confusion.

**Conflicts:**
- Should business multiplier apply to true costs or customer prices?
- Should wholesale be cost-based or price-based?
- How should employee commissions be calculated?

---

## 🔧 **PRICING OPTIMIZATION PLAN**

### **1. Enforce Minimum Multipliers**
**Goal:** Ensure consistent minimum profitability across all pricing.

**Implementation:**
```javascript
// Material multiplier enforcement
function enforceMaterialMultiplier(stullerCost, currentMarkup) {
  const MINIMUM_MATERIAL_MULTIPLIER = 2.0;
  const effectiveMultiplier = Math.max(currentMarkup, MINIMUM_MATERIAL_MULTIPLIER);
  
  return {
    stullerCost,
    multiplier: effectiveMultiplier,
    customerPrice: stullerCost * effectiveMultiplier,
    enforced: effectiveMultiplier > currentMarkup
  };
}

// Business multiplier enforcement
function enforceBusinessMultiplier(adminSettings) {
  const { administrativeFee, businessFee, consumablesFee } = adminSettings.pricing;
  const businessMultipliers = administrativeFee + businessFee + consumablesFee;
  const totalMultiplier = businessMultipliers + 1;
  
  const MINIMUM_BUSINESS_MULTIPLIER = 2.0;
  const effectiveMultiplier = Math.max(totalMultiplier, MINIMUM_BUSINESS_MULTIPLIER);
  
  return {
    configuredMultiplier: totalMultiplier,
    effectiveMultiplier,
    enforced: effectiveMultiplier > totalMultiplier
  };
}

// Wholesale multiplier calculation  
function calculateWholesaleMultiplier(adminSettings) {
  const { administrativeFee, businessFee, consumablesFee } = adminSettings.pricing;
  const businessMultipliers = administrativeFee + businessFee + consumablesFee;
  
  // Formula: (business multipliers / 2) + 1
  return (businessMultipliers / 2) + 1;
}
```

### **2. Implement Dual Cost & Price Tracking**
**Goal:** Track both internal costs and customer prices for analytics.

**Implementation:**
```javascript
// Enhanced material structure with multiplier enforcement
material: {
  // Cost tracking (internal)
  stullerTrueCost: 10.00,
  costPerPortion: 2.50,
  
  // Price tracking (with enforcement)
  configuredMultiplier: 1.8,      // User setting
  enforcedMultiplier: 2.0,        // System minimum
  customerPrice: 20.00,           // stullerCost × enforcedMultiplier
  pricePerPortion: 5.00,
  
  // Analysis
  marginAmount: 10.00,
  marginPercent: 100.0,
  multiplierEnforced: true        // Indicates minimum was applied
}

// Enhanced process structure with true cost tracking
process: {
  // Cost breakdown
  laborTrueCost: 125.00,          // Hours × rate
  materialTrueCost: 7.50,         // True material costs (3 × $2.50)
  totalTrueCost: 132.50,
  
  // Customer pricing
  materialCustomerCost: 15.00,    // Using customer material prices
  totalCustomerCost: 140.00,      // Labor + customer material costs
  
  // Business multiplier application
  businessMultiplier: 2.0,        // Enforced minimum
  retailPrice: 280.00,            // totalCustomerCost × businessMultiplier
  
  // Analytics
  materialMargin: 7.50,           // materialCustomerCost - materialTrueCost
  totalMargin: 147.50,            // retailPrice - totalTrueCost
  marginPercent: 52.7,
  laborHours: 2.0                 // For payout calculations
}
```

### **3. Create Pricing Engine with Enforcement**
**Goal:** Centralized pricing logic with minimum multiplier enforcement.

**Implementation:**
```javascript
class PricingEngine {
  constructor(adminSettings) {
    this.adminSettings = adminSettings;
    this.MINIMUM_MATERIAL_MULTIPLIER = 2.0;
    this.MINIMUM_BUSINESS_MULTIPLIER = 2.0;
  }
  
  // Calculate material pricing with enforcement
  calculateMaterialPricing(stullerCost, requestedMultiplier) {
    const effectiveMultiplier = Math.max(requestedMultiplier, this.MINIMUM_MATERIAL_MULTIPLIER);
    
    return {
      stullerCost,
      requestedMultiplier,
      effectiveMultiplier,
      customerPrice: stullerCost * effectiveMultiplier,
      marginAmount: stullerCost * (effectiveMultiplier - 1),
      marginPercent: ((effectiveMultiplier - 1) * 100),
      enforced: effectiveMultiplier > requestedMultiplier
    };
  }
  
  // Calculate business pricing with enforcement
  calculateBusinessPricing(trueCost, customerCost) {
    const businessMultipliers = this.getBusinessMultipliers();
    const effectiveMultiplier = Math.max(businessMultipliers, this.MINIMUM_BUSINESS_MULTIPLIER);
    
    return {
      trueCost,
      customerCost,
      businessMultiplier: effectiveMultiplier,
      retailPrice: customerCost * effectiveMultiplier,
      wholesaleMultiplier: this.calculateWholesaleMultiplier(),
      wholesalePrice: trueCost * this.calculateWholesaleMultiplier(),
      margins: {
        retailMargin: (customerCost * effectiveMultiplier) - trueCost,
        wholesaleMargin: (trueCost * this.calculateWholesaleMultiplier()) - trueCost
      }
    };
  }
  
  // Get business multipliers from admin settings
  getBusinessMultipliers() {
    const { administrativeFee, businessFee, consumablesFee } = this.adminSettings.pricing;
    return administrativeFee + businessFee + consumablesFee + 1;
  }
  
  // Calculate wholesale multiplier
  calculateWholesaleMultiplier() {
    const { administrativeFee, businessFee, consumablesFee } = this.adminSettings.pricing;
    return ((administrativeFee + businessFee + consumablesFee) / 2) + 1;
  }
}
```

### **4. Add Business Analytics Dashboard**
**Goal:** Comprehensive visibility into costs, margins, and profitability.

**Implementation:**
```javascript
// Analytics service for business intelligence
class PricingAnalytics {
  
  // Material profitability analysis
  analyzeMaterialProfitability(materials) {
    return materials.map(material => ({
      sku: material.sku,
      stullerCost: material.stullerTrueCost,
      customerPrice: material.customerPrice,
      margin: material.customerPrice - material.stullerTrueCost,
      marginPercent: ((material.customerPrice / material.stullerTrueCost - 1) * 100),
      multiplierEnforced: material.multiplierEnforced,
      volume: material.usageCount || 0
    }));
  }
  
  // Process profitability analysis
  analyzeProcessProfitability(processes) {
    return processes.map(process => ({
      name: process.displayName,
      trueCost: process.totalTrueCost,
      retailPrice: process.retailPrice,
      wholesalePrice: process.wholesalePrice,
      retailMargin: process.retailPrice - process.totalTrueCost,
      wholesaleMargin: process.wholesalePrice - process.totalTrueCost,
      laborHours: process.laborHours,
      laborCost: process.laborTrueCost,
      materialMargin: process.materialMargin
    }));
  }
  
  // Employee payout calculations
  calculateEmployeePayouts(processes, payoutRate = 0.15) {
    return processes.map(process => ({
      processName: process.displayName,
      laborHours: process.laborHours,
      laborCost: process.laborTrueCost,
      skillLevel: process.skillLevel,
      payoutAmount: process.laborTrueCost * payoutRate,
      payoutPerHour: (process.laborTrueCost * payoutRate) / process.laborHours
    }));
  }
  
  // Wholesale viability analysis
  analyzeWholesaleViability(repairs) {
    return repairs.map(repair => ({
      repairId: repair.id,
      trueCost: repair.totalTrueCost,
      retailPrice: repair.retailPrice,
      wholesalePrice: repair.wholesalePrice,
      retailMargin: repair.retailPrice - repair.totalTrueCost,
      wholesaleMargin: repair.wholesalePrice - repair.totalTrueCost,
      isWholesaleViable: (repair.wholesalePrice - repair.totalTrueCost) > 0,
      recommendedMinWholesale: repair.totalTrueCost * 1.2 // 20% minimum margin
    }));
  }
}
```

### **5. Implement Wholesale Price Sheet Generator**
**Goal:** Automated wholesale pricing documents for clients.

**Implementation:**
```javascript
// Wholesale price sheet generator
class WholesalePriceSheetGenerator {
  
  generatePriceSheet(tasks, adminSettings) {
    const pricingEngine = new PricingEngine(adminSettings);
    const wholesaleMultiplier = pricingEngine.calculateWholesaleMultiplier();
    
    return {
      generatedDate: new Date().toISOString(),
      wholesaleMultiplier,
      businessMultipliers: {
        administrative: adminSettings.pricing.administrativeFee,
        business: adminSettings.pricing.businessFee,
        consumables: adminSettings.pricing.consumablesFee
      },
      tasks: tasks.map(task => ({
        name: task.displayName,
        description: task.description,
        trueCost: task.totalTrueCost,
        laborHours: task.totalLaborHours,
        retailPrice: task.retailPrice,
        wholesalePrice: task.wholesalePrice,
        savings: task.retailPrice - task.wholesalePrice,
        savingsPercent: ((task.retailPrice - task.wholesalePrice) / task.retailPrice * 100)
      })),
      terms: {
        minimumOrder: 500,
        paymentTerms: "Net 30",
        rushSurcharge: adminSettings.pricing.rushMultiplier,
        deliveryFee: adminSettings.pricing.deliveryFee
      }
    };
  }
}
```

---

## 📈 **EXPECTED BENEFITS**

### **Immediate Benefits (1-2 weeks)**
- ✅ **Minimum profitability guaranteed** - All materials and business multipliers enforce minimums
- ✅ **Consistent wholesale pricing** - Formula ensures viability across all jobs
- ✅ **Clear cost vs price separation** - True costs tracked separately from customer pricing
- ✅ **Multiplier transparency** - System shows when minimums are enforced

### **Medium-term Benefits (1-2 months)**
- ✅ **Automated wholesale price sheets** - Professional client pricing documents
- ✅ **Employee payout tracking** - Clear labor cost basis for compensation
- ✅ **Business intelligence dashboard** - Real-time profitability analysis
- ✅ **Pricing consistency** - Centralized PricingEngine eliminates calculation errors

### **Long-term Benefits (2-6 months)**
- ✅ **Optimized pricing strategy** - Data-driven multiplier adjustments
- ✅ **Client profitability analysis** - Understanding which clients/jobs are most profitable
- ✅ **Process optimization** - Identifying high-margin vs low-margin work
- ✅ **Sustainable business growth** - Pricing that supports shop operations and employee compensation

### **Key Metrics to Track**
- **Material Multiplier Enforcement Rate** - How often minimums are applied
- **Wholesale Job Profitability** - Margin on wholesale vs retail jobs
- **Employee Payout Sustainability** - Labor cost vs revenue ratios
- **Business Multiplier Effectiveness** - Admin/consumables/business fee coverage

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **High Priority (Fix Immediately)**
1. **Enforce minimum material multiplier** - Ensure 2.0x minimum on all materials
2. **Enforce minimum business multiplier** - Ensure 2.0x minimum on (admin + business + consumables + 1)
3. **Implement wholesale multiplier calculation** - ((admin + business + consumables) ÷ 2) + 1
4. **Fix cost vs price tracking** - Separate true costs from customer prices at all levels
5. **Add multiplier enforcement validation** - Show when minimums are applied

### **Medium Priority (Next Sprint)**
1. **Implement PricingEngine class** - Centralized pricing with enforcement
2. **Create business analytics dashboard** - Cost/margin visibility
3. **Build wholesale price sheet generator** - Automated client pricing documents
4. **Add employee payout calculations** - Labor-based compensation tracking

### **Low Priority (Future Iterations)**
1. **Advanced pricing analytics** - Profitability trends and optimization
2. **Dynamic multiplier recommendations** - ML-based pricing suggestions
3. **Client-specific pricing tiers** - Customized wholesale multipliers
4. **Automated competitive analysis** - Market-based pricing adjustments

### **Medium Priority (Next Sprint)**
1. **Implement cost-based pricing model**
2. **Create unified pricing service**
3. **Add pricing transparency features**

### **Low Priority (Future Iterations)**
1. **Advanced pricing analytics**
2. **Automated competitive pricing**
3. **ML-based pricing optimization**

---

*This documentation reveals the complete pricing calculation architecture and provides clear recommendations for eliminating the compound markup issues that are significantly inflating customer prices.*
