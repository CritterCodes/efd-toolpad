# Repair Task Schema Design v2.0

## 🎯 **Core Business Requirements**

Based on the business requirements, here's the updated repair task object schema:

## 📊 **New Repair Task Schema**

```javascript
{
  // Core Identification
  _id: ObjectId,
  sku: "RT-SHANK-02201",         // Internal SKU format: RT-[category]-[shortCode]
  shortCode: "02201",            // 5-digit standardized code: [category][karat][metal][task]
  title: "Ring Sizing Up",  // Display name
  description: "Professional ring sizing service - resize up or down by 1-2 sizes",
  
  // Service Classification
  category: "shank",              // shank, prongs, stone_setting, engraving, chains, bracelet, watch, misc
  subcategory: "ring_sizing",     // More specific classification
  metalType: "gold",              // gold, silver, platinum, mixed, null (if not applicable)
  requiresMetalType: true,        // Boolean - does this task depend on metal type
  
  // Core Pricing Components
  laborHours: 0.75,              // Time required in hours (decimal)
  materialCost: 12.50,           // Raw material cost in dollars
  basePrice: null,               // Calculated field - computed from formula
  
  // Service Details
  service: {
    estimatedDays: 3,            // Standard turnaround
    rushDays: 1,                 // Rush turnaround available
    rushMultiplier: 1.5,         // Rush price multiplier
    requiresApproval: false,     // Needs customer approval before work
    requiresInspection: true,    // Needs pre-work inspection
    canBeBundled: true,          // Can be combined with other services
    skillLevel: "standard",      // standard, advanced, master
    riskLevel: "low"             // low, medium, high (affects insurance/liability)
  },
  
  // Workflow Integration
  workflow: {
    departments: ["workshop"],    // workshop, casting, setting, finishing, stone_setting
    equipmentNeeded: ["sizing_mandrel", "torch"], // Required equipment
    qualityChecks: ["measurement", "fit", "finish"], // Required QC steps
  },
  
  // Size/Quantity Constraints (if applicable)
  constraints: {
    minQuantity: 1,
    maxQuantity: 10,
    sizeRange: {
      min: 4,                    // Minimum ring size
      max: 13                    // Maximum ring size
    },
    weightLimits: {
      minGrams: null,
      maxGrams: null
    }
  },
  
  // Display & Organization
  display: {
    isActive: true,
    isFeatured: false,           // Show prominently in UI
    sortOrder: 100,
    tags: ["popular", "quick", "standard"], // UI tags for filtering
    icon: "resize",              // UI icon identifier
    color: "#4A90E2",           // UI color coding (hex)
    thumbnailUrl: "/images/tasks/ring-sizing.jpg" // Optional image
  },
  
  // Shopify Integration (for order creation)
  shopify: {
    productId: "gid://shopify/Product/123", // Keep for order creation
    variantId: "gid://shopify/ProductVariant/456", // Keep for order creation  
    needsSync: false,           // Flag for price/description updates
    lastSyncedAt: Date,         // When was this last synced to Shopify
    shopifyPrice: 89.25         // Current Shopify price for comparison
  },
  
  // Pricing History & Analytics
  analytics: {
    originalPrice: 30.00,        // Original Shopify price for reference (will be overwritten)
    timesUsed: 0,               // How often this task is selected
    averageCompletionTime: null, // Actual vs estimated time tracking
    customerSatisfactionScore: null, // Average rating
    lastUsed: null,             // Date last selected
    seasonalDemand: {},         // Month-by-month usage stats
    profitMargin: null          // Calculated profit margin percentage
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: "admin",           // User who created
  lastModifiedBy: "admin",      // User who last modified
  version: 1,                   // For change tracking
  isArchived: false,            // Soft delete flag
  archivedAt: null,             // When was this archived
  archivedReason: null          // Why was this archived
}
```

## 🏷️ **ShortCode System Specification**

The 5-digit `shortCode` follows a standardized format: **[Category][Karat][Metal][Task]**

