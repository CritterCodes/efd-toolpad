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

    // Instead of syncing to external shop, create vendor profile data locally
    // This will be used to populate the vendor profile tab in the admin
    const localVendorProfile = {
      type: 'jeweler', // Default type, can be customized in profile
      bio: '',
      shortDescription: `Skilled artisan specializing in fine jewelry craftsmanship`,
      experience: '',
      specialties: [],
      services: [],
      skills: [],
      createdAt: new Date(),
      isActive: true
    };

    // Generate vendor slug from business name
    const vendorSlug = generateSlug(artisanData.business || `${artisanData.firstName}-${artisanData.lastName}`);
    
    // Generate a local vendor profile ID
    const vendorProfileId = `vendor-${Date.now()}`;

    // Update the artisan user with vendor profile reference
    const updatedUser = await UserService.updateUser(userId, {
      vendorProfile: localVendorProfile,
      vendorProfileId: vendorProfileId,
      vendorSlug: vendorSlug,
      hasVendorProfile: true,
      updatedAt: new Date()
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user with vendor profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor profile created successfully',
      data: {
        vendorProfileId: vendorProfileId,
        vendorSlug: vendorSlug,
        user: updatedUser
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