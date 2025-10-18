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
        const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });

        if (!user || !user.roles?.includes('artisan')) {
            return NextResponse.json({ error: 'Access denied. Artisan role required.' }, { status: 403 });
        }

        // Get gallery items for this artisan
        const galleryItems = await db.collection('gallery')
            .find({ artisanId: new ObjectId(session.user.id) })
            .sort({ createdAt: -1 })
            .toArray();

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
        const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });

        if (!user || !user.roles?.includes('artisan')) {
            return NextResponse.json({ error: 'Access denied. Artisan role required.' }, { status: 403 });
        }

        const formData = await request.formData();
        const imageFile = formData.get('image');
        const title = formData.get('title');
        const description = formData.get('description');
        const category = formData.get('category');
        const tagsString = formData.get('tags');

        if (!imageFile) {
            return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
        }

        // Validate file type
        if (!imageFile.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Validate file size (10MB limit)
        if (imageFile.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
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

        // Parse tags
        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        // Create gallery item
        const galleryItem = {
            artisanId: new ObjectId(session.user.id),
            imageUrl,
            title: title || '',
            description: description || '',
            category: category || '',
            tags,
            fileSize: imageFile.size,
            mimeType: imageFile.type,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('gallery').insertOne(galleryItem);

        if (!result.insertedId) {
            return NextResponse.json({ error: 'Failed to save gallery item' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                _id: result.insertedId,
                ...galleryItem
            }
        });

    } catch (error) {
        console.error('Error uploading gallery image:', error);
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}