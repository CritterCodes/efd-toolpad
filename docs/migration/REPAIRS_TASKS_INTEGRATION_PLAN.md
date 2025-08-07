# Repairs-Tasks Integration Migration Plan

## Overview
Migrate the repairs system from Shopify-based `repairTasks` to the new MVC-based `tasks` system.

## Current Architecture

### Old System (repairTasks)
- **Collection**: `repairTasks` (MongoDB)
- **Service**: RepairTasksDatabaseService
- **API**: `/api/repairTasks` (bridge route we just created)
- **Fields**: title, sku, price, description, vendor, tags, shopifyProductId
- **Used by**: Repair creation workflow, admin settings

### New System (tasks)
- **Collection**: `tasks` (MongoDB)
- **Service**: TasksModel + TasksService + TasksController
- **API**: `/api/tasks/*` (Full MVC with authentication)
- **Fields**: title, description, category, subcategory, metalType, basePrice, laborHours, skillLevel, riskLevel, isActive, createdAt, updatedAt
- **Features**: Authentication, SKU generation, user tracking, enhanced statistics

## Data Structure Mapping

| Old repairTasks | New tasks | Migration Notes |
|----------------|-----------|----------------|
| title | title | Direct mapping |
| description | description | Direct mapping |
| price | basePrice | Direct mapping |
| sku | Generated automatically | New system auto-generates |
| vendor | category or subcategory | Map based on vendor type |
| tags | category | Map primary tag to category |
| shopifyProductId | Remove | Not needed in new system |

## Migration Steps

### Phase 1: Data Migration Service ✅ COMPLETE
1. ✅ Create data migration utility to transfer repairTasks to tasks
2. ✅ Implement field mapping logic
3. ✅ Handle data validation and cleanup

### Phase 2: Service Integration ✅ COMPLETE
1. ✅ Update RepairTaskService to use new tasks API
2. ✅ Replace RepairTasksDatabaseService calls with TasksService
3. ✅ Update repairs form component to use new data structure

### Phase 3: Frontend Updates ✅ COMPLETE
1. ✅ Update repair creation workflow components
2. ✅ Modify task selection interface with enhanced filtering
3. ✅ Update repair display components to handle new task structure

### Phase 4: API Cleanup 🔄 IN PROGRESS
1. 📅 Execute data migration (ready to run)
2. 📅 Remove deprecated `/api/repairTasks` route
3. 📅 Update admin settings to use tasks
4. 📅 Clean up RepairTasksDatabaseService

## Phase 3 Completion Summary

### ✅ Enhanced Task Selection Component
- **Data Normalization**: RepairTaskService now handles both old and new task structures
- **Enhanced UI**: Rich task display with category, metal type, labor hours, and skill level
- **Advanced Filtering**: Category and metal type filters with visual chips
- **Better UX**: Improved layout with task details, total cost calculation, and clear task management

### ✅ Frontend Component Updates
- **tasks.js**: Complete overhaul with filtering, enhanced display, and new data structure support
- **repairDetailsForm.component.js**: Already compatible with both price structures
- **repairTasksTable.component.js**: Compatible through RepairTaskService normalization

### ✅ Backward Compatibility Maintained
- All components work with both old and new task data structures
- Pricing calculations preserved (basePrice mapped to price)
- SKU generation and metal type logic maintained
- Fallback systems in place during transition

## Field Mapping Strategy

```javascript
// Example mapping function
function mapRepairTaskToTask(repairTask) {
  return {
    title: repairTask.title,
    description: repairTask.description || '',
    category: inferCategoryFromVendor(repairTask.vendor) || 'repair',
    subcategory: repairTask.vendor,
    metalType: inferMetalType(repairTask.title, repairTask.description),
    basePrice: repairTask.price || 0,
    laborHours: 0, // Default - will need manual update
    skillLevel: 'standard', // Default
    riskLevel: 'low', // Default
    isActive: true,
    // SKU will be auto-generated
    // createdAt/updatedAt will be set automatically
  };
}
```

## Implementation Priority
1. **IMMEDIATE**: Create data migration service (HIGH PRIORITY)
2. **NEXT**: Update RepairTaskService to use /api/tasks
3. **THEN**: Update repair form components
4. **FINALLY**: Remove deprecated code

## Risk Mitigation
- Keep both systems running during transition
- Implement thorough data validation
- Create rollback procedures
- Test repair creation thoroughly

## Testing Strategy
- Unit tests for migration functions
- Integration tests for repairs workflow
- End-to-end testing of task selection
- Verify pricing calculations remain accurate

## Success Metrics
- All repairs can be created with new tasks system
- Data integrity maintained during migration
- Performance equal or better than old system
- No functionality loss in repair workflow
