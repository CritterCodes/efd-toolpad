# 🏗️ Improved EFD Product Schema Architecture

## 🎯 **Unified Product Structure**

### **Problem with Current Schema**
```javascript
// ❌ Current: Flat structure, hard to extend
{
  "_id": "...",
  "productType": "gemstone",
  "title": "test",
  "species": "Garnet",          // Gemstone-specific mixed with general
  "subspecies": "Rhodolite",    // Hard to add jewelry or CAD data later
  "carat": 5,
  "price": 5,
  "userId": "...",
  // ... flat structure continues
}
```

### **✅ Improved: Hierarchical Structure**
```javascript
{
  // === UNIVERSAL PRODUCT FIELDS ===
  "_id": ObjectId,
  "productType": "gemstone",              // 'gemstone' | 'cad-design' | 'jewelry'
  
  // General Product Info
  "title": "5ct Madagascar Rhodolite Garnet",
  "description": "Beautiful purple rhodolite with excellent clarity",
  "internalNotes": "Customer showed interest in vintage setting",
  
  // Ownership & Business
  "userId": "critter@engelfinedesign.com",
  "vendor": "Critter Engel",
  "createdAt": Date,
  "updatedAt": Date,
  
  // Status & Visibility
  "status": "approved",                   // draft/pending/approved/sold/archived
  "isPublic": true,                       // Show in marketplace
  "featured": false,
  
  // Universal Media (S3 hosted images)
  "images": [
    "https://efd-repair-images.s3.us-east-2.amazonaws.com/admin/products/gemstones/prod-123/image-1698765432-main.jpg",
    "https://efd-repair-images.s3.us-east-2.amazonaws.com/admin/products/gemstones/prod-123/image-1698765433-side.jpg"
  ],
  
  // Tags & Categories
  "tags": ["natural", "unheated", "investment-grade"],
  
  // === GEMSTONE-SPECIFIC DATA ===
  "gemstone": {
    // Physical Properties
    "species": "Garnet",
    "subspecies": "Rhodolite", 
    "carat": 5.0,
    "dimensions": {
      "length": 10.2,
      "width": 8.5,
      "height": 6.8
    },
    
    // Cutting & Treatment
    "cut": ["Oval"],
    "cutStyle": ["Brilliant"],
    "treatment": ["Untreated"],
    
    // Quality & Characteristics  
    "color": ["Purple", "Magenta"],
    "clarity": "VS1",
    "locale": "Madagascar",
    "naturalSynthetic": "natural",
    
    // Certification
    "certification": {
      "lab": "AGL",
      "number": "AGL12345",
      "url": "https://cdn.example.com/cert.pdf",
      "verified": true
    },
    
    // 3D Model for CAD Designers
    "obj3DFile": {
      "url": "https://cdn.example.com/rhodolite.obj",
      "filename": "rhodolite_5ct.obj",
      "fileSize": 2048576,
      "uploadedAt": Date,
      "downloadCount": 3
    },
    
    // Business Data
    "acquisitionDate": "2024-10-15",
    "acquisitionPrice": 800,
    "supplier": "Madagascar Gems Ltd",
    "retailPrice": 2500,
    
    // Work Pipeline Status
    "designCoverage": {
      "hasBasicBasket": false,            // ❌ Needs basic basket
      "hasBasicRing": false,              // ❌ Needs basic ring  
      "customDesignCount": 0,             // No custom designs yet
      "lastDesignAdded": null,
      "priorityLevel": "critical"         // High priority for designers
    }
  },
  
  // === AVAILABLE DESIGNS FOR THIS GEMSTONE ===
  "availableDesigns": [
    {
      "designId": "67890abcdef",          // Reference to CAD design product
      "designTitle": "Vintage Art Deco Setting",
      "designerUserId": "designer@example.com",
      "designerName": "Jane Smith CAD",
      "approvalStatus": "approved",       // pending/approved/rejected
      "adminApprovedBy": "admin@example.com", 
      "adminApprovedAt": Date,
      "estimatedCost": {
        "designFee": 150,
        "materialCost": 340,              // Based on design volume
        "laborCost": 200,
        "totalAdditional": 690            // Added to gemstone price
      },
      "metalOptions": [
        {
          "type": "14k Gold",
          "color": "Yellow", 
          "weight": "3.2g",
          "cost": 340
        },
        {
          "type": "18k Gold",
          "color": "White",
          "weight": "3.2g", 
          "cost": 425
        }
      ]
    }
    // More designs can be added as they're created and approved
  ],
  
  // === CROSS-PRODUCT RELATIONSHIPS ===
  "relatedProducts": [
    {
      "productId": "jewelry123",
      "relationship": "used-in",          // This gemstone was used in jewelry piece
      "notes": "Set in vintage engagement ring"
    }
  ]
}
```

