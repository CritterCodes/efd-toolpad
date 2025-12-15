# Dynamic Pricing Implementation for Jewelry Products

## Overview
Implemented a dynamic pricing mechanism for jewelry products, similar to the CAD Request system. This allows pricing to be calculated based on STL file volume, labor costs, and real-time metal prices.

## Changes

### 1. Frontend: `src/app/dashboard/products/jewelry/[id]/page.js`

- **New Component**: `DynamicPricing`
  - Inputs for:
    - Enable/Disable toggle
    - STL Volume (cm³)
    - Labor Costs (CAD, Production, Mounting)
    - Other Costs
    - Metal Selection (Multi-select from available metal types)
  - Displays a live preview of costs for each selected metal, calculated using:
    - Wax Weight (from Volume * 1.02)
    - Metal Weight (from Wax Weight * Specific Gravity)
    - Metal Cost (from Weight * Market Price)
    - Total Cost (Metal Cost + Labor Costs)

- **State Management**:
  - Added `dynamicPricing` object to `formData` state.
  - Initialized with default values:
    ```javascript
    dynamicPricing: {
        enabled: false,
        stlVolume: 0,
        cadLabor: 0,
        productionLabor: 0,
        mountingLabor: 0,
        otherCosts: 0,
        selectedMetals: []
    }
    ```

- **Data Fetching**:
  - Updated `fetchJewelry` to retrieve `dynamicPricing` data from the API response.
  - Updated `handleSave` to include `dynamicPricing` in the payload (handled automatically via `formData`).

- **UI Integration**:
  - Inserted `<DynamicPricing />` component into the main editor layout, between `MetalList` and `StoneList`.

### 2. Backend: API Routes

- **POST** (`/api/products/jewelry/route.js`) and **PUT** (`/api/products/jewelry/[id]/route.js`):
  - No changes were strictly necessary as the existing logic spreads `...otherData` into the `jewelry` object in the database.
  - This ensures `dynamicPricing` is saved as `jewelry.jewelry.dynamicPricing`.

## Usage
1. Open a Jewelry Product in the dashboard.
2. Scroll down to the "Materials & Stones" section.
3. Enable "Dynamic Pricing".
4. Enter the STL Volume (cm³) and Labor Costs.
5. Select applicable metals.
6. View the calculated costs for each metal option.
7. Save the product.

## Dependencies
- `@/constants/metalTypes`: Used for specific gravity (`sg`) and price adjustment logic.
- `metalPrices`: Fetched from `/api/metal-prices`.
