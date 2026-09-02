import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';

const STAFF_ROLES = new Set(['admin', 'superadmin', 'dev', 'staff']);

// Staff, or the owning artisan — the same rule every sibling product route uses.
function canAccessGemstone(session, gemstone) {
    if (STAFF_ROLES.has(session.user.role)) return true;
    const ids = [session.user.userID, session.user.email].filter(Boolean);
    return ids.includes(gemstone.userId) || ids.includes(gemstone.seller?.userId);
}

export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const db = await mongo.connect();
        const { id } = await params;

        // Try to find by productId first, then fallback to _id for backward compatibility
        let gemstone = await db.collection('products').findOne({
            productId: id,
            productType: 'gemstone'
        });

        // If not found by productId, try by MongoDB _id (for backward compatibility)
        if (!gemstone) {
            try {
                // Validate if it's a valid ObjectId before querying
                if (ObjectId.isValid(id)) {
                    gemstone = await db.collection('products').findOne({
                        _id: new ObjectId(id),
                        productType: 'gemstone'
                    });
                    
                    // If found by _id, migrate it to have a productId
                    if (gemstone && !gemstone.productId) {
                        const productId = `gem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
                        await db.collection('products').updateOne(
                            { _id: gemstone._id },
                            { $set: { productId: productId } }
                        );
                        gemstone.productId = productId;
                        console.log(`Migrated gemstone ${gemstone._id} to productId: ${productId}`);
                    }
                }
            } catch (error) {
                console.error('Error trying to find by ObjectId:', error);
            }
        }

        if (!gemstone) {
            return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
        }

        // Check if user has permission to view this gemstone
        if (!canAccessGemstone(session, gemstone)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            gemstone
        });

    } catch (error) {
        console.error(`GET /api/products/gemstones/[id] error:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch gemstone' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const db = await mongo.connect();
        const { id } = await params;
        const data = await request.json();

        // Try to find by productId first, then fallback to _id for backward compatibility
        let existingGemstone = await db.collection('products').findOne({
            productId: id,
            productType: 'gemstone'
        });

        let searchCriteria = { productId: id };

        // If not found by productId, try by MongoDB _id (for backward compatibility)
        if (!existingGemstone) {
            try {
                if (ObjectId.isValid(id)) {
                    existingGemstone = await db.collection('products').findOne({
                        _id: new ObjectId(id),
                        productType: 'gemstone'
                    });
                    searchCriteria = { _id: new ObjectId(id) };
                }
            } catch (error) {
                console.error('Error trying to find by ObjectId:', error);
            }
        }

        if (!existingGemstone) {
            return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
        }

        // Check if user has permission to edit this gemstone
        if (!canAccessGemstone(session, existingGemstone)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Prepare the update data with hierarchical structure
        const updateData = {
            // Update universal fields
            title: data.title || existingGemstone.title,
            description: data.description || existingGemstone.description,
            internalNotes: data.internalNotes || data.notes || existingGemstone.internalNotes,
            vendor: data.vendor || existingGemstone.vendor,
            
            // Update gemstone-specific data
            gemstone: {
                ...existingGemstone.gemstone,
                species: data.species || existingGemstone.gemstone?.species,
                subspecies: data.subspecies || existingGemstone.gemstone?.subspecies,
                carat: data.carat || existingGemstone.gemstone?.carat,
                dimensions: data.dimensions || existingGemstone.gemstone?.dimensions,
                cut: data.cut || existingGemstone.gemstone?.cut,
                cutStyle: data.cutStyle || existingGemstone.gemstone?.cutStyle,
                treatment: data.treatment || existingGemstone.gemstone?.treatment,
                color: data.color || existingGemstone.gemstone?.color,
                clarity: data.clarity || existingGemstone.gemstone?.clarity,
                locale: data.locale || existingGemstone.gemstone?.locale,
                naturalSynthetic: data.naturalSynthetic || existingGemstone.gemstone?.naturalSynthetic,
                retailPrice: data.price || data.retailPrice || existingGemstone.gemstone?.retailPrice,
                acquisitionPrice: data.acquisitionPrice || existingGemstone.gemstone?.acquisitionPrice,
                supplier: data.supplier || existingGemstone.gemstone?.supplier,
                acquisitionDate: data.acquisitionDate || existingGemstone.gemstone?.acquisitionDate,
                certification: data.certification || existingGemstone.gemstone?.certification,
                designCoverage: data.designCoverage || existingGemstone.gemstone?.designCoverage
            },

            updatedAt: new Date()
        };

        // The shop charges pricing.retailPrice — keep it in lockstep with the gem price
        // (the collection-level PUT already does; this route used to drift them apart).
        const resolvedPrice = Number(updateData.gemstone.retailPrice);
        if (Number.isFinite(resolvedPrice) && resolvedPrice > 0) {
            updateData['pricing.retailPrice'] = resolvedPrice;
            updateData['pricing.currency'] = 'USD';
        }

        // Update the gemstone using the appropriate search criteria
        const result = await db.collection('products').updateOne(
            searchCriteria,
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to update gemstone' }, { status: 400 });
        }

        // Fetch the updated gemstone using the same criteria
        const updatedGemstone = await db.collection('products').findOne(searchCriteria);

        return NextResponse.json({
            success: true,
            gemstone: updatedGemstone
        });

    } catch (error) {
        console.error(`PUT /api/products/gemstones/[id] error:`, error);
        return NextResponse.json(
            { error: 'Failed to update gemstone' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const db = await mongo.connect();
        const { id } = await params;

        // Try to find by productId first, then fallback to _id for backward compatibility
        let existingGemstone = await db.collection('products').findOne({
            productId: id,
            productType: 'gemstone'
        });

        let searchCriteria = { productId: id };

        // If not found by productId, try by MongoDB _id (for backward compatibility)
        if (!existingGemstone) {
            try {
                if (ObjectId.isValid(id)) {
                    existingGemstone = await db.collection('products').findOne({
                        _id: new ObjectId(id),
                        productType: 'gemstone'
                    });
                    searchCriteria = { _id: new ObjectId(id) };
                }
            } catch (error) {
                console.error('Error trying to find by ObjectId:', error);
            }
        }

        if (!existingGemstone) {
            return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
        }

        // Check if user has permission to delete this gemstone
        if (!canAccessGemstone(session, existingGemstone)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Delete the gemstone using the appropriate search criteria
        const result = await db.collection('products').deleteOne(searchCriteria);

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Failed to delete gemstone' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Gemstone deleted successfully'
        });

    } catch (error) {
        console.error(`DELETE /api/products/gemstones/[id] error:`, error);
        return NextResponse.json(
            { error: 'Failed to delete gemstone' },
            { status: 500 }
        );
    }
}