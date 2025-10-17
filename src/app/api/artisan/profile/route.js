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
                artisanType: formData.get('artisanType') || '',
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
            profileData = jsonData;
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

        // Update the user's artisan application data using dot notation to preserve existing fields
        const updateData = {
            'artisanApplication.businessName': profileData.businessName,
            'artisanApplication.artisanType': profileData.artisanType,
            'artisanApplication.about': profileData.about,
            'artisanApplication.experience': profileData.experience,
            'artisanApplication.yearsExperience': profileData.yearsExperience,
            'artisanApplication.businessAddress': profileData.businessAddress,
            'artisanApplication.businessCity': profileData.businessCity,
            'artisanApplication.businessState': profileData.businessState,
            'artisanApplication.businessZip': profileData.businessZip,
            'artisanApplication.businessCountry': profileData.businessCountry,
            'artisanApplication.portfolioWebsite': profileData.portfolioWebsite,
            'artisanApplication.instagramHandle': profileData.instagramHandle,
            'artisanApplication.facebookPage': profileData.facebookPage,
            'artisanApplication.tiktokHandle': profileData.tiktokHandle,
            'artisanApplication.specialties': profileData.specialties,
            'artisanApplication.services': profileData.services,
            'artisanApplication.materials': profileData.materials,
            'artisanApplication.techniques': profileData.techniques,
            'artisanApplication.updatedAt': new Date(),
            updatedAt: new Date()
        };

        // Add image URLs if provided
        if (imageUrls.profileImageUrl) {
            updateData['artisanApplication.profileImageUrl'] = imageUrls.profileImageUrl;
            updateData['artisanApplication.profileImageKey'] = imageUrls.profileImageKey;
        }
        if (imageUrls.coverImageUrl) {
            updateData['artisanApplication.coverImageUrl'] = imageUrls.coverImageUrl;
            updateData['artisanApplication.coverImageKey'] = imageUrls.coverImageKey;
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