## 🎨 **CAD Design Product Example**
```javascript
{
  "_id": "67890abcdef",
  "productType": "cad-design",
  
  // General Product Info
  "title": "Vintage Art Deco Setting for Oval Stones",
  "description": "Inspired by 1920s Art Deco jewelry with geometric details",
  "internalNotes": "Customer loves vintage styles, this should be popular",
  
  "userId": "designer@example.com",
  "vendor": "Jane Smith CAD",
  "status": "approved",
  "isPublic": true,
  
  "images": [
    {
      "url": "https://cdn.example.com/render1.jpg", 
      "type": "render",
      "altText": "3D render of Art Deco setting",
      "order": 1
    }
  ],
  
  "tags": ["vintage", "art-deco", "engagement"],
  
  // === CAD DESIGN-SPECIFIC DATA ===
  "cadDesign": {
    // Design Specifications
    "designType": "ring",
    "style": ["vintage", "art-deco"],
    "complexity": "moderate",
    
    // Target Requirements  
    "targetGemstoneId": "68fc10c9fb1524b3fa70b0aa", // Specific for our rhodolite
    "isGemstoneSpecific": true,
    
    // Alternative: Generic sizing (if not gemstone-specific)
    "gemstoneRequirements": {
      "shapes": ["Oval", "Cushion"],
      "sizeRange": {
        "minCarat": 3.0,
        "maxCarat": 7.0,
        "minLength": 8.0,
        "maxLength": 12.0
      }
    },
    
    // Metal Specifications
    "metalOptions": ["gold", "platinum"],
    "metalKarats": ["14k", "18k"],
    "metalColors": ["yellow", "white", "rose"],
    
    // Technical Files
    "files": {
      "stl": {
        "url": "https://cdn.example.com/artdeco.stl",
        "filename": "artdeco_setting.stl", 
        "fileSize": 5242880
      },
      "glb": {
        "url": "https://cdn.example.com/artdeco.glb",
        "filename": "artdeco_preview.glb",
        "fileSize": 1048576
      }
    },
    
    // Volume & Costing
    "designVolume": 850.5,              // Cubic millimeters
    "estimatedWeights": {
      "gold14k": 3.2,                   // grams
      "gold18k": 3.2,
      "platinum": 3.8
    },
    
    // Designer Business
    "designerFee": 150,
    "designerRoyalty": 0,               // No ongoing royalty
    "manufacturingNotes": "Requires careful prong setting",
    "settingDifficulty": "moderate",
    "estimatedProductionTime": 8,       // hours
    
    // Usage Tracking
    "timesUsed": 2,
    "jewelryReferences": ["jewelry456", "jewelry789"]
  }
}
```

## 💍 **Jewelry Product Example**
```javascript
{
  "_id": "jewelry456",
  "productType": "jewelry",
  
  // General Product Info
  "title": "Custom Rhodolite Art Deco Engagement Ring",
  "description": "Stunning 5ct rhodolite garnet in vintage-inspired setting",
  "internalNotes": "Customer's anniversary gift, rush order",
  
  "userId": "jeweler@example.com",
  "vendor": "Master Jeweler Co",
  "status": "completed",
  "isPublic": false,                    // Custom order, not for public sale
  
  "images": [
    {
      "url": "https://cdn.example.com/ring_final.jpg",
      "type": "final",
      "altText": "Completed rhodolite engagement ring",
      "order": 1
    }
  ],
  
  "tags": ["custom", "engagement", "vintage", "garnet"],
  
  // === JEWELRY-SPECIFIC DATA ===
  "jewelry": {
    // Basic Classification
    "category": "ring",
    "subcategory": "engagement", 
    "isCustomOrder": true,
    
    // Design Source
    "basedOnDesignId": "67890abcdef",   // Used our Art Deco CAD design
    "isOneOffDesign": false,
    
    // Materials Used
    "metal": {
      "type": "gold",
      "karat": "18k",
      "color": "white",
      "weight": 3.4,                    // Actual weight
      "finish": "high-polish"
    },
    
    // Gemstones Used
    "centerStone": {
      "gemstoneId": "68fc10c9fb1524b3fa70b0aa", // Our rhodolite
      "isCustomerStone": false,
      "settingStyle": "prong",
      "prongs": 4
    },
    
    "accentStones": [
      {
        "gemstoneId": null,             // Generic small diamonds
        "quantity": 12,
        "totalCarat": 0.24,
        "description": "12x 0.02ct round diamonds",
        "settingStyle": "pave"
      }
    ],
    
    // Dimensions & Sizing
    "sizing": {
      "ringSize": "6.5",
      "bandWidth": 2.8,
      "profileHeight": 7.2,
      "customMeasurements": "Slightly raised shoulders for comfort"
    },
    
    // Production Tracking
    "production": {
      "status": "completed",
      "assignedTo": "master.setter@example.com",
      "startDate": "2024-10-20",
      "estimatedCompletion": "2024-10-27",
      "actualCompletion": "2024-10-25",
      "progressImages": [
        "https://cdn.example.com/wax.jpg",
        "https://cdn.example.com/cast.jpg", 
        "https://cdn.example.com/set.jpg"
      ],
      "productionNotes": "Stone set perfectly, customer very happy"
    },
    
    // Customer & Order
    "customerId": "customer123",
    "orderId": "order789",
    
    // Pricing Breakdown
    "pricing": {
      "materialCost": 850,              // Rhodolite + gold + diamonds
      "laborCost": 400,                 // 8 hours at $50/hr
      "designFee": 150,                 // CAD designer fee
      "overhead": 210,                  // 15% overhead
      "markup": 402,                    // 25% markup
      "finalPrice": 2012,               // Customer paid
      "discounts": []
    }
  }
}
```

