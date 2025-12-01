# 🎯 EFD Product Schema & Workflow Planning

## 📋 Overview

This document outlines the complete product schema for the Engel Fine Design ecosystem, covering gemstones, jewelry, CAD designs, and their interconnected workflows.

## 🔗 Product Relationships & Workflows

### Core Product Types

```
1. GEMSTONES (Raw Materials)
   ↓
2. CAD DESIGNS (Digital Blueprints) 
   ↓  
3. JEWELRY (Finished Products)
```

## 💎 Gemstone System - Complete Workflow

### 🎯 Navigation Structure & User Experience

### 📂 Main Navigation Categories

#### 1. **Products** (User's Own Work)
- **My Gemstones** - Gemstones the user has added
- **My Designs** - CAD designs the user has created  
- **My Jewelry** - Finished pieces the user has made
- **My Services** - Services the user offers (engraving, setting, etc.)

#### 2. **Work Opportunities** (Available Jobs/Requests)
Different views based on artisan type:

**For CAD Designers:**
- **Gemstones Needing Designs** - Stones without basic settings
- **Custom Design Requests** - Customer-requested custom designs
- **Priority Gemstones** - High-value stones needing immediate attention

**For Setters/Jewelers:**
- **Designs Ready for Manufacturing** - Approved CAD designs needing production
- **Setting Services Needed** - Stones needing to be set in existing pieces
- **Finishing Work** - Pieces needing polish, engraving, etc.

**For Engravers:**
- **Engraving Requests** - Pieces needing engraving work
- **Custom Text/Designs** - Specific engraving jobs

**For Gem Cutters:**
- **Rough Stone Requests** - Customers wanting specific cuts
- **Re-cutting Jobs** - Existing stones needing modification

#### 3. **Marketplace** (Browse All Available)
- **Available Gemstones** - All approved stones (for purchase/inspiration)
- **Design Library** - Public CAD designs
- **Finished Jewelry** - Completed pieces for sale

## 💎 Gemstone Work Pipeline Status

### 🚨 Priority System for CAD Designers

#### **Critical Need** (Red Priority)
```
Gemstones with ZERO designs:
- No basic basket setting
- No basic ring setting  
- High-value stones sitting idle
```

#### **Standard Need** (Yellow Priority)  
```
Gemstones with basic designs only:
- Has basket + ring setting
- Could benefit from luxury/custom options
- Medium-value stones
```

#### **Enhancement Opportunities** (Green Priority)
```
Gemstones with multiple designs:
- Well-covered with basic options
- Room for unique/artistic interpretations  
- Designer creative freedom projects
```

### 📊 Gemstone Status Dashboard for Designers

When CAD designers view "Work Opportunities → Gemstones Needing Designs":

```javascript
// Example display format
{
  gemstone: {
    title: "2.5ct Ceylon Sapphire",
    value: "$3,500",
    dimensions: "8.2 x 6.1 x 4.5mm",
    cut: "Oval",
    images: ["main.jpg"],
    priority: "CRITICAL" // Based on design coverage
  },
  
  designCoverage: {
    hasBasicBasket: false,     // ❌ Missing
    hasBasicRing: false,       // ❌ Missing  
    hasCustomOptions: false,   // ❌ Missing
    totalDesigns: 0,           // Current count
    estimatedEarnings: "$150-400" // Potential designer fees
  },
  
  designNeeds: [
    { type: "Basic Basket Setting", priority: "CRITICAL", fee: "$150" },
    { type: "Basic Ring Setting", priority: "CRITICAL", fee: "$200" },
    { type: "Luxury Setting", priority: "OPTIONAL", fee: "$300-400" }
  ]
}
```

## �️ Work Request System

### Service Request Types

