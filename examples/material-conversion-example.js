/**
 * Example: Converting Your Existing Material to Multi-Variant Format
 * 
 * This shows how your current 14K Yellow Gold Solder Sheet would convert
 * and how you'd group similar materials into variants.
 */

import MaterialDataConverter from '@/utils/material-data-converter';

// Your existing material
const existingMaterial = {
  "_id": { "$oid": "6896417006c19cd8cf71342a" },
  "sku": "MT-SO-G864",
  "name": "14k_yellow_cadmium_free_hard_plumb_solder_sheet",
  "displayName": "14K Yellow Cadmium Free Hard Plumb Solder Sheet",
  "category": "solder",
  "unitCost": 111.41,
  "unitType": "sheet",
  "compatibleMetals": ["yellow_gold"],
  "supplier": "Stuller",
  "description": "Solder",
  "stuller_item_number": "SOLDER:77433:P",
  "auto_update_pricing": true,
  "last_price_update": { "$date": "2025-08-09T00:35:08.649Z" },
  "isActive": true,
  "createdAt": { "$date": "2025-08-09T00:35:08.649Z" },
  "updatedAt": { "$date": "2025-08-09T00:35:08.649Z" },
  "createdBy": "jacobaengel55@gmail.com",
  "karat": "14K",
  "portionsPerUnit": 30,
  "portionType": "clip",
  "costPerPortion": 7.427,
  "pricing": {
    "basePrice": 3.714,
    "materialMarkup": 2,
    "finalPrice": 7.427,
    "calculatedAt": { "$date": "2025-08-09T00:35:08.678Z" }
  }
};

// Convert to multi-variant format
const convertedMaterial = MaterialDataConverter.convertLegacyToVariant(existingMaterial);

console.log('Converted Material:', JSON.stringify(convertedMaterial, null, 2));

// Result would be:
const expectedResult = {
  "_id": { "$oid": "6896417006c19cd8cf71342a" },
  "name": "cadmium_free_hard_plumb_solder_sheet",
  "displayName": "Cadmium Free Hard Plumb Solder Sheet",
  "category": "solder",
  "unitType": "sheet",
  "supplier": "Stuller", 
  "description": "Solder",
  "isActive": true,
  "autoUpdate": true,
  
  // Multi-variant structure
  "hasVariants": true,
  "variants": [{
    "metalType": "gold",
    "karat": "14k", 
    "sku": "MT-SO-G864",
    "unitCost": 111.41,
    "stullerProductId": "SOLDER:77433:P",
    "compatibleMetals": ["gold"],
    "isActive": true,
    "lastUpdated": "2025-08-09T00:35:08.649Z",
    "notes": "30 clip per unit; Cost per portion: $7.427; Markup: 2x; Converted from legacy material: 14K Yellow Cadmium Free Hard Plumb Solder Sheet"
  }],
  
  // Legacy fields set to null
  "unitCost": null,
  "sku": null,
  "stullerProductId": null,
  "metalType": null,
  "karat": null,
  
  // Preserved metadata
  "createdAt": "2025-08-09T00:35:08.649Z",
  "updatedAt": "2025-08-09T00:35:08.649Z",
  "createdBy": "jacobaengel55@gmail.com"
};

// Example: If you had multiple similar solder materials
const similarMaterials = [
  existingMaterial, // 14K
  {
    "_id": { "$oid": "6896417006c19cd8cf71342b" },
    "sku": "MT-SO-G865",
    "name": "18k_yellow_cadmium_free_hard_plumb_solder_sheet",
    "displayName": "18K Yellow Cadmium Free Hard Plumb Solder Sheet",
    "category": "solder",
    "unitCost": 145.62,
    "karat": "18K",
    "compatibleMetals": ["yellow_gold"],
    // ... other similar properties
  },
  {
    "_id": { "$oid": "6896417006c19cd8cf71342c" },
    "sku": "MT-SO-G863", 
    "name": "10k_yellow_cadmium_free_hard_plumb_solder_sheet",
    "displayName": "10K Yellow Cadmium Free Hard Plumb Solder Sheet",
    "category": "solder",
    "unitCost": 85.20,
    "karat": "10K",
    "compatibleMetals": ["yellow_gold"],
    // ... other similar properties
  }
];

// Group similar materials
const materialGroups = MaterialDataConverter.groupSimilarMaterials(similarMaterials);

console.log('Material Groups:', materialGroups);
// This would identify that all three materials are similar and should be combined

// Create multi-variant from the group
if (materialGroups.length > 0) {
  const { multiVariant, originalMaterialIds } = MaterialDataConverter.createMultiVariantFromGroup(materialGroups[0]);
  
  console.log('Multi-Variant Material:', JSON.stringify(multiVariant, null, 2));
  console.log('Original IDs to archive:', originalMaterialIds);
}

// The result would be one material with three variants:
const finalMultiVariantResult = {
  "name": "cadmium_free_hard_plumb_solder_sheet",
  "displayName": "Cadmium Free Hard Plumb Solder Sheet",
  "category": "solder",
  "hasVariants": true,
  "variants": [
    {
      "metalType": "gold",
      "karat": "14k",
      "sku": "MT-SO-G864", 
      "unitCost": 111.41,
      // ... other 14K properties
    },
    {
      "metalType": "gold",
      "karat": "18k",
      "sku": "MT-SO-G865",
      "unitCost": 145.62,
      // ... other 18K properties
    },
    {
      "metalType": "gold", 
      "karat": "10k",
      "sku": "MT-SO-G863",
      "unitCost": 85.20,
      // ... other 10K properties
    }
  ]
};

// Usage in processes: Instead of selecting specific materials, select base material
// and let the system calculate cost based on job requirements

// Example process cost calculation:
const processCost = MaterialDataConverter.calculateVariantCost(
  finalMultiVariantResult, 
  'gold',  // job metal type
  '14k'    // job karat
);

console.log('Process cost for 14K gold job:', processCost); // 111.41

export { 
  existingMaterial,
  convertedMaterial,
  expectedResult,
  similarMaterials,
  finalMultiVariantResult
};
