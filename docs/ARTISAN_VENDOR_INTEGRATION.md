# Artisan-Vendor Integration Guide

## Overview

This document explains how Artisan users in EFD Admin are connected to Vendor profiles in EFD Shop, and how they link to Shopify products.

## Architecture

```
EFD Admin (Artisan Users) → EFD Shop (Vendor Profiles) → Shopify (Products)
```

### Data Flow

1. **Artisan User Creation** (EFD Admin)
   - User with role "artisan" is created
   - Business name is stored in `user.business` field
   - This business name becomes the link to vendor profile

2. **Vendor Profile Sync** (EFD Admin → EFD Shop)
   - Admin can sync artisan to vendor profile
   - `user.business` = `vendor.vendorName`
   - Vendor profile created in EFD Shop vendors collection

3. **Shopify Product Linking** (EFD Shop → Shopify)
   - `vendor.vendorName` = Shopify product `vendor` field
   - Products automatically linked by vendor name match

## Database Schema

### EFD Admin - User Object (Artisan)
```javascript
{
  _id: ObjectId,
  userID: String,
  firstName: String,
  lastName: String,
  email: String,
  role: "artisan",
  business: String,           // Links to vendor.vendorName
  vendorProfileId: ObjectId,  // Reference to vendor profile
  vendorSlug: String,         // URL slug for vendor page
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### EFD Shop - Vendor Profile Object
```javascript
{
  _id: ObjectId,
  vendorName: String,         // Must match user.business AND Shopify vendor
  displayName: String,        // User-friendly display name
  type: String,              // jeweler, designer, lapidarist, etc.
  slug: String,              // URL-friendly version
  bio: String,               // Detailed biography
  shortDescription: String,   // Brief tagline
  specialties: [String],     // Array of specializations
  services: [String],        // Array of services offered
  location: {
    city: String,
    state: String,
    country: String
  },
  contact: {
    email: String,
    phone: String,
    website: String,
    instagram: String
  },
  featured: Boolean,
  active: Boolean,
  adminUserId: ObjectId,     // Reference back to admin user
  createdAt: Date,
  updatedAt: Date
}
```

### Shopify Product
```javascript
{
  vendor: String,            // Must match vendor.vendorName
  // ... other Shopify fields
}
```

## API Endpoints

### EFD Admin

#### Sync Artisan to Vendor Profile
```
POST /api/artisans/sync-vendor
```

**Request Body:**
```json
{
  "userId": "ObjectId",
  "artisanData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "business": "Doe Jewelry Works",
    // ... other user fields
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor profile created successfully",
  "data": {
    "vendorProfile": { /* vendor object */ },
    "userId": "ObjectId"
  }
}
```

### EFD Shop

#### Create Vendor Profile
```
POST /api/vendors
```

#### Get All Vendors
```
GET /api/vendors
```

#### Get Vendor by Slug
```
GET /api/vendors/[slug]
```

## Components

### EFD Admin - ArtisanManagement Component

**Location:** `/src/app/components/users/ArtisanManagement.js`

**Features:**
- List all artisan users
- Show vendor profile sync status
- One-click vendor profile creation
- Direct links to shop vendor pages
- Search and filter artisans
- Statistics dashboard

**Key Functions:**
- `syncToVendorProfile()` - Creates vendor profile from artisan data
- `getVendorProfile()` - Checks if artisan has vendor profile
- `fetchData()` - Loads artisans and vendor profiles

### EFD Shop - VendorDirectory Component

**Location:** `/app/vendors/VendorDirectory.js`

**Features:**
- Public directory of all vendors
- Search and filter by type/location
- Vendor profile pages
- Links to vendor products

## Setup Instructions

### 1. Environment Configuration

Add to EFD Admin `.env.local`:
```bash
NEXT_PUBLIC_SHOP_URL=http://localhost:3001
```

### 2. Artisan User Management

1. Navigate to `/dashboard/users/artisans` in EFD Admin
2. View all artisan users with vendor sync status
3. For artisans without vendor profiles, click "Create Profile"
4. For existing profiles, click "Re-sync" to update

### 3. Vendor Profile Management

1. Vendor profiles are created automatically from artisan data
2. Edit profiles in EFD Shop at `/admin/vendors` (if exists)
3. Profiles appear on public directory at `/vendors`

### 4. Shopify Product Linking

1. When creating products in Shopify, set the "Vendor" field
2. Use the exact same value as `vendor.vendorName`
3. Products will automatically link to vendor profiles

## Usage Examples

### Creating an Artisan with Vendor Profile

1. Create artisan user in EFD Admin:
   ```javascript
   {
     firstName: "Jane",
     lastName: "Smith", 
     email: "jane@smithjewelry.com",
     role: "artisan",
     business: "Smith Custom Jewelry"
   }
   ```

2. Sync to vendor profile (creates in EFD Shop):
   ```javascript
   {
     vendorName: "Smith Custom Jewelry",
     displayName: "Jane Smith",
     type: "jeweler",
     slug: "smith-custom-jewelry"
   }
   ```

3. Create Shopify product:
   ```javascript
   {
     title: "Custom Diamond Ring",
     vendor: "Smith Custom Jewelry",  // Links to vendor profile
     // ... other product data
   }
   ```

### Viewing on Frontend

- Vendor directory: `https://efd-shop.com/vendors`
- Specific vendor: `https://efd-shop.com/vendors/smith-custom-jewelry`
- Vendor products: Filtered automatically by vendor name

## Best Practices

1. **Consistent Business Names**
   - Use identical names across admin users, vendor profiles, and Shopify
   - Avoid special characters that affect URLs

2. **Regular Syncing**
   - Re-sync vendor profiles when artisan data changes
   - Monitor sync status in artisan management

3. **Profile Completeness**
   - Encourage artisans to complete vendor profiles
   - Add bios, specialties, and contact information

4. **SEO Optimization**
   - Use descriptive vendor slugs
   - Complete all profile fields for better search

## Troubleshooting

### Vendor Profile Not Syncing
- Check network connection between admin and shop
- Verify NEXT_PUBLIC_SHOP_URL is correct
- Ensure business name is set on artisan user

### Products Not Linking
- Verify Shopify vendor field matches vendorName exactly
- Check for extra spaces or character differences
- Case sensitivity matters

### Vendor Page Not Found
- Check vendor slug generation
- Verify vendor is marked as active
- Ensure profile was created successfully