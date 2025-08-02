# Repair Tasks Management System - Migration Roadmap

## 🎯 **Project Overview**
Migrate repair task management from Shopify products to internal database system, enabling better control, customization, and workflow integration while maintaining Shopify order creation capabilities.

## 📋 **Migration Strategy**
- **Phase 1**: Redesign repair task data structure
- **Phase 2**: Build repair tasks management system
- **Phase 3**: Integrate with repair ticket creation
- **Phase 4**: Shopify order creation from repair tickets
- **Phase 5**: Deprecate Shopify repair task products

---

## 🔄 **Phase 1: Repair Task Data Structure Redesign**

### **Current Issues with Synced Data:**
- Too much Shopify-specific metadata
- Redundant fields we don't need
- Missing internal workflow fields
- No dynamic pricing calculations
- No admin settings integration

### **New Repair Task Schema v2.0:**
```javascript
{
  // Core Identification
  _id: ObjectId,
  sku: "RT-SIZING-001",           // Internal SKU format
  taskCode: "SZ001",              // Short task code for internal reference
  title: "Ring Sizing Up/Down",
  description: "Professional ring sizing service",
  category: "sizing",             // sizing, prongs, chains, settings, misc
  subcategory: "ring_sizing",     // More specific classification
  
  // Metal Type Integration
  metalType: "gold",              // gold, silver, platinum, mixed, null
  requiresMetalType: true,        // Boolean - does this task depend on metal type
  
  // Core Pricing Components (Business Formula)
  laborHours: 0.75,              // Time required in hours
  materialCost: 12.50,           // Raw material cost in dollars
  basePrice: null,               // Calculated: ((laborHours × wage) + (materialCost × 1.5)) × ((adminFee + businessFee) + 1)
  
  // Service Details
  service: {
    estimatedDays: 3,
    rushDays: 1,
    rushMultiplier: 1.5,
    requiresApproval: false,
    requiresInspection: true,
    canBeBundled: true,
    skillLevel: "standard",
    riskLevel: "low"
  },
  
  // Workflow & Quality
  workflow: {
    departments: ["workshop"],
    equipmentNeeded: ["sizing_mandrel", "torch"],
    qualityChecks: ["measurement", "fit", "finish"],
    safetyRequirements: ["ventilation"]
  },
  
  // Constraints & Limits
  constraints: {
    minQuantity: 1,
    maxQuantity: 10,
    sizeRange: { min: 4, max: 13 }
  },
  
  // Analytics & Performance
  analytics: {
    timesUsed: 0,
    averageCompletionTime: null,
    customerSatisfactionScore: null,
    profitMargin: null
  },
  
  // Shopify Integration (maintained for orders)
  shopify: {
    productId: "gid://...",
    variantId: "gid://...",
    needsSync: false,
    lastSyncedAt: Date,
    shopifyPrice: 89.25
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  version: 1,
  isArchived: false
}
```

### **Admin Settings Schema:**
```javascript
{
  // Pricing Settings (Security Protected)
  pricing: {
    wage: 35.00,                 // Hourly wage in dollars
    administrativeFee: 0.15,     // 15% administrative fee
    businessFee: 0.10,           // 10% cost of business fee
    lastUpdated: Date,
    updatedBy: "admin"
  },
  
  // Security for Pricing Changes
  security: {
    pricingSecurityCode: "encrypted_hash",
    requiresCodeForPricing: true,
    codeExpiresAfter: 3600000,   // 1 hour
    lastCodeChange: Date
  },
  
  // Business Rules
  rules: {
    minLaborHours: 0.25,
    maxLaborHours: 8.0,
    minMaterialCost: 0,
    maxMaterialCost: 500,
    rushMultiplierDefault: 1.5
  }
}
```

### **Price Calculation Formula:**
`((laborHours × wage) + (materialCost × 1.5)) × ((administrativeFee + businessFee) + 1)`

### **Migration Script Enhancements:**
- Data transformation from current structure to v2.0 schema
- Category auto-detection from existing tags
- Labor hours estimation based on current pricing
- Material cost extraction and normalization
- Admin settings initialization with default values

---

