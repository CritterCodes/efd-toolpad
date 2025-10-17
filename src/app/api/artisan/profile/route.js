/**
 * Artisan Profile API Endpoint
 * Handles profile retrieval and updates for artisans including file uploads
 * Migrated from efd-shop with enhanced functionality for efd-admin
 */

import { NextResponse } from 'next/server';
import { UnifiedUserService } from '@/lib/unifiedUserService';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/../auth';

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

        // TODO: Handle file uploads to S3/storage service
        // For now, we'll just update the text data
        let imageUrls = {};
        
        if (profileImage && profileImage instanceof File) {
            // TODO: Upload to S3 and get URL
            console.log('Profile image upload needed:', profileImage.name);
            // imageUrls.profileImageUrl = await uploadToS3(profileImage);
        }
        
        if (coverImage && coverImage instanceof File) {
            // TODO: Upload to S3 and get URL
            console.log('Cover image upload needed:', coverImage.name);
            // imageUrls.coverImageUrl = await uploadToS3(coverImage);
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