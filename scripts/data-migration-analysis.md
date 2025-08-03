# Repair Task Data Migration Analysis

## 🔍 **Current Schema Analysis**

### **Existing Repair Task Structure:**
```json
{
  "_id": "688e327bc6027dc0bc9e4c12",
  "sku": "repair-101-szdn-ss",
  "description": "",
  "handle": "101-ss-smaller", 
  "images": [...],
  "inventoryQuantity": -2,
  "price": 30,
  "productType": "repair",
  "shopifyCreatedAt": "2023-07-18T00:08:27.000Z",
  "shopifyProductId": "gid://shopify/Product/7600157556921",
  "shopifyUpdatedAt": "2025-08-02T00:37:27.000Z",
  "shopifyVariantId": "gid://shopify/ProductVariant/43796078624953",
  "status": "ACTIVE",
  "syncVersion": "1.0.0",
  "syncedAt": "2025-08-02T15:44:59.159Z",
  "tags": ["repair task", "retail repair", "sizing"],
  "title": "Size Down",
  "variantCreatedAt": "2024-03-20T20:38:18.000Z",
  "variantUpdatedAt": "2024-08-15T17:08:06.000Z",
  "vendor": "[efd] Repair Shop",
  "weight": 0,
  "weightUnit": "POUNDS"
}
```

## 📊 **Field Mapping Analysis**

### **✅ PRESERVE (Direct Map)**
| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `_id` | `_id` | Keep existing MongoDB ID |
| `title` | `title` | Direct mapping |
| `description` | `description` | Keep if not empty |
| `price` | `analytics.originalPrice` | Reference only - will be overwritten by calculated price |
| `tags` | `display.tags` | UI filtering tags |
| `images` | `display.thumbnailUrl` | Use first image URL |
| `status` | `display.isActive` | ACTIVE → true |

### **🔄 TRANSFORM (Requires Logic)**
| Old Field | New Field | Transformation Logic |
|-----------|-----------|---------------------|
| `sku` | `sku` + `shortCode` | Extract/generate shortCode from old SKU |
| `tags` | `category` | Parse category from tags (sizing, prong, etc) |
| `title` | `subcategory` | Derive subcategory from title |
| `price` | `laborHours` + `materialCost` | **REVERSE CALCULATE** from price |

### **🆕 GENERATE (New Fields)**
| New Field | Generation Strategy |
|-----------|-------------------|
| `shortCode` | Generate from category/title analysis |
| `laborHours` | Default estimates by category |
| `materialCost` | Default estimates by category |
| `metalType` | Parse from SKU/tags if available |
| `requiresMetalType` | Set based on category |
| `service.*` | Default values by category |
| `workflow.*` | Default values by category |
| `constraints.*` | Default values by category |
| `analytics.*` | Initialize as null/0 (except originalPrice) |
| `shopify.*` | Initialize for new products - will be populated by sync script |
| `basePrice` | Will be calculated using new pricing formula with consumablesFee |

### **❌ DISCARD (Not Needed)**
| Old Field | Reason |
|-----------|--------|
| `handle` | Not needed in new schema |
| `inventoryQuantity` | Not applicable to services |
| `productType` | All are "repair" |
| `syncVersion` | Reset in new system |
| `vendor` | Static value |
| `weight` / `weightUnit` | Not applicable |
| `variantCreatedAt` / `variantUpdatedAt` | Use main timestamps |
| `shopifyProductId` | Will create new products - archive old ones |
| `shopifyVariantId` | Will create new products - archive old ones |
| `shopifyCreatedAt` | `createdAt` | Use as creation timestamp |
| `shopifyUpdatedAt` | `updatedAt` | Use as update timestamp |
| `syncedAt` | Reset with new sync system |

## 🧩 **Key Challenges**

### **1. SKU Analysis & ShortCode Generation**
Current SKU format: `"repair-101-szdn-ss"`
- Need to parse: category, metal type, task type
- Generate new shortCode: `02201` format
- Generate new SKU: `RT-SHANK-02201`

### **2. Reverse Price Calculation**
Current: Have final price ($30)
Need: laborHours + materialCost to feed into formula
- Use category-based estimates
- Back-calculate reasonable labor/material split

### **3. Category Classification**
From tags/title, determine:
- `category`: shank, prongs, stone_setting, etc.
- `subcategory`: ring_sizing, prong_repair, etc.
- `metalType`: gold, silver, platinum, etc.

### **4. Missing Business Data**
New schema requires business logic that old schema lacks:
- Labor hours estimates
- Material costs
- Service details (turnaround, skill level)
- Workflow requirements

## 📋 **Migration Strategy**

### **Phase 1: Data Analysis Script**
1. Analyze all 92 repair tasks
2. Extract patterns from SKUs, titles, tags
3. Create classification mapping
4. Generate shortCode mapping table

### **Phase 2: Migration Script**
1. Transform each old task to new schema
2. Generate missing business data with defaults
3. Create new collection with v2.0 structure
4. Preserve Shopify integration data

### **Phase 3: Shopify Sync Script**
1. Create completely new Shopify products with new SKUs
2. Link new products to migrated repair tasks
3. Archive/delete old Shopify products to avoid confusion
4. Set new calculated pricing based on business formula

This analysis shows we can preserve most critical data while upgrading to the new business-focused schema!