**SKU Integration**: The SKU format is: `RT-[CategoryName]-[shortCode]`
- Example: shortCode `02201` (Shank category) → SKU `RT-SHANK-02201`
- This provides both human-readable category and coded identification

### **Position 1: Category (0-7)**
```
0 = Shank (Sizings, Half Shank, Solder Together) → SKU: RT-SHANK-[shortCode]
1 = Prongs → SKU: RT-PRONG-[shortCode]
2 = Stone Setting → SKU: RT-STONE-[shortCode]
3 = Engraving → SKU: RT-ENGRAVE-[shortCode]
4 = Chains → SKU: RT-CHAIN-[shortCode]
5 = Bracelet → SKU: RT-BRACELET-[shortCode]
6 = Watch → SKU: RT-WATCH-[shortCode]
7 = Miscellaneous → SKU: RT-MISC-[shortCode]
```

### **Position 2: Metal Karat (0-9)**
```
0 = Not Applicable/Mixed
1 = .925 Silver
2 = 14k Gold
3 = 18k Gold
4 = 22k Gold
5 = 24k Gold
6 = 10k Gold
7 = Platinum 950
8 = Platinum 900
9 = Other/Specialty
```

### **Position 3: Metal Type (0-9)**
```
0 = Not Applicable/Mixed
1 = Silver
2 = Yellow Gold
3 = White Gold
4 = Rose Gold
5 = Platinum
6 = Palladium
7 = Stainless Steel
8 = Titanium
9 = Other/Mixed
```

### **Position 4-5: Task Specification (01-99)**
```
Shank Tasks (0XXXX):
01 = Size Down (1 size)
02 = Size Up (1 size)  
03 = Size Up (additional sizes)
04 = Complex Sizing
05 = Sizing with Stone Setting
06 = Half Shank Replacement
07 = Shank Solder Together
08 = Shank Repair
...

Prong Tasks (1XXXX):
10 = Basic Prong Repair
11 = Prong Replacement
12 = Prong Retipping
13 = Prong Rebuild
...

Stone Setting Tasks (2XXXX):
20 = Basic Stone Setting
21 = Prong Setting
22 = Bezel Setting
23 = Channel Setting
...

Engraving Tasks (3XXXX):
30 = Hand Engraving
31 = Machine Engraving
32 = Laser Engraving
...

Chain Tasks (4XXXX):
40 = Chain Link Repair
41 = Chain Soldering
42 = Clasp Repair
...

Bracelet Tasks (5XXXX):
50 = Bracelet Sizing
51 = Link Replacement
52 = Clasp Repair
...

Watch Tasks (6XXXX):
60 = Battery Replacement
61 = Band Adjustment
62 = Crystal Replacement
...

Misc Tasks (7XXXX):
70 = General Cleaning
71 = Polishing
72 = Rhodium Plating
...
```

### **Example ShortCodes & SKUs:**
- `02201` → `RT-SHANK-02201` = Shank (0) + 14k Gold (2) + Yellow Gold (2) + Size Down (01)
- `12301` → `RT-PRONG-12301` = Prongs (1) + 18k Gold (3) + White Gold (3) + Prong Replacement (11)
- `21105` → `RT-STONE-21105` = Stone Setting (2) + Silver (1) + Silver (1) + Prong Setting (21)
- `40002` → `RT-CHAIN-40002` = Chains (4) + Not Applicable (0) + Not Applicable (0) + Chain Soldering (41)
- `70001` → `RT-MISC-70001` = Miscellaneous (7) + Not Applicable (0) + Not Applicable (0) + General Cleaning (70)

## 🧮 **Price Calculation System**

The price calculation formula will be implemented as:

