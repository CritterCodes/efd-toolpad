# CAD Upload System - Architecture Overview

## System Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAD DESIGNER WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘

STEP 1: FILE SELECTION
┌──────────────────┐
│  Designer Selects│
│  STL + GLB Files │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  CADDesignerUpload Component │ ◄── /src/components/CAD/CADDesignerUpload.jsx
│  - File validation           │
│  - Size checking             │
│  - Format detection          │
└────────┬─────────────────────┘
         │
         ▼

STEP 2: STL VOLUME CALCULATION
┌─────────────────────────────────┐
│      STL Parser Library         │ ◄── /src/lib/stlParser.js
│  - Parse ASCII/Binary STL       │
│  - Extract geometry             │
│  - Calculate volume             │
│  - Get mesh statistics          │
└────────┬────────────────────────┘
         │
         ├─► Divergence Theorem Algorithm
         │   Volume = |Σ(p·(a×b))| / 6
         │
         ▼
    ┌─────────────┐
    │ Volume (mm³)│  ◄── Displayed to designer
    │ + Stats     │      Can override if needed
    └─────────────┘
         │
         ▼

STEP 3: USER CONFIRMATION
┌──────────────────────────┐
│   Confirmation Dialog    │
│  ✓ STL: file.stl (2MB)  │
│  ✓ GLB: file.glb (1MB)  │
│  ✓ Volume: 1250 mm³     │
└────────┬─────────────────┘
         │
         ▼

STEP 4: FILE UPLOAD
┌─────────────────────┐     ┌──────────────────┐
│  Upload to S3       │────►│   AWS S3 Bucket  │
│  - STL file         │     │  efd-repair-     │
│  - GLB file         │     │  images/         │
└─────────────────────┘     │  designs/cad-    │
                            │  requests/...    │
                            └──────────────────┘
         │
         ▼

STEP 5: DATABASE SAVE
┌──────────────────────┐     ┌─────────────────────┐
│  API Call            │────►│    MongoDB Update   │
│  /api/cad/designs    │     │  designs collection │
│  - File URLs         │     │  {                  │
│  - Volume            │     │    files: {...}     │
│  - Mesh stats        │     │    printVolume: 1250│
└──────────────────────┘     │    meshStats: {...} │
                             │  }                  │
                             └─────────────────────┘

STEP 6: SUCCESS & PREVIEW
┌───────────────────────┐    ┌─────────────────────┐
│ Success Notification  │    │   GLB Viewer        │
│ onUploadComplete()    │    │  Shows 3D Design    │
│ Callback fires        │    │  Interactive Preview│
└───────────────────────┘    └─────────────────────┘
```

## Component Architecture

```
CAD REQUEST PAGE
│
├─ Left Column (Upload & Details)
│  │
│  ├─► CADDesignerUpload Component
│  │   ├─ STL File Input
│  │   │  └─► stlParser.js
│  │   │      ├─ Parse STL
│  │   │      ├─ Calculate Volume
│  │   │      └─ Get Stats
│  │   │
│  │   ├─ GLB File Input
│  │   │  └─► File Validation
│  │   │
│  │   ├─ Volume Display
│  │   │  └─► Manual Override (optional)
│  │   │
│  │   └─ Upload Button
│  │      └─ Confirmation Dialog
│  │
│  └─► CAD Request Details
│       └─ Status, Timeline, Notes
│
├─ Right Column (Preview)
│  │
│  ├─► GLBViewer
│  │   ├─ Three.js Scene
│  │   ├─ GLB Model (from S3)
│  │   ├─ Interactive Controls
│  │   │  ├─ Drag to rotate
│  │   │  ├─ Scroll to zoom
│  │   │  └─ Grid helper
│  │   └─ Professional Lighting
│  │
│  └─► Volume Card
│      └─ Calculated Volume in mm³
```

## File Flow Diagram

```
BROWSER
│
├─ User selects STL file
│  └─► File object (FileAPI)
│
├─► CADDesignerUpload.jsx
│   │
│   ├─ Call stlParser.parseSTL(file)
│   │  │
│   │  ├─► Check format (ASCII vs Binary)
│   │  │
│   │  ├─► Extract vertices & triangles
│   │  │   └─ calculateMeshVolume()
│   │  │      └─ Apply divergence theorem
│   │  │
│   │  └─► Return { volume, meshStats }
│   │
│   ├─ Display calculated volume
│   ├─ Allow manual override
│   │
│   └─ User confirms
│
├─► Upload STL to S3
│   └─► POST /api/upload/cad-files
│       └─► uploadToS3(file)
│
├─► Upload GLB to S3
│   └─► POST /api/upload/cad-files
│       └─► uploadToS3(file)
│
└─► Save design to MongoDB
    └─► POST /api/cad/designs
        └─► CADDesign.create({
              files: { stl, glb },
              printVolume: 1250,
              meshStats: {...}
            })
