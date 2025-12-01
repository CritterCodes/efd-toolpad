/**
 * USAGE GUIDE: GLB & OBJ Viewers for EFD Admin
 * 
 * Both viewers are ready to integrate into artisan dashboard
 */

// ============================================
// 1. GLB VIEWER - For CAD Design Previews
// ============================================

import GLBViewer from '@/components/viewers/GLBViewer';

// In your CAD request details component:
<GLBViewer 
  fileUrl="https://efd-repair-images.s3.us-east-2.amazonaws.com/designs/cad-requests/cad_1763264886773_4odnkq/design-691970a4cba7b98e584e2baf-glb-1763274916742-rhodolite-11.7-setting.glb"
  title="CAD Design: Rhodolite Ring Setting"
  style={{ height: '600px' }}
/>

// ============================================
// 2. OBJ VIEWER - For Gemstone Models
// ============================================

import OBJViewer from '@/components/viewers/OBJViewer';

// In your gemstone product page:
<OBJViewer 
  fileUrl="https://efd-repair-images.s3.us-east-2.amazonaws.com/gemstones/gem_12345.obj"
  mtlUrl="https://efd-repair-images.s3.us-east-2.amazonaws.com/gemstones/gem_12345.mtl"
  title="Heliodor Gemstone - 5 Carat"
  gemstoneColor={0xE6B840} // Optional: override with specific color
  style={{ height: '500px' }}
/>

// ============================================
// 3. FEATURES
// ============================================

// GLB VIEWER:
// ✓ Interactive mouse controls (drag to rotate, scroll to zoom)
// ✓ Auto-scaling and centering
// ✓ Professional lighting setup
// ✓ Grid reference helper
// ✓ Loading state with progress
// ✓ Error handling with user-friendly messages
// ✓ Responsive container sizing
// ✓ Touch and scroll wheel support

// OBJ VIEWER:
// ✓ All GLB features PLUS:
// ✓ MTL material file support
// ✓ Custom gemstone color override
// ✓ Enhanced lighting for gemstone sparkle
// ✓ Professional material properties (Phong shading)
// ✓ Specular highlights for realistic gems

// ============================================
// 4. INTEGRATION INTO ARTISAN DASHBOARD PAGES
// ============================================

// /dashboard/artisan/products/gemstones
// - Display OBJ file in gemstone product form
// - Update preview when uploading new OBJ

// /dashboard/artisan/requests/cad-requests
// - Display GLB files from designs array
// - Show multiple design iterations side-by-side

// ============================================
// 5. DATA STRUCTURE (from your example)
// ============================================

// For CAD Designs (use GLBViewer):
{
  "designs": [
    {
      "files": {
        "glb": {
          "url": "https://...", // Pass this to GLBViewer
          "originalName": "rhodolite-11.7-setting.glb",
          "size": 1019676
        }
      }
    }
  ]
}

// For Gemstone Products (use OBJViewer):
{
  "gemstone": {
    "obj3DFile": {
      "url": "https://...", // Pass this to OBJViewer
      "filename": "heliodor.obj"
    }
  }
}

// ============================================
// 6. ERROR HANDLING
// ============================================

// Both viewers handle:
// ✓ Invalid file URLs
// ✓ Network errors
// ✓ Corrupted model files
// ✓ CORS issues
// ✓ Missing MTL files (OBJ Viewer)

// Display user-friendly error messages instead of crashes

// ============================================
// 7. PERFORMANCE CONSIDERATIONS
// ============================================

// File Size Recommendations:
// - GLB files: < 10MB (ideally < 5MB)
// - OBJ files: < 8MB
// - MTL files: < 1MB

// Both viewers are GPU-accelerated with:
// - WebGL rendering
// - Automatic LOD (level of detail)
// - Efficient memory management
// - Cleanup on unmount

// ============================================
// 8. BROWSER COMPATIBILITY
// ============================================

// Requires WebGL support (modern browsers):
// ✓ Chrome 60+
// ✓ Firefox 55+
// ✓ Safari 12+
// ✓ Edge 79+

// Not supported on IE11

// ============================================
// 9. NEXT STEPS
// ============================================

// 1. Import viewers into gemstone/CAD components
// 2. Add to /dashboard/artisan/products page
// 3. Add to /dashboard/artisan/requests/[id] page
// 4. Test with your S3 URLs
// 5. Add error boundary for production safety