#### **Design Requests**
```javascript
{
  requestType: 'custom-design',
  clientRequest: "Art Deco inspired engagement ring for 2ct emerald",
  targetGemstone: ObjectId,
  budget: "$500-800",
  timeline: "2 weeks",
  complexity: "high",
  requiredSkills: ["CAD design", "Art Deco styling"],
  status: "open", // open/assigned/in-progress/completed
  postedBy: "customer_service_user_id",
  assignedTo: null, // Designer who picks it up
  applications: [{ designerId, proposedFee, timeline, portfolio }]
}
```

#### **Manufacturing Services**
```javascript
{
  requestType: 'engraving',
  serviceNeeded: "Custom text engraving on wedding band",
  item: {
    type: "wedding band",
    material: "18k gold",
    engravingText: "Forever & Always - 10.24.25",
    font: "script",
    location: "inside band"
  },
  deadline: "2024-11-15",
  budget: "$75-100",
  requiredSkills: ["hand engraving", "script fonts"],
  status: "open",
  postedBy: "jeweler_user_id",
  urgency: "standard" // rush/standard/flexible
}
```

#### **Setting Services**
```javascript
{
  requestType: 'stone-setting',
  stones: [
    { gemstoneId: ObjectId, role: "center" },
    { description: "20x 0.02ct diamonds", role: "accent" }
  ],
  setting: {
    cadDesignId: ObjectId,
    metal: "14k white gold",
    size: "6.5",
    specialInstructions: "Extra care - family heirloom stone"
  },
  complexity: "moderate",
  estimatedHours: 4,
  deadline: "2024-11-20",
  budget: "$200-300",
  requiredSkills: ["prong setting", "pave setting"],
  status: "open"
}
```

## 🎯 Updated Gemstone Schema for Work Pipeline

### Additional Fields Needed
```javascript
{
  // DESIGN COVERAGE TRACKING
  designCoverage: {
    hasBasicBasket: Boolean,          // Critical requirement met
    hasBasicRing: Boolean,            // Critical requirement met  
    customDesignCount: Number,        // Number of luxury/custom options
    lastDesignAdded: Date,            // Track activity
    needsAttention: Boolean           // Auto-calculated priority flag
  },
  
  // WORK OPPORTUNITY STATUS
  workStatus: {
    isAvailableForDesign: Boolean,    // Shows in CAD designer board
    priorityLevel: String,            // critical/standard/enhancement
    estimatedDesignFees: {
      basic: Number,                  // Fee for basic settings
      custom: Number                  // Fee range for custom work
    },
    designDeadline: Date              // If there's urgency
  },
  
  // MARKETPLACE VISIBILITY
  marketplaceStatus: {
    isPubliclyVisible: Boolean,       // Shows in shop
    isInWorkflow: Boolean,            // Currently being worked on
    reservedForWork: {
      type: String,                   // design/setting/custom
      artisanId: String,
      reservedUntil: Date
    }
  }
}
```

## 🔄 Work Assignment Workflow

### CAD Designer Picks Up Gemstone Work
```
1. Designer browses "Gemstones Needing Designs"
2. Filters by priority, value, style preference
3. Downloads .obj file for specific gemstone
4. Reserves gemstone for design work (24-48 hour hold)
5. Uploads completed design (STL + GLB + volume)
6. Submits for admin approval
7. If approved → Available as purchase option
8. Designer earns fee when design is purchased
```

### Service Request Assignment
```
1. Artisan posts service need (engraving, setting, etc.)
2. Request appears in relevant "Work Opportunities" section
3. Qualified artisans can apply/bid on work
4. Original poster selects artisan
5. Work is assigned and tracked
6. Completion confirmed and payment processed
```

## 🎨 Navigation Implementation

### Dropdown Structure
```
Products ▼
├── My Gemstones
├── My Designs  
├── My Jewelry
└── My Services

Work Opportunities ▼  
├── [Role-Specific Views]
├── CAD Designers:
│   ├── Gemstones Needing Designs
│   ├── Custom Design Requests
│   └── Priority Projects
├── Setters/Jewelers:
│   ├── Setting Services Needed
│   ├── Finishing Work
│   └── Manufacturing Queue
├── Engravers:
│   ├── Engraving Requests
│   └── Custom Text Work
└── All Service Requests

Marketplace ▼
├── Browse Gemstones
├── Design Library
└── Finished Jewelry
```