## 🛠️ **Phase 2: Repair Tasks Management System + Admin Settings**

### **2.1 Database Layer**
- Enhanced RepairTaskService with full CRUD operations
- Dynamic pricing calculation engine
- Admin settings management with security
- Category and metal type management
- Bulk operations and import/export

### **2.2 Admin Settings System**
- **Pricing Settings Management**
  - Wage configuration
  - Administrative fee settings (percentage)
  - Business fee settings (percentage)
  - Security code protection for pricing changes
  
- **Security Implementation**
  - Encrypted security code storage
  - Time-based code expiration (1 hour default)
  - Audit logging for pricing changes
  - Role-based access to pricing settings

- **Business Rules Engine**
  - Min/max labor hours validation
  - Material cost limits
  - Rush job multiplier settings
  - Bulk discount thresholds

### **2.3 API Layer**
```
GET    /api/repair-tasks                    # List with advanced filtering
POST   /api/repair-tasks                    # Create new task
GET    /api/repair-tasks/:id                # Get single task
PUT    /api/repair-tasks/:id                # Update task
DELETE /api/repair-tasks/:id                # Soft delete task
GET    /api/repair-tasks/categories         # Get categories and metal types
POST   /api/repair-tasks/bulk-update        # Bulk operations
GET    /api/repair-tasks/calculate-price    # Calculate price with current settings

# NEW: Admin Settings APIs
GET    /api/admin/settings                  # Get admin settings (excluding sensitive data)
PUT    /api/admin/settings/pricing          # Update pricing settings (requires security code)
POST   /api/admin/settings/verify-code     # Verify security code for pricing access
PUT    /api/admin/settings/security-code   # Change security code
GET    /api/admin/settings/audit-log       # Get pricing change history
```

### **2.4 Admin UI Components**
- **RepairTasksList**: Main management interface with pricing preview
- **RepairTaskForm**: Create/edit with real-time price calculation
- **RepairTaskFilters**: Filter by category, metal type, price range
- **PricingCalculator**: Live pricing tool with breakdown
- **CategoryManager**: Manage categories, metal types, constraints
- **BulkActions**: Import/export with pricing updates

### **NEW: Admin Settings Components**
- **PricingSettingsPanel**: Manage wage, fees, business rules
- **SecurityCodeModal**: Security code verification for pricing changes
- **PricingAuditLog**: History of pricing changes with timestamps
- **BusinessRulesEditor**: Configure min/max limits and rules
- **PricingPreview**: Show price impact of settings changes

### **2.5 Enhanced Features**
- **Dynamic Pricing Engine**: Real-time price calculation using business formula
- **Metal Type Integration**: Conditional metal type requirements
- **Security Protection**: Secured pricing settings with audit trail
- **Price Impact Analysis**: Show how settings changes affect existing tasks
- **Bulk Pricing Updates**: Recalculate all task prices when settings change
- **Usage Analytics**: Track which tasks are most profitable

---

## 🎫 **Phase 3: Repair Ticket Integration**

### **3.1 Enhanced Repair Ticket Schema**
```javascript
{
  // ... existing ticket fields ...
  
  // New repair tasks integration
  repairTasks: [
    {
      taskId: ObjectId,              // Reference to repair task
      sku: "RT-SIZING-001",
      title: "Ring Sizing",
      quantity: 1,
      pricing: {
        basePrice: 45.00,
        materialCost: 0,
        laborHours: 0.5,
        rushUpcharge: 0,
        totalPrice: 45.00
      },
      specifications: {
        currentSize: "6",
        targetSize: "7",
        notes: "Customer prefers slightly loose fit"
      },
      status: "pending",             // pending, approved, in_progress, completed
      assignedTo: "workshop_team",
      estimatedCompletion: Date,
      actualCompletion: Date
    }
  ],
  
  // Calculated totals
  totals: {
    subtotal: 45.00,
    rushCharges: 0,
    materialCosts: 0,
    laborHours: 0.5,
    total: 45.00
  }
}
```

### **3.2 Ticket Creation Flow**
1. **Task Selection**: Browse/search repair tasks
2. **Configuration**: Set specifications and options
3. **Pricing Preview**: Real-time price calculation
4. **Customer Approval**: Present quote for approval
5. **Ticket Creation**: Generate ticket with selected tasks

