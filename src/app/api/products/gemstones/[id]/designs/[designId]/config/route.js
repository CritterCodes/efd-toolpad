import { NextResponse } from 'next/server';
import { db as mongo } from '@/lib/database';
import { auth } from '@/lib/auth';
import { LISTING_STAFF_ROLES } from '@/services/production/jewelryListingAccess';

/**
 * PUT /api/products/gemstones/[id]/designs/[designId]/config
 * Update design metal and mounting options configuration
 */
export async function PUT(request, { params }) {
    try {
        const { id, designId } = await params;
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Staff only. It writes prices onto a legacy `products` document; any signed-in account could
        // (2026-10-01). Nothing in the app calls it; retiring it is the owner's call (OPEN-QUESTIONS).
        if (!LISTING_STAFF_ROLES.has(session.user.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const body = await request.json();
        const { metals, mountingOptions, basePrice, metalPrices } = body;

        const db = await mongo.connect();

        // Find gemstone and update design configuration
        const result = await db.collection('products').findOneAndUpdate(
            { 
                productId: id,
                'designs.id': designId
            },
            {
                $set: {
                    'designs.$[elem].metals': metals || [],
                    'designs.$[elem].mountingOptions': mountingOptions || [],
                    'designs.$[elem].basePrice': basePrice || 0,
                    'designs.$[elem].metalPrices': metalPrices || {},
                    'designs.$[elem].updatedAt': new Date(),
                    updatedAt: new Date(),
                    updatedBy: session.user.userID
                }
            },
            {
                arrayFilters: [{ 'elem.id': designId }],
                returnDocument: 'after'
            }
        );

        if (!result.value) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find the updated design
        const updatedDesign = result.value.designs.find(d => d.id === designId);

        return NextResponse.json({
            success: true,
            message: 'Design configuration updated successfully',
            design: updatedDesign
        });

    } catch (error) {
        console.error('❌ Error updating design configuration:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update design configuration' },
            { status: 500 }
        );
    }
}
