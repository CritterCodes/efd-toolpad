/**
 * Gallery Item API Route
 * Handles update and delete operations for individual gallery items
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });

        if (!user || !user.roles?.includes('artisan')) {
            return NextResponse.json({ error: 'Access denied. Artisan role required.' }, { status: 403 });
        }

        const itemId = params.id;
        if (!ObjectId.isValid(itemId)) {
            return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
        }

        // Check if gallery item exists and belongs to this artisan
        const existingItem = await db.collection('gallery').findOne({
            _id: new ObjectId(itemId),
            artisanId: new ObjectId(session.user.id)
        });

        if (!existingItem) {
            return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
        }

        const updateData = await request.json();
        const { title, description, category, tags } = updateData;

        // Prepare update object
        const updateFields = {
            updatedAt: new Date()
        };

        if (title !== undefined) updateFields.title = title;
        if (description !== undefined) updateFields.description = description;
        if (category !== undefined) updateFields.category = category;
        if (tags !== undefined) updateFields.tags = Array.isArray(tags) ? tags : [];

        // Update the gallery item
        const result = await db.collection('gallery').updateOne(
            { _id: new ObjectId(itemId) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
        }

        // Fetch updated item
        const updatedItem = await db.collection('gallery').findOne({ _id: new ObjectId(itemId) });

        return NextResponse.json({
            success: true,
            data: updatedItem
        });

    } catch (error) {
        console.error('Error updating gallery item:', error);
        return NextResponse.json(
            { error: 'Failed to update gallery item' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });

        if (!user || !user.roles?.includes('artisan')) {
            return NextResponse.json({ error: 'Access denied. Artisan role required.' }, { status: 403 });
        }

        const itemId = params.id;
        if (!ObjectId.isValid(itemId)) {
            return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
        }

        // Check if gallery item exists and belongs to this artisan
        const existingItem = await db.collection('gallery').findOne({
            _id: new ObjectId(itemId),
            artisanId: new ObjectId(session.user.id)
        });

        if (!existingItem) {
            return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
        }

        // Delete from database
        const deleteResult = await db.collection('gallery').deleteOne({
            _id: new ObjectId(itemId)
        });

        if (deleteResult.deletedCount === 0) {
            return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
        }

        // Note: S3 file cleanup would happen here in a production environment
        // For now, we'll just remove the database record

        return NextResponse.json({
            success: true,
            message: 'Gallery item deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting gallery item:', error);
        return NextResponse.json(
            { error: 'Failed to delete gallery item' },
            { status: 500 }
        );
    }
}

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });

        if (!user || !user.roles?.includes('artisan')) {
            return NextResponse.json({ error: 'Access denied. Artisan role required.' }, { status: 403 });
        }

        const itemId = params.id;
        if (!ObjectId.isValid(itemId)) {
            return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
        }

        // Get gallery item
        const galleryItem = await db.collection('gallery').findOne({
            _id: new ObjectId(itemId),
            artisanId: new ObjectId(session.user.id)
        });

        if (!galleryItem) {
            return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: galleryItem
        });

    } catch (error) {
        console.error('Error fetching gallery item:', error);
        return NextResponse.json(
            { error: 'Failed to fetch gallery item' },
            { status: 500 }
        );
    }
}