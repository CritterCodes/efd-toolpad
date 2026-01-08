/**
 * Gallery Tags API Route
 * Fetches all existing tags from the gallery collection for autocomplete/suggestions
 */

import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        
        // Find user by userID
        const user = await db.collection('users').findOne({ userID: session.user.userID });

        // Allow artisan, admin, and dev roles access
        const allowedRoles = ['artisan', 'admin', 'dev'];
        if (!user || !allowedRoles.includes(user.role)) {
            return NextResponse.json({ 
                error: 'Access denied. Artisan role required.' 
            }, { status: 403 });
        }

        // Aggregate all unique tags from gallery items
        const tagsAggregation = await db.collection('gallery').aggregate([
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $project: { tag: '$_id', count: 1, _id: 0 } }
        ]).toArray();

        const tags = tagsAggregation.map(item => ({
            tag: item.tag,
            count: item.count
        }));

        return NextResponse.json({
            success: true,
            data: tags
        });

    } catch (error) {
        console.error('Gallery tags error:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch tags',
            details: error.message 
        }, { status: 500 });
    }
}