# Enhanced Gemstone Schema for E-commerce Integration

## 📊 Updated Gemstone Document Structure

This document outlines the enhanced schema for gemstone products to support CAD requests, embedded designs, and e-commerce integration.

## 🏗️ Core Gemstone Schema

```javascript
{
  _id: ObjectId,
  productId: "gem_unique_identifier", // e.g., "gem_mi0vjq5n_s3n7as"
  productType: "gemstone",
  title: "Gemstone Title",
  description: "Detailed description",
  category: "Gemstones",
  subcategory: "Precious Stones",
  
  // Core gemstone data
  gemstone: {
    species: "Beryl",
    subspecies: "Emerald", 
    carat: 2.5,
    cut: ["Emerald Cut"],
    color: "Vivid Green",
    clarity: "VS1",
    dimensions: {
      length: 8.2,
      width: 6.1,
      depth: 4.8
    },
    origin: "Colombia",
    treatment: "None",
    certification: {
      lab: "GIA",
      number: "123456789",
      date: "2024-01-15"
    }
  },

  // Pricing and availability
  pricing: {
    basePrice: 5000.00,
    currency: "USD",
    pricePerCarat: 2000.00,
    wholesale: {
      price: 3500.00,
      minimumQuantity: 1
    }
  },

  // E-commerce fields
  status: "active", // active, sold, reserved, draft
  isEcommerceReady: true,
  inventory: {
    quantity: 1,
    reserved: 0,
    available: 1
  },
  
  // SEO and metadata
  seo: {
    title: "2.5ct Emerald Cut Colombian Emerald",
    description: "Stunning 2.5 carat emerald cut Colombian emerald...",
    keywords: ["emerald", "colombian", "emerald cut", "precious stone"]
  },

  // Images and media
  images: [
    {
      url: "/uploads/gemstones/gem_123_main.jpg",
      alt: "Main view of Colombian emerald",
      isPrimary: true,
      order: 1
    },
    {
      url: "/uploads/gemstones/gem_123_side.jpg", 
      alt: "Side view of Colombian emerald",
      isPrimary: false,
      order: 2
    }
  ],

  // 🆕 CAD REQUESTS - Embedded in gemstone
  cadRequests: [
    {
      _id: ObjectId,
      requesterId: "user_id",
      requesterEmail: "customer@example.com",
      requesterName: "John Doe",
      
      // Request details
      mountingType: "Engagement Ring", // Ring, Pendant, Earrings, etc.
      metalType: "14k White Gold",
      ringSize: "7", // if applicable
      styleDescription: "Classic solitaire with cathedral setting",
      specialRequests: "Milgrain detail on band",
      timeline: "2-3 weeks",
      priority: "medium", // high, medium, low
      
      // Workflow
      status: "pending", // pending, assigned, in_progress, design_submitted, approved, rejected
      assignedDesigner: "designer_user_id",
      assignedAt: ISODate,
      designId: ObjectId, // Links to design when created
      
      // Metadata
      createdAt: ISODate,
      updatedAt: ISODate,
      designerNotes: "Special considerations for this design"
    }
  ],

  // 🆕 DESIGNS - Embedded in gemstone for multiple design options
  designs: [
    {
      _id: ObjectId,
      title: "Classic Solitaire Setting",
      description: "Elegant cathedral solitaire setting with milgrain details",
      
      // Designer info
      designerId: "designer_user_id",
      designerName: "Jane Designer",
      designerEmail: "jane@example.com",
      
      // Design files
      files: {
        stl: {
          originalName: "solitaire_setting.stl",
          path: "/uploads/designs/design_123.stl",
          size: 2048576,
          mimetype: "application/octet-stream"
        },
        glb: {
          originalName: "solitaire_preview.glb", 
          path: "/uploads/designs/design_123.glb",
          size: 1024768,
          mimetype: "model/gltf-binary"
        }
      },

      // Manufacturing data
      printVolume: 2.8, // cm³
      estimatedTime: 3.5, // hours
      
      // Pricing calculation
      pricing: {
        printVolume: 2.8,
        metalWeight: 37.52, // grams (volume * density)
        metalCost: 2439.00, // metalWeight * pricePerGram
        laborCost: 150.00,
        baseCost: 2589.00,
        retailPrice: 6472.50, // baseCost * markup
        currency: "USD"
      },

      // Metal options for this design
      metalOptions: [
        {
          metal: "14k White Gold",
          isDefault: true,
          pricing: { /* calculated pricing for this metal */ }
        },
        {
          metal: "18k Yellow Gold", 
          isDefault: false,
          pricing: { /* calculated pricing for this metal */ }
        }
        // ... other metal options
      ],

      // Workflow
      status: "pending_approval", // pending_approval, approved, rejected, in_production
      approvedBy: "admin_user_id",
      approvedAt: ISODate,
      
      // E-commerce integration
      isShopable: true, // Can be sold as standalone design
      standaloneProductId: "design_123_product", // Reference to standalone design product
      
      // Metadata  
      createdAt: ISODate,
      updatedAt: ISODate,
      notes: "Customer requested milgrain detail on band",
      tags: ["solitaire", "cathedral", "milgrain", "engagement"]
    }
  ],

  // E-commerce display options
  displayOptions: {
    showWithDesigns: true, // Show design options on product page
    allowCustomRequests: true, // Allow new CAD requests
    featuredDesign: ObjectId, // Featured design to highlight
    designCategoryTags: ["engagement-rings", "solitaire", "cathedral"]
  },

  // User and ownership
  userId: "artisan_user_id", // Gemstone owner/seller
  createdAt: ISODate,
  updatedAt: ISODate
}
```

