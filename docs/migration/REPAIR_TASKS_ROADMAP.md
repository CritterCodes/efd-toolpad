# Repair Tasks Management System - Migration Roadmap

## 🎯 **Project Overview**
**Internal Admin CRM System** - Migrate repair task management from Shopify products to internal database system for admin-only use. This is an internal CRM for business operations, pricing management, and repair workflow - no client or wholesaler access.

## 📋 **Migration Strategy - UPDATED STATUS**
- **Phase 1**: Redesign repair task data structure ✅ **COMPLETED**
- **Phase 2**: Admin settings & pricing system ✅ **COMPLETED** 
- **Phase 3**: Admin interface & settings management ✅ **COMPLETED**
- **Phase 4**: Shopify integration modernization ✅ **COMPLETED**
- **Phase 5**: Database-driven integrations ✅ **COMPLETED**
- **Phase 6**: Navigation & UI optimization ✅ **COMPLETED**
- **Phase 7**: Code cleanup & modernization ✅ **COMPLETED**

**🎉 PROJECT STATUS: FULLY COMPLETED - All major migration goals achieved!**

---

## 🚀 **MAJOR ACCOMPLISHMENTS**

### **✅ Database Migration Complete**
- Successfully migrated from Shopify product-based system to MongoDB
- Full repair task management system with v2.0 schema
- 92 repair tasks migrated with enhanced data structure
- Dynamic pricing calculations with business formula integration

### **✅ Shopify Integration Modernized**  
- Updated to Shopify API version 2025-07 (latest)
- Migrated from environment variables to secure database configuration
- Implemented AES-256-GCM encryption for sensitive credentials
- REST API endpoints replacing complex GraphQL queries
- Database-driven configuration management

### **✅ Admin Interface Complete**
- Full admin settings dashboard with tabbed interface
- Real-time Shopify connection testing
- Integrated pricing management with live calculations
- Material and process management interfaces
- Comprehensive analytics dashboard

### **✅ Security & Performance Enhancements**
- Encrypted credential storage in database
- JWT authentication with NextAuth.js integration
- Audit logging for all administrative actions
- Environment variable cleanup and modernization
- Streamlined API structure

### **✅ Navigation & User Experience**
- Fixed navigation path duplication issues
- Implemented proper dropdown menus for complex workflows
- Repairs workflow organized: All, Move, Pick-up, Quality Control, Parts, Bulk Print
- Tasks management: Materials, Processes, Creation flows
- Updated to modern MUI ThemeProvider (removed deprecated components)

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
  basePrice: null,               // Calculated: ((laborHours × wage) + (materialCost × 1.5)) × ((adminFee + businessFee + consumablesFee) + 1)
  
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
    consumablesFee: 0.05,        // 5% consumables fee (tools, equipment wear)
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
**Business Pricing Formula (Legacy):**
`((laborHours × wage) + (materialCost × materialMarkup)) × ((administrativeFee + businessFee + consumablesFee) + 1)`

**New Process-Based Pricing Formula:**
```
Process Cost = Σ(processLaborMinutes × laborRate + processEquipmentCost) × metalComplexityMultiplier
Material Cost = Σ(materialQuantity × materialUnitCost) × materialMarkup
Base Cost = Process Cost + Material Cost
Retail Price = Base Cost × businessMultiplier
Wholesale Price = Retail Price × 0.5
```

**Enhanced Admin Settings Schema:**
```javascript
{
  // Pricing Settings (Security Protected)
  pricing: {
    wage: 35.00,                 // Hourly wage in dollars
    laborRatePerMinute: 0.583,   // Calculated: wage / 60
    materialMarkup: 1.5,         // Configurable material markup (was hardcoded)
    administrativeFee: 0.15,     // 15% administrative fee
    businessFee: 0.10,           // 10% cost of business fee
    consumablesFee: 0.05,        // 5% consumables fee (tools, equipment wear)
    businessMultiplier: 2.0,     // Calculated total multiplier
    lastUpdated: Date,
    updatedBy: "admin"
  }
}
```

### **Migration Script Enhancements:**
- Data transformation from current structure to v2.0 schema
- Category auto-detection from existing tags
- Labor hours estimation based on current pricing
- Material cost extraction and normalization
- Admin settings initialization with default values

---

## **Phase 2: Admin Settings & Order Integration** 
*Estimated: 6 hours*

### **2.1 Admin Settings Initialization** (2h)
- ✅ ConsumablesFee configuration and security (8% fee implemented)
- ✅ Business parameter setup ($45/hr wage, 48% total fees)
- ✅ Access control with time-based 4-digit security PINs

### **2.2 Price Calculation Engine** (3h)  
- ✅ Apply v2.0 formula to all migrated tasks
- ✅ Generate pricing analytics (avg -8.4% price change)
- ✅ Validate calculated vs. original pricing

### **2.3 Shopify Order Integration** (1h) **[UPDATED APPROACH]**
- 🔄 **NEW STRATEGY:** Custom line item orders instead of products
- ✅ Dynamic order creation with repair task line items
- ✅ Real-time pricing with rush fees and modifications
- ✅ Clean Shopify catalog (no product clutter)
- ✅ Detailed line item properties and descriptions

---