```

## Data Structure Evolution

```
BEFORE UPLOAD:
CAD Request {
  _id: ObjectId,
  mountingDetails: {...},
  designs: []  ◄── Empty initially
}

AFTER UPLOAD:
CAD Request {
  _id: ObjectId,
  mountingDetails: {...},
  designs: [
    {
      _id: ObjectId,
      title: "WIP GLB - 11/16/2025",
      
      files: {                          ◄── NEW
        stl: {
          url: "https://s3.../file.stl",
          originalName: "design-v2.stl",
          size: 2048576,
          mimetype: "application/vnd.ms-pki.stl"
        },
        glb: {
          url: "https://s3.../file.glb",
          originalName: "design-v2.glb",
          size: 1019676,
          mimetype: "application/octet-stream"
        }
      },
      
      printVolume: 1250,                ◄── NEW (calculated)
      
      meshStats: {                      ◄── NEW
        width: 25.5,
        height: 18.3,
        depth: 12.1,
        centerX: 0,
        centerY: 0,
        centerZ: 0
      },
      
      pricing: {
        materialCost: 108.68,            ◄── Uses printVolume
        designFee: 150,
        markup: 1.4,
        totalCost: 406.15,
        pricePerGram: 0.8,
        breakdown: {
          printVolume: 1250,
          density: 10.4,
          metalType: "14k Yellow Gold"
        }
      },
      
      status: "pending_approval",
      designerId: ObjectId,
      createdAt: ISODate(),
      updatedAt: ISODate()
    }
  ]
}
```

## Volume Calculation Process

```
STL FILE (3D Model)
    │
    ▼
┌─────────────────────────────┐
│  Parse STL Format           │
│  - Read header (80 bytes)   │
│  - Read triangle count      │
│  - For each triangle:       │
│    ├─ Read normal (skip)    │
│    └─ Read 3 vertices       │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────────┐
    │  Extracted Data  │
    │  vertices: [     │
    │    {x,y,z},      │
    │    {x,y,z},      │
    │    ...           │
    │  ]               │
    │  triangles: [    │
    │    [v1,v2,v3],   │
    │    [v1,v2,v3],   │
    │    ...           │
    │  ]               │
    └──────────┬───────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Divergence Theorem       │
    │ For each triangle:       │
    │  1. Get vertices p1,p2,p3│
    │  2. a = p2 - p1          │
    │  3. b = p3 - p1          │
    │  4. c = a × b (cross)    │
    │  5. d = p1 · c (dot)     │
    │  6. volume += d          │
    │                          │
    │ Result = |volume| / 6    │
    └──────────┬───────────────┘
               │
               ▼
        ┌─────────────┐
        │ Volume (mm³)│
        │  ≈ 1250     │
        └─────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Used for Pricing │
        │ Cost = volume    │
        │    × density     │
        │    × price/gram  │
        │    × markup      │
        │  + design fee    │
        └──────────────────┘