## 🛍️ Standalone Design Product Schema

When a design is created, it also becomes a standalone product:

```javascript
{
  _id: ObjectId,
  productId: "design_unique_identifier", // e.g., "design_abc123_product"
  productType: "design",
  title: "Classic Solitaire Setting",
  description: "Elegant cathedral solitaire setting designed for 2.5ct emerald",
  category: "Custom Designs",
  subcategory: "Engagement Rings",
  
  // Link back to source gemstone
  designData: {
    _id: ObjectId, // Design ID from gemstone.designs array
    forGemstone: {
      productId: "gem_mi0vjq5n_s3n7as",
      title: "2.5ct Colombian Emerald",
      species: "Beryl",
      subspecies: "Emerald",
      carat: 2.5
    },
    // ... full design data from gemstone.designs
  },

  // Design-specific pricing
  pricing: {
    basePrice: 6472.50, // From design calculation
    currency: "USD",
    includesGemstone: false, // This is setting only
    metalOptions: [ /* array of metal pricing options */ ]
  },

  // E-commerce fields
  status: "active",
  isEcommerceReady: true,
  inventory: {
    quantity: 999, // Made-to-order
    type: "made_to_order"
  },

  // SEO optimized for design searches
  seo: {
    title: "Classic Solitaire Engagement Ring Setting - Custom Design",
    description: "Elegant cathedral solitaire setting with milgrain details...",
    keywords: ["solitaire", "engagement ring", "custom setting", "cathedral"]
  },

  tags: ["custom-design", "cad-design", "engagement-ring", "solitaire"],
  
  userId: "designer_user_id",
  createdAt: ISODate,
  updatedAt: ISODate
}
```

## 🔄 E-commerce Integration Flow

### 1. Gemstone Listing
- Gemstone appears in shop as standalone product
- Shows available designs as options
- Allows requesting new custom designs

### 2. Design Options Display
- Each approved design shows as configuration option
- Pricing updates based on metal choice
- 3D preview using GLB files

### 3. Purchasing Flows

#### Flow A: Gemstone + Existing Design
1. Customer selects gemstone
2. Chooses from available designs  
3. Selects metal type
4. Proceeds to checkout
5. Order includes both gemstone and setting

#### Flow B: Gemstone + Custom Design Request
1. Customer selects gemstone
2. Clicks "Request Custom Design"
3. Fills out CAD request form
4. CAD designer creates design
5. Customer approves design
6. Order proceeds with custom setting

#### Flow C: Standalone Design Purchase
1. Customer finds design in "Custom Designs" category
2. Selects metal type and options
3. Optionally adds compatible gemstone
4. Proceeds to checkout

## 🔍 Search and Discovery

### Gemstone Searches
- Filter by species, carat, cut, color, clarity
- Filter by "has designs available"
- Filter by price range
- Sort by carat, price, date added

### Design Searches  
- Filter by mounting type (ring, pendant, earrings)
- Filter by style (solitaire, halo, vintage)
- Filter by metal compatibility
- Filter by gemstone compatibility
- Sort by price, popularity, date created

## 📊 Analytics and Reporting

Track key metrics:
- CAD request conversion rates
- Popular design styles
- Average time from request to completion
- Revenue per design type
- Customer satisfaction scores

## 🔧 Technical Considerations

### File Storage
- STL files: Manufacturing-ready 3D models
- GLB files: Web-optimized 3D previews
- CDN integration for fast loading
- Backup and versioning

### Performance
- Index on productType, status, userId
- Index on gemstone.species, gemstone.carat
- Index on designs.status, designs.designerId
- Cache frequently accessed gemstone+design combinations

### Security
- Validate file uploads (size, type)
- Scan uploaded files for malware
- Watermark preview images
- Protect STL files from unauthorized access