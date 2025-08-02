# Repair Task Schema Design v2.0

## 🎯 **Core Business Requirements**

Based on the business requirements, here's the updated repair task object schema:

## 📊 **New Repair Task Schema**

```javascript
{
  // Core Identification
  _id: ObjectId,
  sku: "RT-SIZING-001",           // Internal SKU format
  taskCode: "SZ001",              // Short task code for internal reference
  title: "Ring Sizing Up/Down",   // Display name
  description: "Professional ring sizing service - resize up or down by 1-2 sizes",
  
  // Service Classification
  category: "sizing",             // sizing, prongs, chains, settings, misc, stone_work
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
    safetyRequirements: ["ventilation", "protective_gear"] // Safety protocols
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

## 🧮 **Price Calculation System**

The price calculation formula will be implemented as:

```javascript
/**
 * Calculate repair task price based on business formula:
 * ((laborHours × wage) + (materialCost × 1.5)) × ((administrativeFee + businessFee) + 1)
 */
const calculateRepairTaskPrice = (repairTask, adminSettings) => {
  const { laborHours, materialCost } = repairTask;
  const { wage, administrativeFee, businessFee } = adminSettings;
  
  // Step 1: Labor cost
  const laborCost = laborHours * wage;
  
  // Step 2: Material cost with markup (1.5x)
  const materialCostWithMarkup = materialCost * 1.5;
  
  // Step 3: Base cost
  const baseCost = laborCost + materialCostWithMarkup;
  
  // Step 4: Apply administrative and business fees
  const feeMultiplier = (administrativeFee + businessFee) + 1;
  const finalPrice = baseCost * feeMultiplier;
  
  return {
    laborCost: laborCost,
    materialCostWithMarkup: materialCostWithMarkup,
    baseCost: baseCost,
    administrativeFeeAmount: baseCost * administrativeFee,
    businessFeeAmount: baseCost * businessFee,
    finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
    breakdown: {
      laborHours: laborHours,
      wage: wage,
      materialCost: materialCost,
      materialMarkup: 1.5,
      administrativeFee: administrativeFee,
      businessFee: businessFee
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