```javascript
/**
 * Calculate repair task price based on business formula:
 * ((laborHours × wage) + (materialCost × 1.5)) × ((administrativeFee + businessFee + consumablesFee) + 1)
 * 
 * @param {Object} repairTask - The repair task object with shortCode structure
 * @param {Object} adminSettings - Admin pricing settings
 */
const calculateRepairTaskPrice = (repairTask, adminSettings) => {
  const { laborHours, materialCost, shortCode } = repairTask;
  const { wage, administrativeFee, businessFee, consumablesFee } = adminSettings;
  
  // Parse shortCode for additional pricing logic (if needed)
  const category = parseInt(shortCode.charAt(0));
  const karat = parseInt(shortCode.charAt(1));
  const metalType = parseInt(shortCode.charAt(2));
  const taskCode = parseInt(shortCode.substring(3));
  
  // Step 1: Labor cost
  const laborCost = laborHours * wage;
  
  // Step 2: Material cost with markup (1.5x)
  const materialCostWithMarkup = materialCost * 1.5;
  
  // Step 3: Base cost
  const baseCost = laborCost + materialCostWithMarkup;
  
  // Step 4: Apply administrative, business, and consumables fees
  const feeMultiplier = (administrativeFee + businessFee + consumablesFee) + 1;
  const finalPrice = baseCost * feeMultiplier;
  
  return {
    laborCost: laborCost,
    materialCostWithMarkup: materialCostWithMarkup,
    baseCost: baseCost,
    administrativeFeeAmount: baseCost * administrativeFee,
    businessFeeAmount: baseCost * businessFee,
    consumablesFeeAmount: baseCost * consumablesFee,
    finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
    shortCodeBreakdown: {
      category: category,
      karat: karat,
      metalType: metalType,
      taskCode: taskCode
    },
    breakdown: {
      laborHours: laborHours,
      wage: wage,
      materialCost: materialCost,
      materialMarkup: 1.5,
      administrativeFee: administrativeFee,
      businessFee: businessFee,
      consumablesFee: consumablesFee
    }
  };
};
```

## ⚙️ **Admin Settings Schema**

New admin settings object to support pricing:

```javascript
{
  // Pricing Settings
  pricing: {
    wage: 35.00,                 // Hourly wage in dollars
    administrativeFee: 0.15,     // 15% administrative fee
    businessFee: 0.10,           // 10% cost of business fee
    consumablesFee: 0.05,        // 5% consumables fee (tools, equipment wear, etc.)
    lastUpdated: Date,
    updatedBy: "admin"
  },
  
  // Security Settings
  security: {
    pricingSecurityCode: "encrypted_hash", // Hashed security code
    requiresCodeForPricing: true,
    codeExpiresAfter: 3600000,   // 1 hour in milliseconds
    lastCodeChange: Date
  },
  
  // Business Rules
  rules: {
    minLaborHours: 0.25,         // Minimum billable time
    maxLaborHours: 8.0,          // Maximum single task time
    minMaterialCost: 0,          // Minimum material cost
    maxMaterialCost: 500,        // Maximum material cost
    rushMultiplierDefault: 1.5,  // Default rush job multiplier
    bulkDiscountThreshold: 5     // Number of tasks for bulk discount
  },
  
  // Metadata
  version: 1,
  createdAt: Date,
  updatedAt: Date,
  createdBy: "admin"
}
```

## 🔧 **Enhanced Features**

### **Dynamic Pricing**
- Real-time price calculation based on admin settings
- Price history tracking when settings change
- Bulk pricing rules for multiple tasks

### **Metal Type Integration**
- Conditional metal type requirements
- Metal-specific pricing adjustments (future enhancement)
- Material cost variations by metal type

### **Advanced Analytics**
- Usage tracking and demand forecasting
- Profitability analysis per task
- Performance metrics (actual vs estimated time)

### **Quality & Risk Management**
- Risk level assessment for insurance purposes
- Safety requirement tracking
- Quality control checkpoint integration

### **Workflow Optimization**
- Department routing and scheduling
- Equipment availability checking
- Skill level matching for assignments

This schema provides a solid foundation for your repair task management system while maintaining flexibility for future enhancements!