## 🎫 **Phase 3: Admin Interface & Settings Management**
**Status: COMPLETED** ✅  
**Completion Date: January 14, 2025**

### **3.1 Admin Settings UI** (4h) - COMPLETED ✅
- **SecureSettingsPanel**: Protected admin interface for fee management
- **SecurityPINModal**: Time-based 4-digit PIN entry
- **PricingPreview**: Live preview of price changes before saving
- **FeeConfigurationForm**: Wage, administrative, business, and consumables fee inputs

### **3.2 Settings Security System** (2h) - COMPLETED ✅
- **SecurityPINGeneration**: 4-digit time-based PINs with expiration
- **AccessControlMiddleware**: API protection for settings endpoints
- **AuditTrail**: Log all pricing changes with timestamps and user info
- **SessionManagement**: Secure settings access with timeout

### **3.3 Price Recalculation Engine** (2h) - COMPLETED ✅
- **AutoRecalculation**: Update all repair task prices when settings change
- **BatchPriceUpdate**: Efficient bulk price updates with progress tracking
- **ValidationSystem**: Ensure price changes are reasonable and valid
- **ChangeComparison**: Before/after price analysis and reporting

### **3.4 API Endpoints** (2h) - COMPLETED ✅
- `GET /api/admin/settings` - Fetch current settings (authenticated)
- `POST /api/admin/settings/verify-code` - Verify security PIN
- `PUT /api/admin/settings` - Update settings and recalculate prices
- `GET /api/admin/settings/pricing-impact` - Preview price changes

### **3.5 Admin-Only CRM Dashboard** (1h) - COMPLETED ✅
- **Simplified Navigation**: Single navigation for all authenticated admin users
- **Clean Interface**: Professional admin CRM dashboard
- **System Status**: Real-time monitoring of database and system health
- **Quick Actions**: Direct access to all major admin functions

**Phase 3 Total: 11 hours** ✅ **[Enhanced with CRM simplification]**

---

## 🛠️ **Phase 4: Process-Based Repair Task Management** 
**Status: IN PROGRESS** 🔄  
**Started: August 2, 2025**

### **4.1 Task Browse & Search** (3h) - COMPLETED ✅ 
- **RepairTaskTable**: Sortable, filterable task listing for admin use
- **CategoryFilter**: Filter by category, metal type, price range
- **SearchBar**: Full-text search across titles and descriptions
- **TaskDetails**: Expandable detail view with pricing breakdown

### **4.2 Task Management Operations** (4h) - COMPLETED ✅
- **TaskEditor**: Edit labor hours, material costs, descriptions (Create/Edit forms)
- **TaskActivation**: Enable/disable tasks via archive/delete options
- **TaskDuplication**: Clone functionality through task creation
- **ArchiveSystem**: Soft delete (archive) tasks while preserving data
- **HardDelete**: Permanent deletion option for complete removal

### **4.3 Category & Metal Management** (1h) - COMPLETED ✅
- **CategoryManager**: Predefined categories with emoji icons
- **MetalTypeManager**: Gold, Silver, Platinum, Mixed metal support
- **DefaultsManager**: Category-specific defaults and validation

### **4.4 Process-Based Pricing System** (6h) - NEARLY COMPLETE ✅
- **Enhanced Admin Settings**: Material markup as configurable parameter ✅ COMPLETED
- **Updated Price Calculations**: All APIs now use configurable material markup ✅ COMPLETED
- **Form Price Preview**: Real-time calculations with current admin settings ✅ COMPLETED
- **ProcessDatabase**: Individual repair processes with labor and equipment costs ✅ COMPLETED
- **MaterialsDatabase**: Consumable materials with unit costs and compatibility ✅ COMPLETED
- **Process-Based Task Builder**: Select processes + materials for accurate pricing ✅ COMPLETED
- **Seed Data**: Initial processes and materials data ready for import ✅ COMPLETED
- **Database Collections**: Created `repairProcesses` (6 items) and `repairMaterials` (8 items) ✅ COMPLETED
- **Wholesale Pricing**: Automatic 50% discount for trade accounts ⏸️ PENDING

**Phase 4 Total: 14 hours** 🔄 **[Enhanced with process-based pricing]**

---

## 📋 **Phase 5: Internal Repair Ticket System**
**Status: PENDING** ⏸️  
**Estimated: 10 hours** 

### **5.1 Ticket Creation Interface** (4h)
- **ClientSelector**: Choose existing clients from database
- **TaskSelector**: Browse and add repair tasks to ticket
- **SpecificationCapture**: Custom requirements and notes
- **PricingCalculator**: Real-time pricing with rush fees

### **5.2 Ticket Management** (4h)
- **TicketWorkflow**: Status tracking (quote → approved → in-progress → complete)
- **PrintableQuotes**: Professional quotes for client approval
- **PhotoUpload**: Before/after photos and documentation
- **StatusUpdates**: Internal notes and progress tracking

### **5.3 Client Communication** (2h)
- **EmailNotifications**: Automated status updates
- **SMS Integration**: Quick updates for pickup notifications
- **ApprovalSystem**: Digital quote approval workflow

---

## 🛒 **Phase 4: Shopify Order Integration** 
*[Moved to later phase]*

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
