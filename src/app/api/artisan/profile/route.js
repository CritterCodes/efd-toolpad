/**
 * Artisan Profile API Endpoint
 * Handles profile retrieval and updates for artisans including file uploads
 * Migrated from efd-shop with enhanced functionality for efd-admin
 */

import { NextResponse } from 'next/server';
import { UnifiedUserService } from '@/lib/unifiedUserService';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/../auth';
import { uploadFileToS3 } from '@/utils/s3.util';

export async function GET(request) {
    try {
        // Get the current session
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify user is an artisan
        if (session.user.role !== 'artisan' && session.user.role !== 'artisan-applicant') {
            return NextResponse.json(
                { success: false, error: 'Artisan access required' },
                { status: 403 }
            );
        }

        const { db } = await connectToDatabase();
        const userID = session.user.userID;

        // Get user's artisan application data
        const user = await db.collection('users').findOne({ userID });
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Return the artisan application data
        const profileData = user.artisanApplication || {};

        return NextResponse.json({
            success: true,
            data: profileData
        });

    } catch (error) {
        console.error('Error fetching artisan profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        // Get the current session
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify user is an artisan
        if (session.user.role !== 'artisan' && session.user.role !== 'artisan-applicant') {
            return NextResponse.json(
                { success: false, error: 'Artisan access required' },
                { status: 403 }
            );
        }

        const { db } = await connectToDatabase();
        const userID = session.user.userID;

        // Parse form data
        const contentType = request.headers.get('content-type');
        let profileData = {};
        let profileImage = null;
        let coverImage = null;

        if (contentType && contentType.includes('multipart/form-data')) {
            // Parse form data (for file uploads)
            const formData = await request.formData();
            
            profileData = {
                businessName: formData.get('businessName') || '',
                artisanType: (() => {
                    const typeValue = formData.get('artisanType') || '';
                    if (Array.isArray(typeValue)) return typeValue;
                    return typeValue ? typeValue.split(',').map(t => t.trim()) : [];
                })(),
                about: formData.get('about') || '',
                experience: formData.get('experience') || '',
                yearsExperience: parseInt(formData.get('yearsExperience')) || 0,
                businessAddress: formData.get('businessAddress') || '',
                businessCity: formData.get('businessCity') || '',
                businessState: formData.get('businessState') || '',
                businessZip: formData.get('businessZip') || '',
                businessCountry: formData.get('businessCountry') || '',
                portfolioWebsite: formData.get('portfolioWebsite') || '',
                instagramHandle: formData.get('instagramHandle') || '',
                facebookPage: formData.get('facebookPage') || '',
                tiktokHandle: formData.get('tiktokHandle') || '',
                specialties: formData.get('specialties') || '',
                services: formData.get('services') || '',
                materials: formData.get('materials') || '',
                techniques: formData.get('techniques') || '',
            };
            
            // Handle file uploads
            profileImage = formData.get('profileImage');
            coverImage = formData.get('coverImage');
        } else {
            // Parse JSON data
            const jsonData = await request.json();
            profileData = {
                ...jsonData,
                // Ensure artisanType is always an array
                artisanType: (() => {
                    const typeValue = jsonData.artisanType;
                    if (Array.isArray(typeValue)) return typeValue;
                    return typeValue ? (typeof typeValue === 'string' ? typeValue.split(',').map(t => t.trim()) : [typeValue]) : [];
                })()
            };
        }

        // Handle file uploads to S3
        let imageUrls = {};
        
        if (profileImage && profileImage instanceof File && profileImage.size > 0) {
            try {
                console.log('Uploading profile image:', profileImage.name);
                const profileImageUrl = await uploadFileToS3(
                    profileImage, 
                    `shop/artisan-profiles/${userID}/profile`,
                    ''
                );
                imageUrls.profileImageUrl = profileImageUrl;
                imageUrls.profileImageKey = profileImageUrl.split('.amazonaws.com/')[1]; // Extract key from URL
                console.log('✅ Profile image uploaded:', profileImageUrl);
            } catch (error) {
                console.error('❌ Failed to upload profile image:', error);
                return NextResponse.json(
                    { success: false, error: 'Failed to upload profile image' },
                    { status: 500 }
                );
            }
        }
        
        if (coverImage && coverImage instanceof File && coverImage.size > 0) {
            try {
                console.log('Uploading cover image:', coverImage.name);
                const coverImageUrl = await uploadFileToS3(
                    coverImage, 
                    `shop/artisan-profiles/${userID}/cover`,
                    ''
                );
                imageUrls.coverImageUrl = coverImageUrl;
                imageUrls.coverImageKey = coverImageUrl.split('.amazonaws.com/')[1]; // Extract key from URL
                console.log('✅ Cover image uploaded:', coverImageUrl);
            } catch (error) {
                console.error('❌ Failed to upload cover image:', error);
                return NextResponse.json(
                    { success: false, error: 'Failed to upload cover image' },
                    { status: 500 }
                );
            }
        }

        // Get existing user data to preserve critical fields
        const existingUser = await db.collection('users').findOne({ userID });
        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Update the user's artisan application data using dot notation to preserve existing fields
        // CRITICAL: Only update fields that are being changed, preserve all existing critical fields
        const updateData = {};
        
        // Only update fields that have values (preserve existing data for empty/missing fields)
        if (profileData.businessName !== undefined) updateData['artisanApplication.businessName'] = profileData.businessName;
        if (profileData.artisanType !== undefined) {
            // Ensure artisanType is saved as an array
            const artisanTypeArray = Array.isArray(profileData.artisanType) 
                ? profileData.artisanType 
                : (profileData.artisanType ? profileData.artisanType.split(',').map(t => t.trim()) : []);
            updateData['artisanApplication.artisanType'] = artisanTypeArray;
        }
        if (profileData.about !== undefined) updateData['artisanApplication.about'] = profileData.about;
        if (profileData.experience !== undefined) updateData['artisanApplication.experience'] = profileData.experience;
        if (profileData.yearsExperience !== undefined) updateData['artisanApplication.yearsExperience'] = profileData.yearsExperience;
        if (profileData.businessAddress !== undefined) updateData['artisanApplication.businessAddress'] = profileData.businessAddress;
        if (profileData.businessCity !== undefined) updateData['artisanApplication.businessCity'] = profileData.businessCity;
        if (profileData.businessState !== undefined) updateData['artisanApplication.businessState'] = profileData.businessState;
        if (profileData.businessZip !== undefined) updateData['artisanApplication.businessZip'] = profileData.businessZip;
        if (profileData.businessCountry !== undefined) updateData['artisanApplication.businessCountry'] = profileData.businessCountry;
        if (profileData.portfolioWebsite !== undefined) updateData['artisanApplication.portfolioWebsite'] = profileData.portfolioWebsite;
        if (profileData.instagramHandle !== undefined) updateData['artisanApplication.instagramHandle'] = profileData.instagramHandle;
        if (profileData.facebookPage !== undefined) updateData['artisanApplication.facebookPage'] = profileData.facebookPage;
        if (profileData.tiktokHandle !== undefined) updateData['artisanApplication.tiktokHandle'] = profileData.tiktokHandle;
        if (profileData.specialties !== undefined) updateData['artisanApplication.specialties'] = profileData.specialties;
        if (profileData.services !== undefined) updateData['artisanApplication.services'] = profileData.services;
        if (profileData.materials !== undefined) updateData['artisanApplication.materials'] = profileData.materials;
        if (profileData.techniques !== undefined) updateData['artisanApplication.techniques'] = profileData.techniques;
        
        // Always update timestamp
        updateData['artisanApplication.updatedAt'] = new Date();
        updateData['updatedAt'] = new Date();

        // Add image URLs if provided
        if (imageUrls.profileImageUrl) {
            updateData['artisanApplication.profileImageUrl'] = imageUrls.profileImageUrl;
            updateData['artisanApplication.profileImageKey'] = imageUrls.profileImageKey;
        }
        if (imageUrls.coverImageUrl) {
            updateData['artisanApplication.coverImageUrl'] = imageUrls.coverImageUrl;
            updateData['artisanApplication.coverImageKey'] = imageUrls.coverImageKey;
        }

        // CRITICAL SAFETY CHECK: Ensure essential fields are never lost
        const currentArtisanApp = existingUser.artisanApplication || {};
        
        // Preserve critical fields that must never be lost
        const criticalFields = ['status', 'slug', 'applicationId', 'userID', 'userEmail', 'submittedAt', 'approvedAt', 'reviewedAt'];
        criticalFields.forEach(field => {
            if (currentArtisanApp[field] && !updateData[`artisanApplication.${field}`]) {
                // Field exists in current data but not in update - preserve it
                updateData[`artisanApplication.${field}`] = currentArtisanApp[field];
                console.log(`🛡️ Preserving critical field: ${field} = ${currentArtisanApp[field]}`);
            }
        });

        // Ensure roles array is preserved at user level
        if (existingUser.roles && !updateData.roles) {
            updateData.roles = existingUser.roles;
            console.log(`🛡️ Preserving user roles: ${existingUser.roles}`);
        }

        const result = await db.collection('users').updateOne(
            { userID },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                ...profileData,
                ...imageUrls,
                updatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Error updating artisan profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}