### Role-Based Navigation
- **Navigation adapts** based on user's artisan type(s)
- **Multi-role users** see combined opportunities
- **Work counters** show available opportunities (badges)
- **Priority indicators** highlight urgent/high-value work

### Current Fields (What we've built)
```javascript
{
  productType: 'gemstone',
  title: String,
  species: String,                    // Garnet, Sapphire, etc.
  subspecies: String,                 // Almandine, Padparadscha, etc.
  carat: Number,
  dimensions: {
    length: Number,
    width: Number, 
    height: Number
  },
  cut: [String],                      // Round, Princess, Oval, etc.
  cutStyle: [String],                 // Brilliant, Fantasy, Portuguese, etc.
  treatment: [String],                // Heat Treated, Natural, etc.
  color: [String],                    // Red, Blue, etc.
  locale: String,                     // Myanmar, Sri Lanka, etc.
  naturalSynthetic: String,           // natural/synthetic
  price: Number,                      // Loose gemstone price
  customMounting: Boolean,
  userId: String,                     // Gem cutter who added it
  vendor: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Additional Fields Needed
```javascript
{
  // APPROVAL WORKFLOW
  approvalStatus: String,             // pending/approved/rejected
  adminApprovedBy: String,            // Admin user ID who approved
  adminApprovedAt: Date,
  adminNotes: String,                 // Admin feedback/notes
  rejectionReason: String,            // If rejected, why?
  
  // 3D FILES FOR CAD DESIGNERS
  obj3DFile: {
    url: String,                      // S3 URL to .obj file
    filename: String,                 // Original filename
    fileSize: Number,                 // File size in bytes
    uploadedAt: Date,
    downloadCount: Number             // Track how many times downloaded
  },
  
  // CUSTOMER-FACING DATA
  publicDescription: String,          // Marketing description for shop
  images: [{
    url: String,
    type: String,                     // main/detail/certificate/lifestyle
    order: Number,
    altText: String                   // Accessibility
  }],
  
  // GEMSTONE CHARACTERISTICS
  clarity: String,                    // FL, IF, VVS1, VVS2, etc.
  certification: {
    lab: String,                      // GIA, AGL, SSEF, etc.
    number: String,                   // Certificate number
    url: String,                      // Link to certificate
    verified: Boolean
  },
  
  // INVENTORY & STATUS
  status: String,                     // available/reserved/sold
  reservedFor: ObjectId,              // Reference to order reserving this
  reservedUntil: Date,                // Reservation expiry
  
  // BUSINESS DATA
  acquisitionDate: Date,
  acquisitionPrice: Number,           // What we paid
  supplier: String,
  featured: Boolean,                  // Featured on homepage
  tags: [String],                     // rare, investment, vintage, etc.
  
  // CAD DESIGNS FOR THIS GEMSTONE
  availableSettings: [{
    settingId: ObjectId,              // Reference to CAD design
    approvalStatus: String,           // pending/approved/rejected
    adminApprovedBy: String,          // Admin who approved this combo
    adminApprovedAt: Date,
    pricing: {
      designFee: Number,              // CAD designer fee
      materialCost: Number,           // Metal cost based on volume
      laborCost: Number,              // Manufacturing cost
      totalAdditionalCost: Number     // Total cost to add this setting
    }
  }]
}
```

## 🎨 CAD Design System for Gemstones

### 🎯 CAD Designer Workflow
```
1. CAD Designer browses approved gemstones in admin system
2. Downloads .obj file for specific gemstone
3. Designs custom setting using gemstone dimensions
4. Uploads STL + GLB files with volume calculation
5. Submits design for admin approval
6. Admin approves → Design appears as purchase option
```

### CAD Design Schema (for gemstone settings)
```javascript
{
  productType: 'cad-design',
  
  // GEMSTONE ASSOCIATION  
  targetGemstoneId: ObjectId,         // Specific gemstone this is designed for
  isGemstoneSpecific: Boolean,        // true = for one stone, false = generic
  
  // DESIGN INFO
  title: String,                      // "Vintage Solitaire for 2.5ct Sapphire"
  description: String,                // Designer's description
  style: [String],                    // vintage/modern/art-deco/minimalist
  settingType: String,                // ring/pendant/earrings/brooch
  
  // METAL & MATERIAL
  metalType: [String],                // gold/silver/platinum options
  metalKarat: [String],               // 14k/18k/sterling options
  metalColor: [String],               // yellow/white/rose options
  
  // 3D FILES & TECHNICAL DATA
  files: {
    stl: {
      url: String,                    // Manufacturing file
      filename: String,
      fileSize: Number
    },
    glb: {
      url: String,                    // Web preview file  
      filename: String,
      fileSize: Number
    }
  },
  
  // VOLUME & COSTING
  designVolume: Number,               // Volume in cubic millimeters
  materialWeight: {                   // Estimated weights by metal type
    gold14k: Number,                  // grams
    gold18k: Number,                  // grams  
    silver: Number,                   // grams
    platinum: Number                  // grams
  },
  
  // DESIGNER INFO
  designerUserId: String,             // CAD designer who created it
  designerFee: Number,                // Fee for using this design
  designerRoyalty: Number,            // Percentage if applicable
  
  // APPROVAL WORKFLOW
  approvalStatus: String,             // pending/approved/rejected
  adminApprovedBy: String,            // Admin user ID
  adminApprovedAt: Date,
  adminNotes: String,
  rejectionReason: String,
  
  // TECHNICAL SPECS
  complexity: String,                 // simple/moderate/complex
  manufacturingNotes: String,         // Special instructions
  settingDifficulty: String,          // easy/moderate/expert
  estimatedProductionTime: Number,    // Hours
  
  // BUSINESS
  isActive: Boolean,                  // Available for purchase
  timesOrdered: Number,               // Usage tracking
  
  // METADATA
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### 🏪 EFD Shop Integration

When customer views a gemstone, they see:

#### Gemstone Details
- All gemstone specifications (species, cut, carat, etc.)
- Professional photos
- Certificate information
- **Base Price**: $X,XXX (loose stone)

#### Available Settings
For each approved CAD design:
```javascript
{
  settingPreview: {
    title: "Vintage Solitaire Setting",
    style: ["vintage", "elegant"],
    previewImage: "glb_render_url",
    designer: "Jane Smith CAD"
  },
  
  metalOptions: [{
    type: "14k Gold",
    color: "Yellow",
    estimatedWeight: "3.2g",
    materialCost: "$340",
    designFee: "$150", 
    laborCost: "$200",
    totalPrice: "$690"  // Additional cost beyond gemstone
  }],
  
  totalOptions: [{
    description: "2.5ct Sapphire + Vintage Setting in 14k Yellow Gold",
    gemstonePrice: "$3,500",
    settingPrice: "$690", 
    totalPrice: "$4,190"
  }]
}
```

## 🔄 Admin Approval Workflow

### Gemstone Approval Process
1. **Gem Cutter submits gemstone** → Status: `pending`
2. **Admin reviews**:
   - Verify photos are professional quality
   - Check specifications are accurate  
   - Ensure pricing is appropriate
   - Review description for shop
3. **Admin approves** → Status: `approved` (shows in shop)
4. **Admin rejects** → Status: `rejected` (with reason)

### CAD Design Approval Process  
1. **Designer submits setting** → Status: `pending`
2. **Admin reviews**:
   - Verify files are high quality
   - Check volume calculation is reasonable
   - Ensure design is manufacturable
   - Review pricing structure
3. **Admin approves** → Available as purchase option
4. **Admin rejects** → Designer gets feedback

## 🛠️ Technical Requirements

### File Upload System
- **Gemstone .obj files**: For CAD designers to download
- **Setting STL files**: For manufacturing  
- **Setting GLB files**: For web 3D preview
- **Image uploads**: Multiple angles, certificates

### Volume Calculation
- CAD Designer provides volume in cubic millimeters
- System calculates material weight: `volume * metal_density`
- Pricing: `weight * current_metal_price + labor + overhead`

### API Endpoints Needed
```
/api/products/gemstones                 (✅ exists)
/api/products/gemstones/[id]/approve    (🔥 needed)
/api/products/gemstones/[id]/reject     (🔥 needed)
/api/cad-designs                        (🔥 needed)
/api/cad-designs/[id]/approve           (🔥 needed)
/api/files/upload                       (🔥 needed)
/api/files/download/[gemstone-id].obj   (🔥 needed)
```

## 💍 Product Type 3: Jewelry

### Purpose
- Finished jewelry pieces
- May incorporate gemstones and/or CAD designs
- Final products for sale to customers

### Schema
```javascript
{
  productType: 'jewelry',
  
  // Basic Info
  title: String,                      // "Custom Sapphire Engagement Ring"
  description: String,
  category: String,                   // ring/pendant/earrings/bracelet/necklace
  subcategory: String,                // engagement/wedding/fashion/tennis
  
  // Design Source
  basedOnDesign: ObjectId,            // CAD design used (if any)
  customDesign: Boolean,              // One-off custom piece
  
  // Materials
  metalType: String,                  // gold/silver/platinum
  metalKarat: String,                 // 14k/18k/sterling/950
  metalWeight: Number,                // Actual weight in grams
  metalColor: String,                 // yellow/white/rose/rhodium
  
  // Gemstones Used
  centerStone: {
    gemstoneId: ObjectId,             // Reference to gemstone
    setting: String,                  // prong/bezel/pave/channel
    isOriginalStone: Boolean          // True if customer's stone
  },
  
  accentStones: [{
    gemstoneId: ObjectId,             // Can be null for generic stones
    quantity: Number,
    setting: String,
    totalCarat: Number,               // If using generic small stones
    description: String               // "20 round diamonds 0.02ct each"
  }],
  
  // Dimensions
  dimensions: {
    size: String,                     // Ring size, chain length, etc.
    width: Number,                    // Band width, etc.
    height: Number,                   // Profile height
    custom: String                    // Any custom measurements
  },
  
  // Production
  productionStatus: String,           // designed/in-production/completed/shipped
  estimatedCompletion: Date,
  actualCompletion: Date,
  craftspersonUserId: String,         // Who's making it
  
  // Quality & Certification
  qualityGrade: String,               // A/B/C or Custom scale
  qualityNotes: String,
  appraisal: {
    value: Number,
    appraiser: String,
    date: Date,
    certificateUrl: String
  },
  
  // Images & Media
  images: [{
    url: String,
    type: String,                     // progress/final/detail/lifestyle
    stage: String,                    // wax/cast/pre-polish/final
    order: Number
  }],
  
  // Business
  pricing: {
    materialCost: Number,             // Metal + stones
    laborCost: Number,                // Design + manufacturing time
    overhead: Number,                 // Business overhead allocation
    markup: Number,                   // Profit margin
    finalPrice: Number,               // What customer pays
    discounts: [{
      type: String,                   // wholesale/loyalty/bulk
      amount: Number,
      reason: String
    }]
  },
  
  // Customer & Order
  customerId: ObjectId,               // Who ordered it
  orderId: ObjectId,                  // Reference to order
  isCustomOrder: Boolean,             // Made to order vs inventory
  
  // Inventory
  inStock: Boolean,
  location: String,                   // showcase/vault/shipped
  
  // Metadata
  tags: [String],                     // vintage/bridal/mens/luxury
  featured: Boolean,
  publiclyVisible: Boolean,           // Show on website
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 Workflow Scenarios

### Scenario 1: Gemstone → CAD Design → Jewelry
```
1. Gem Cutter creates GEMSTONE record
   - Beautiful 2.5ct sapphire
   - Status: "available"

2. CAD Designer creates CAD DESIGN
   - Vintage-inspired setting
   - Designed for 2-3ct oval stones
   - centerStone.specificGemstone = sapphire._id

3. Jeweler creates JEWELRY record
   - basedOnDesign = cad_design._id
   - centerStone.gemstoneId = sapphire._id
   - Update sapphire.status = "in-setting"
   - Update sapphire.currentSetting = jewelry._id
```

### Scenario 2: Generic CAD Design → Multiple Jewelry Pieces
```
1. CAD Designer creates reusable DESIGN
   - Classic solitaire setting
   - Fits 1-3ct round stones
   - publiclyAvailable = true

2. Multiple Jewelers use the design:
   - Jewelry A: 1.5ct diamond
   - Jewelry B: 2.2ct sapphire  
   - Jewelry C: 1.8ct ruby
   - All reference the same basedOnDesign
```

### Scenario 3: Standalone Jewelry (No CAD Design)
```
1. Jeweler creates JEWELRY directly
   - Hand-forged artisan piece
   - customDesign = true
   - basedOnDesign = null
   - Incorporates customer's family gemstone
```

### Scenario 4: Inventory Gemstones
```
1. Gem dealer adds bulk GEMSTONES
   - 50 small diamonds for accent stones
   - Status: "available"
   - Used in multiple jewelry pieces

2. When used in jewelry:
   - Don't link specific gemstone IDs
   - Use accentStones.description instead
   - Keep status: "available" (inventory items)
```

## 📊 Database Relationships

### One-to-Many Relationships
```
User (Designer) → Many CAD Designs
User (Craftsperson) → Many Jewelry Pieces
CAD Design → Many Jewelry Pieces (reusable)
```

### One-to-One Relationships
```
Gemstone ↔ Jewelry Center Stone (unique pieces)
Order ↔ Jewelry (custom orders)
```

### Many-to-Many Relationships
```
Gemstones ↔ Jewelry (accent stones, multi-stone pieces)
CAD Designs ↔ Gemstones (compatible stones)
```

## 🎯 Product Status Workflows

### Gemstone Status Flow
```
acquired → available → reserved → in-setting → completed → sold
                    ↓
                   sold (standalone)
```

### CAD Design Status Flow
```
draft → review → approved → active → deprecated
```

### Jewelry Status Flow
```
designed → in-production → quality-check → completed → shipped
```

## 🛠️ Technical Implementation Notes

### Database Collections
```
products (unified collection with productType discriminator)
orders
users
suggestions (for autocomplete)
```

### Indexes Needed
```javascript
// Products collection
{ productType: 1, status: 1 }
{ productType: 1, userId: 1 }
{ productType: 1, featured: 1 }
{ "centerStone.gemstoneId": 1 }
{ basedOnDesign: 1 }
```

### API Endpoints Structure
```
/api/products/gemstones     (what we have)
/api/products/cad-designs   (next to build)
/api/products/jewelry       (next to build)
/api/products/search        (unified search)
```

## 🚀 Implementation Priority

### Phase 1: ✅ Gemstone Foundation (Current)
- [x] Sophisticated gemstone form with geological accuracy
- [x] Species/subspecies taxonomy with dependencies
- [x] Cut vs Cut Style separation for technical precision
- [x] Basic CRUD API endpoints

### Phase 2: 🔥 Gemstone Approval & Files (Next Priority)
- [ ] **Admin approval workflow** for gemstones
- [ ] **File upload system** for .obj files
- [ ] **Professional image gallery** for gemstones
- [ ] **Public/admin view separation** in gemstone system
- [ ] **Approval status management** in admin interface

### Phase 3: � CAD Designer Integration
- [ ] **CAD Designer portal** for browsing approved gemstones
- [ ] **File download system** for .obj files with tracking
- [ ] **Setting design submission** form (STL + GLB upload)
- [ ] **Volume calculation** integration with pricing
- [ ] **Designer approval workflow** for settings

### Phase 4: 🏪 EFD Shop Integration  
- [ ] **Public gemstone catalog** (approved only)
- [ ] **Gemstone detail pages** with setting options
- [ ] **3D preview system** for settings (GLB viewer)
- [ ] **Dynamic pricing calculator** (stone + setting + metal)
- [ ] **Shopping cart integration** with configuration options

### Phase 5: 🔄 Advanced Features
- [ ] **Reservation system** for gemstones during design/order
- [ ] **Designer royalty tracking** and payments
- [ ] **Advanced search/filtering** for gemstones and settings
- [ ] **Analytics dashboard** for approvals, sales, designer performance
- [ ] **Automated pricing updates** based on metal market prices

## 🚀 Implementation Priority (Updated)

### Phase 1: ✅ Personal Products Foundation (Current)
- [x] **"My Gemstones"** sophisticated form with geological accuracy
- [x] Species/subspecies taxonomy with dependencies
- [x] Cut vs Cut Style separation for technical precision
- [x] Basic CRUD API endpoints for personal inventory

### Phase 2: 🔥 Work Opportunities System (Next Priority)
- [ ] **Gemstone approval workflow** (admin approves → available for design work)
- [ ] **"Gemstones Needing Designs"** view for CAD designers
- [ ] **Design coverage tracking** (hasBasicBasket, hasBasicRing flags)
- [ ] **Priority system** (critical/standard/enhancement) based on coverage
- [ ] **Basic work reservation** system (24-48 hour holds)

### Phase 3: 🎨 CAD Designer Workflow
- [ ] **File upload/download system** for .obj files with tracking
- [ ] **Setting design submission** form (STL + GLB upload)
- [ ] **Volume calculation** integration with pricing
- [ ] **Designer approval workflow** for settings
- [ ] **Design coverage automation** (auto-update hasBasicBasket flags)

### Phase 4: 🛠️ Service Request System
- [ ] **Service request posting** (engraving, setting, custom design)
- [ ] **Artisan application/bidding** system
- [ ] **Work assignment and tracking** workflow
- [ ] **Multi-role navigation** adaptation
- [ ] **Payment/fee tracking** for completed work

### Phase 5: 🏪 Public Marketplace Integration  
- [ ] **EFD Shop integration** (approved gemstones + settings)
- [ ] **3D preview system** for settings (GLB viewer)
- [ ] **Dynamic pricing calculator** (stone + setting + metal)
- [ ] **Shopping cart configuration** options

## 🎯 Immediate Development Focus

Based on the artisan workflow system, our next steps should be:

1. **Expand gemstone schema** with design coverage tracking
2. **Build "Work Opportunities" navigation** structure  
3. **Create "Gemstones Needing Designs"** view for CAD designers
4. **Implement priority system** based on design coverage
5. **Add basic work reservation** functionality

This transforms the current "personal inventory" system into a collaborative artisan marketplace while building on our existing gemstone foundation.

## 🤔 Implementation Questions

1. **Navigation Terminology**: What should we call "Work Opportunities"? 
   - Options: "Available Work", "Open Projects", "Commissions", "Opportunities"

2. **Work Reservation**: How long should gemstone design reservations last?
   - 24 hours? 48 hours? Until design submission?

3. **Priority Calculation**: Should priority be automatic or admin-set?
   - Auto: Based on value + design coverage + time since added
   - Manual: Admin sets priority levels

4. **Designer Payments**: How should design fees be structured?
   - Fixed fees per design type?
   - Percentage of final sale?
   - Designer sets their own rates?

5. **Multi-Role Users**: How do we handle artisans with multiple skills?
   - Show all relevant work opportunities?
   - Let them set active/inactive roles?

The foundation we've built positions us perfectly to become the central hub for artisan collaboration in the jewelry industry!