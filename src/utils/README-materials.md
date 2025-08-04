# Materials Utils Documentation

## Overview
The materials utilities provide a centralized collection of constants, helper functions, and data transformation utilities for the materials management system.

## Key Features

### 📊 Constants
- **MATERIAL_CATEGORIES**: All available material categories
- **UNIT_TYPES**: Available unit types for materials  
- **PORTION_TYPES**: Portion subdivision options
- **KARAT_OPTIONS**: Karat/purity options with labels
- **METAL_OPTIONS**: Compatible metal options
- **DEFAULT_MATERIAL_FORM**: Default form state structure

### 🔧 Utility Functions

#### Display Formatting
- `formatCategoryDisplay(category)` - Format category for UI display
- `formatUnitTypeDisplay(unitType)` - Format unit type for UI display
- `formatPrice(price)` - Format price with $ and 2 decimals
- `formatPortionPrice(price)` - Format portion price with 4 decimals
- `getMetalLabel(metalValue)` - Get display label for metal value
- `getKaratLabel(karatValue)` - Get display label for karat value

#### Data Processing
- `transformMaterialForForm(material)` - Convert API material to form data
- `prepareFormDataForSubmission(formData)` - Process form data for API
- `calculatePortionPrice(unitCost, portionsPerUnit)` - Calculate portion pricing
- `hasPortions(material)` - Check if material uses portion subdivision

#### Validation & Analysis
- `validateMaterialForm(formData)` - Validate form data with error messages
- `filterMaterials(materials, filters)` - Filter materials by multiple criteria
- `sortMaterials(materials, sortBy, sortOrder)` - Sort materials array
- `getUniqueValues(materials, field)` - Extract unique values for filters
- `generateMaterialStats(materials)` - Generate summary statistics

## Usage Examples

```javascript
import {
  MATERIAL_CATEGORIES,
  formatPrice,
  hasPortions,
  transformMaterialForForm,
  validateMaterialForm
} from '@/utils/materials.util';

// Format price display
const displayPrice = formatPrice(25.50); // "$25.50"

// Check if material has portions
const material = { portionsPerUnit: 10 };
if (hasPortions(material)) {
  // Show portion pricing
}

// Transform material for editing
const formData = transformMaterialForForm(materialFromAPI);

// Validate form
const validation = validateMaterialForm(formData);
if (!validation.isValid) {
  console.log(validation.errors);
}
```

## Integration
This utility file works seamlessly with:
- **Materials Service** (`@/services/materials.service`) - API operations
- **Materials Page** - UI components and form handling
- **Material constants and types throughout the application

## Benefits
- ✅ **Centralized Constants** - Single source of truth for all material-related data
- ✅ **Reusable Functions** - Consistent formatting and processing across components
- ✅ **Type Safety** - JSDoc documentation for all functions
- ✅ **Maintainability** - Easy to update constants and logic in one place
- ✅ **Testability** - Pure functions that are easy to unit test