## 🔄 **Migration Strategy**

### **Current Data Migration**
Your existing gemstone needs to be restructured:

```javascript
// FROM (current flat structure):
{
  "_id": "68fc10c9fb1524b3fa70b0aa",
  "productType": "gemstone",
  "title": "test",
  "species": "Garnet",
  "subspecies": "Rhodolite",
  "carat": 5,
  "dimensions": { "length": "5", "width": "5", "height": "5" },
  "cut": ["Round"],
  "cutStyle": ["Brilliant"], 
  "treatment": ["untreated"],
  "color": ["purple"],
  "locale": "Madagascar",
  "naturalSynthetic": "natural",
  "price": 5,
  "customMounting": true,
  "userId": "critter@engelfinedesign.com",
  "vendor": "Critter Engel",
  "notes": "",
  "createdAt": "2025-10-24T23:50:33.222Z",
  "updatedAt": "2025-10-24T23:50:33.222Z"
}

// TO (new hierarchical structure):
{
  "_id": "68fc10c9fb1524b3fa70b0aa",
  "productType": "gemstone",
  
  // General product info
  "title": "5ct Madagascar Rhodolite Garnet",
  "description": "", 
  "internalNotes": "",
  "userId": "critter@engelfinedesign.com",
  "vendor": "Critter Engel",
  "createdAt": "2025-10-24T23:50:33.222Z",
  "updatedAt": "2025-10-24T23:50:33.222Z",
  
  // Status fields
  "status": "draft",                    // Needs approval workflow
  "isPublic": false,
  "featured": false,
  "images": [],
  "tags": [],
  
  // Gemstone-specific data moved to nested object
  "gemstone": {
    "species": "Garnet",
    "subspecies": "Rhodolite",
    "carat": 5,
    "dimensions": {
      "length": 5,
      "width": 5, 
      "height": 5
    },
    "cut": ["Round"],
    "cutStyle": ["Brilliant"],
    "treatment": ["untreated"],
    "color": ["purple"],
    "locale": "Madagascar", 
    "naturalSynthetic": "natural",
    "retailPrice": 5,
    "acquisitionPrice": null,
    "acquisitionDate": null,
    "supplier": "",
    "clarity": "",
    "certification": {
      "lab": "",
      "number": "", 
      "url": "",
      "verified": false
    },
    "obj3DFile": {
      "url": "",
      "filename": "",
      "fileSize": 0,
      "uploadedAt": null,
      "downloadCount": 0
    },
    "designCoverage": {
      "hasBasicBasket": false,
      "hasBasicRing": false, 
      "customDesignCount": 0,
      "lastDesignAdded": null,
      "priorityLevel": "critical"
    }
  },
  
  // Available designs (empty initially)
  "availableDesigns": [],
  
  // Related products
  "relatedProducts": []
}
```

## 🚀 **Benefits of New Architecture**

### **✅ Scalability**
- Easy to add new product types
- Type-specific fields clearly separated
- Relationships cleanly defined

### **✅ Flexibility** 
- Gemstone can have multiple designs
- Jewelry can reference multiple gemstones
- Clear hierarchy of relationships

### **✅ Query Efficiency**
```javascript
// Find all gemstones needing designs
db.products.find({
  "productType": "gemstone",
  "gemstone.designCoverage.hasBasicRing": false
})

// Find all CAD designs for specific gemstone
db.products.find({
  "productType": "cad-design", 
  "cadDesign.targetGemstoneId": "68fc10c9fb1524b3fa70b0aa"
})

// Find all jewelry using specific design
db.products.find({
  "productType": "jewelry",
  "jewelry.basedOnDesignId": "67890abcdef"
})
```

### **✅ Maintainability**
- Clear separation of concerns
- Easy to update type-specific logic
- Relationships explicitly defined

**Should we proceed with migrating to this improved schema?**