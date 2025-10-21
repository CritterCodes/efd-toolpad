/**
 * Gallery API Route
 * Handles CRUD operations for artisan gallery images
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectToDatabase } from '@/lib/mongodb';
import { uploadFileToS3 } from '@/utils/s3.util';
import { ObjectId } from 'mongodb';

export async function GET(request) {
    try {
        const session = await auth();
        
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        
        // Find user by userID (not ObjectId)
        const user = await db.collection('users').findOne({ userID: session.user.userID });

        console.log('Gallery GET access check:', {
            sessionEmail: session.user.email,
            sessionUserID: session.user.userID,
            userFound: !!user,
            userRole: user?.role,
            sessionUserRole: session.user.role
        });

        // Allow artisan, admin, and dev roles access to gallery management
        const allowedRoles = ['artisan', 'admin', 'dev'];
        if (!user || !allowedRoles.includes(user.role)) {
            return NextResponse.json({ 
                error: 'Access denied. Artisan role required.',
                debug: {
                    userRole: user?.role,
                    sessionRole: session.user.role,
                    allowedRoles: allowedRoles,
                    sessionEmail: session.user.email
                }
            }, { status: 403 });
        }

        // Get gallery items from user object
        const galleryItems = user.gallery || [];

        return NextResponse.json({
            success: true,
            data: galleryItems
        });

    } catch (error) {
        console.error('Error fetching gallery items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch gallery items' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        
        // Find user by userID (not ObjectId)
        const user = await db.collection('users').findOne({ userID: session.user.userID });

        console.log('Gallery POST access check:', {
            sessionEmail: session.user.email,
            sessionUserID: session.user.userID,
            userFound: !!user,
            userRole: user?.role,
            sessionUserRole: session.user.role
        });

        // Allow artisan, admin, and dev roles access to gallery management
        const allowedRoles = ['artisan', 'admin', 'dev'];
        if (!user || !allowedRoles.includes(user.role)) {
            return NextResponse.json({ 
                error: 'Access denied. Artisan role required.',
                debug: {
                    userRole: user?.role,
                    sessionRole: session.user.role,
                    allowedRoles: allowedRoles,
                    sessionEmail: session.user.email
                }
            }, { status: 403 });
        }

        const formData = await request.formData();
        const imageFile = formData.get('image');
        const tagsString = formData.get('tags');

        if (!imageFile) {
            return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
        }

        // Validate file type
        if (!imageFile.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Validate file size (4MB limit for Vercel platform)
        // Note: Vercel has a ~4.5MB request body limit on serverless functions
        if (imageFile.size > 4 * 1024 * 1024) {
            return NextResponse.json({ 
                error: 'File size must be less than 4MB due to platform limitations. Please compress your image or use a smaller file.',
                actualSize: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`,
                maxSize: '4MB'
            }, { status: 400 });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = imageFile.name.split('.').pop();
        const artisanSlug = user.artisanApplication?.slug || user._id;

        // Upload to S3 using the existing utility
        const imageUrl = await uploadFileToS3(imageFile, `shop/artisan-profiles/${artisanSlug}/gallery`, 'gallery-');

        if (!imageUrl) {
            return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
        }

        // Parse tags from JSON array
        let tags = [];
        try {
            tags = tagsString ? JSON.parse(tagsString) : [];
        } catch (error) {
            // Fallback for old format (comma-separated string)
            tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        }

        // Create gallery item with userID and tags only
        const galleryItem = {
            id: Date.now().toString(), // Simple ID for array item
            imageUrl: imageUrl,
            tags: tags,
            uploadedAt: new Date(),
            uploadedBy: session.user.email
        };

        // Add to user's gallery array
        const result = await db.collection('users').updateOne(
            { userID: session.user.userID },
            { 
                $push: { gallery: galleryItem },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to save gallery item' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: galleryItem
        });

    } catch (error) {
        console.error('Error uploading gallery image:', error);
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}