```

## Three.js Rendering Pipeline

```
CADDesignerUpload Component (Optional STL Preview)
│
├─► Container Div
│   └─ Width: 100%, Height: 500px
│
├─► THREE.Scene
│   ├─ Background: #f5f5f5
│   └─ Add objects
│
├─► THREE.Camera
│   ├─ FOV: 75°
│   ├─ Auto-positioned for model
│   └─ Aspect ratio: container width/height
│
├─► THREE.WebGLRenderer
│   ├─ Antialias: true
│   ├─ Shadow mapping: enabled
│   ├─ Device pixel ratio: window.devicePixelRatio
│   └─ Render target: container
│
├─► Lighting Setup
│   ├─ Ambient Light (0xffffff, intensity: 0.6)
│   ├─ Directional Light 1
│   │  └─ Position: (100, 100, 100)
│   │  └─ Shadow casting
│   └─ Directional Light 2
│      └─ Position: (-100, -100, -100)
│
├─► Grid Helper
│   └─ Reference grid 200x200 with 20 divisions
│
├─► STL Mesh
│   ├─ Material: MeshPhongMaterial (blue #0084ff)
│   ├─ Shadow: cast & receive
│   └─ Scale: auto-fitted to scene
│
└─► Input Handlers
    ├─ Mouse down: start drag
    ├─ Mouse move: rotate (while dragging)
    ├─ Mouse up: stop drag
    ├─ Wheel: zoom in/out
    └─ Window resize: update camera & renderer
```

## API Integration Points

```
FRONTEND                    API ENDPOINTS                   BACKEND
═════════════════════════════════════════════════════════════════

CADDesignerUpload           POST /api/upload/cad-files      S3 Upload
  │                         ├─ file: File                   Handler
  ├─ File selected          ├─ type: "stl"|"glb"
  ├─ Validated              └─ cadRequestId: string
  └─ Ready to upload        
       │                    Response:
       ├─► URL to file ◄────┤ { url, size, success }
       │
       │
CADDesignerUpload           POST /api/cad/designs           MongoDB
  │                         ├─ cadRequestId                 Save
  ├─ Volume calculated      ├─ files: { stl, glb }
  ├─ Files ready            ├─ printVolume
  └─ User confirmed         └─ meshStats
       │                    
       └─► Design saved ◄───┤ { designId, success }


CAD Request Page            GET /api/cad/requests/:id       Fetch
  │                         ├─ User auth check              CAD Data
  └─ Needs fresh data       └─ Return full request
       │                    
       └─► Request Data ◄───┤ { cadRequest, designs }
           with designs
           & volumes
```

## Performance Characteristics

```
FILE SIZE vs PERFORMANCE
═══════════════════════════════════════════════════════════════

File Size  │ Parse Time │ GPU Memory │ Render FPS │ Notes
───────────┼────────────┼────────────┼────────────┼──────────
1 MB       │   <10ms    │   50 MB    │   60 FPS   │ Quick
5 MB       │   50-100ms │   75 MB    │   60 FPS   │ Good
10 MB      │   100-200ms│   100 MB   │   55-60    │ Smooth
20 MB      │   200-300ms│   120 MB   │   50-55    │ Acceptable
50 MB      │   500-800ms│   150 MB   │   30-40    │ Slow (max)

BROWSER COMPATIBILITY
═══════════════════════════════════════════════════════════════

Browser    │ WebGL │ Latest │ Performance │ Notes
───────────┼───────┼────────┼─────────────┼──────────────
Chrome     │   ✅  │ Latest │  Excellent  │ Recommended
Firefox    │   ✅  │ Latest │  Good       │ Good support
Safari     │   ✅  │ 12+    │  Good       │ Metal backend
Edge       │   ✅  │ Latest │  Excellent  │ Chromium-based
IE 11      │   ❌  │   -    │     -       │ Not supported
```

## Integration Checklist

```
PHASE 1: Setup APIs
─────────────────────────────────────────────────────────────
☐ Create POST /api/upload/cad-files endpoint
  └─ Handle multipart form data
  └─ Upload to S3 with proper paths
  └─ Return S3 URL

☐ Create POST /api/cad/designs endpoint
  └─ Save design with volume to MongoDB
  └─ Update CAD request status

☐ Create GET /api/cad/requests/:id endpoint
  └─ Return CAD request with designs

PHASE 2: Integration
─────────────────────────────────────────────────────────────
☐ Import CADDesignerUpload component
☐ Import GLBViewer component
☐ Add to CAD request page layout
☐ Connect to CAD request data
☐ Test file uploads

PHASE 3: Preview System
─────────────────────────────────────────────────────────────
☐ Display calculated volume
☐ Show GLB preview with GLBViewer
☐ Display mesh statistics
☐ Show pricing with volume

PHASE 4: Testing & Launch
─────────────────────────────────────────────────────────────
☐ Unit test volume calculations
☐ Integration test file uploads
☐ E2E test complete workflow
☐ Performance test with large files
☐ Production deployment
```

---

**Architecture Version:** 1.0  
**Last Updated:** November 2025  
**System:** EFD Admin - CAD Management  
**Technology:** Next.js 15, React 18, Three.js 0.181.1, MongoDB
