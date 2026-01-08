/**
 * Individual Gallery Item API Route
 * Handles DELETE and PUT operations for specific gallery items
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { connectToDatabase } from '@/lib/mongodb';

export async function DELETE(req, { params }) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id: itemId } = params;

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        // Find user by userID
        const user = await db.collection('users').findOne({ userID: session.user.userID });
        
        if (!user || !user.gallery) {
            return NextResponse.json({ error: 'User not found or no gallery' }, { status: 404 });
        }

        // Find the gallery item to verify ownership
        const galleryItem = user.gallery.find(item => item.id === itemId);

        if (!galleryItem) {
            return NextResponse.json({ error: 'Gallery item not found or access denied' }, { status: 404 });
        }

        // Remove the gallery item from user's gallery array
        const result = await db.collection('users').updateOne(
            { userID: session.user.userID },
            { 
                $pull: { gallery: { id: itemId } },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true,
            message: 'Gallery item deleted successfully'
        });

    } catch (error) {
        console.error('Gallery DELETE error:', error);
        return NextResponse.json({ 
            error: 'Failed to delete gallery item',
            details: error.message 
        }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id: itemId } = params;
        const body = await req.json();
        const { tags } = body;

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        // Find user by userID
        const user = await db.collection('users').findOne({ userID: session.user.userID });
        
        if (!user || !user.gallery) {
            return NextResponse.json({ error: 'User not found or no gallery' }, { status: 404 });
        }

        const galleryItem = user.gallery.find(item => item.id === itemId);

        if (!galleryItem) {
            return NextResponse.json({ error: 'Gallery item not found or access denied' }, { status: 404 });
        }

        // Update the gallery item in user's gallery array
        const result = await db.collection('users').updateOne(
            { 
                userID: session.user.userID,
                'gallery.id': itemId
            },
            { 
                $set: { 
                    'gallery.$.tags': tags,
                    'gallery.$.updatedAt': new Date(),
                    updatedAt: new Date()
                }
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true,
            message: 'Gallery item updated successfully'
        });

    } catch (error) {
        console.error('Gallery PUT error:', error);
        return NextResponse.json({ 
            error: 'Failed to update gallery item',
            details: error.message 
        }, { status: 500 });
    }
}