### **3.3 UI Components**
- **RepairTaskSelector**: Task browsing and selection
- **TaskConfigurator**: Configure selected tasks
- **PricingPreview**: Live pricing calculations
- **TicketBuilder**: Drag-and-drop ticket construction

---

## 🛒 **Phase 4: Shopify Order Creation**

### **4.1 Order Generation Logic**
```javascript
// From repair ticket, create Shopify order
const createShopifyOrderFromTicket = (ticket) => {
  const lineItems = ticket.repairTasks.map(task => ({
    variant_id: task.shopifyVariantId,
    quantity: task.quantity,
    price: task.pricing.totalPrice,
    properties: [
      { name: "Specifications", value: JSON.stringify(task.specifications) },
      { name: "Ticket ID", value: ticket.ticketId },
      { name: "Rush Job", value: task.pricing.rushUpcharge > 0 ? "Yes" : "No" }
    ]
  }));
  
  return {
    order: {
      line_items: lineItems,
      customer: ticket.customer,
      tags: [`ticket-${ticket.ticketId}`, "repair-order"],
      note: `Generated from repair ticket ${ticket.ticketId}`
    }
  };
};
```

### **4.2 Order Types**
- **Deposit Orders**: 50% upfront payment
- **Final Orders**: Remaining balance + any changes
- **Rush Orders**: Expedited processing with upcharges

### **4.3 Sync Requirements**
- Keep Shopify product/variant IDs in repair tasks
- Update Shopify descriptions when internal tasks change
- Handle discontinued tasks gracefully

---

## 🔄 **Phase 5: Shopify Product Deprecation**

### **5.1 Gradual Migration**
1. **Dual System**: Run both systems in parallel
2. **Validation**: Compare orders from both systems
3. **Training**: Staff training on new system
4. **Monitoring**: Track system performance and issues

### **5.2 Shopify Cleanup**
1. **Archive Products**: Move to "Archived" status
2. **Update Descriptions**: Add deprecation notices
3. **Redirect Orders**: Ensure existing orders still process
4. **Backup Data**: Export all Shopify repair task data

---

## 📊 **Implementation Timeline**

### **Week 1-2: Phase 1 - Data Structure**
- [ ] Design new repair task schema
- [ ] Create migration script for existing data
- [ ] Validate data transformation
- [ ] Update database service layer

### **Week 3-4: Phase 2 - Management System**
- [ ] Build enhanced API endpoints
- [ ] Create admin UI components
- [ ] Implement category management
- [ ] Add pricing calculator

### **Week 5-6: Phase 3 - Ticket Integration**
- [ ] Update repair ticket schema
- [ ] Build task selection interface
- [ ] Implement pricing preview
- [ ] Create ticket builder UI

### **Week 7-8: Phase 4 - Shopify Integration**
- [ ] Build order creation logic
- [ ] Test deposit/final order flow
- [ ] Implement error handling
- [ ] Add order tracking

### **Week 9-10: Phase 5 - Migration & Cleanup**
- [ ] Parallel system testing
- [ ] Staff training and documentation
- [ ] Shopify product deprecation
- [ ] System monitoring and optimization

---

## 🎯 **Success Metrics**

### **Performance Improvements**
- Repair ticket creation time: < 2 minutes
- Task search/selection: < 5 seconds
- Order generation: < 30 seconds

### **Business Benefits**
- Custom pricing flexibility
- Better workflow integration
- Reduced Shopify dependency
- Enhanced reporting capabilities

### **User Experience**
- Intuitive task selection
- Real-time pricing feedback
- Streamlined ticket creation
- Mobile-responsive interface

---

## 🚀 **Next Steps**

1. **Review and approve** this roadmap
2. **Start with Phase 1**: Redesign repair task schema
3. **Create sample data** for testing and validation
4. **Set up development environment** for new components
5. **Begin implementation** following the phased approach

This roadmap provides a structured approach to migrating from Shopify-dependent repair tasks to a fully integrated internal system while maintaining order fulfillment capabilities.
