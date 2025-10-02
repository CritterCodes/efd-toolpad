// /api/artisans/sync-vendor/route.js
// API to sync artisan users with vendor profiles in efd-shop

import { NextResponse } from 'next/server';
import UserService from '../../users/service.js';

export async function POST(request) {
  try {
    const { userId, artisanData } = await request.json();

    if (!userId || !artisanData) {
      return NextResponse.json(
        { success: false, error: 'User ID and artisan data are required' },
        { status: 400 }
      );
    }

    // Validate that the user exists and is an artisan
    const user = await UserService.getUserById(userId);
    if (!user || user.role !== 'artisan') {
      return NextResponse.json(
        { success: false, error: 'User not found or not an artisan' },
        { status: 404 }
      );
    }

    // Prepare vendor profile data
    const vendorProfileData = {
      vendorName: artisanData.business, // This must match Shopify vendor field
      displayName: `${artisanData.firstName} ${artisanData.lastName}`,
      type: 'jeweler', // Default type, can be customized
      slug: generateSlug(artisanData.business || `${artisanData.firstName}-${artisanData.lastName}`),
      bio: '', // Will be filled in later
      shortDescription: `Skilled artisan specializing in fine jewelry craftsmanship`,
      experience: '',
      specialties: [],
      services: [],
      skills: [],
      location: {
        city: artisanData.address?.city || '',
        state: artisanData.address?.state || '',
        country: artisanData.address?.country || 'USA'
      },
      contact: {
        email: artisanData.email,
        phone: artisanData.phoneNumber || '',
        website: '',
        instagram: '',
        facebook: ''
      },
      certifications: [],
      awards: [],
      featured: false,
      active: true,
      joinedDate: artisanData.createdAt || new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
      // Link back to admin user
      adminUserId: userId
    };

    // Create or update vendor profile in efd-shop
    const shopApiUrl = process.env.NEXT_PUBLIC_SHOP_URL || 'http://localhost:3001';
    const response = await fetch(`${shopApiUrl}/api/vendors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any authentication headers if needed
      },
      body: JSON.stringify(vendorProfileData)
    });

    const vendorResult = await response.json();

    if (!vendorResult.success) {
      return NextResponse.json(
        { success: false, error: vendorResult.error || 'Failed to create vendor profile' },
        { status: 500 }
      );
    }

    // Fetch the created vendor profile to get complete data
    const vendorGetResponse = await fetch(`${shopApiUrl}/api/vendors?search=${vendorProfileData.vendorName}`);
    const vendorGetData = await vendorGetResponse.json();
    let createdVendor = null;
    
    if (vendorGetData.success && vendorGetData.data.length > 0) {
      createdVendor = vendorGetData.data.find(v => v.vendorName === vendorProfileData.vendorName);
    }

    // Update the artisan user with vendor profile reference
    await UserService.updateUser(userId, {
      vendorProfileId: vendorResult.vendorId,
      vendorSlug: vendorProfileData.slug,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor profile created successfully',
      data: {
        vendorProfile: createdVendor || { _id: vendorResult.vendorId, ...vendorProfileData },
        userId: userId
      }
    });

  } catch (error) {
    console.error('Error syncing vendor profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate URL-friendly slug
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
}