import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/designs/[designId]/configure
 * Save design configuration and COG information
 * Admin only
 */
export async function POST(request, { params }) {
    try {
        const { designId } = await params;
        console.log('📋 Configuring design:', designId);

        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Admin only
        if (session.user.role !== 'admin') {
            return NextResponse.json({ 
                error: 'Admin access required for configuration' 
            }, { status: 403 });
        }

        const body = await request.json();
        const {
            cadLabor = 0,
            productionLabor = 0,
            pendantType = null,
            chainCost = 0,
            shippingCost = 0,
            marketingCost = 0,
            packagingCost = 0
        } = body;

        console.log('💰 Configuration data:', {
            cadLabor,
            productionLabor,
            pendantType,
            chainCost,
            shippingCost,
            marketingCost,
            packagingCost
        });

        const { db } = await connectToDatabase();

        // Find the gemstone with the design (support both old _id and new id formats)
        let gemstone = await db.collection('products').findOne({
            'designs.id': designId,
            productType: 'gemstone'
        });

        if (!gemstone) {
            // Fall back to old _id format for backwards compatibility
            gemstone = await db.collection('products').findOne({
                'designs._id': new ObjectId(designId),
                productType: 'gemstone'
            });
        }

        if (!gemstone) {
            console.log('❌ Gemstone not found for design:', designId);
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        console.log('✅ Found gemstone:', gemstone.productId);

        const design = gemstone.designs.find(d => d.id === designId || d._id?.toString() === designId);
        
        if (!design) {
            console.log('❌ Design not found in gemstone.designs');
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        console.log('✅ Found design:', design.id || design._id, 'Status:', design.status);

        // Calculate total COG
        const totalCOG = 
            parseFloat(cadLabor || 0) +
            parseFloat(productionLabor || 0) +
            parseFloat(chainCost || 0) +
            parseFloat(shippingCost || 0) +
            parseFloat(marketingCost || 0) +
            parseFloat(packagingCost || 0);

        console.log('💵 Total COG calculated:', totalCOG);

        // Update design configuration
        let updateResult;
        if (design.id) {
            console.log('🔄 Updating design configuration (new id format):', designId);
            updateResult = await db.collection('products').updateOne(
                {
                    productId: gemstone.productId,
                    'designs.id': designId
                },
                {
                    $set: {
                        'designs.$.cadLabor': parseFloat(cadLabor || 0),
                        'designs.$.productionLabor': parseFloat(productionLabor || 0),
                        'designs.$.pendantType': pendantType,
                        'designs.$.chainCost': parseFloat(chainCost || 0),
                        'designs.$.shippingCost': parseFloat(shippingCost || 0),
                        'designs.$.marketingCost': parseFloat(marketingCost || 0),
                        'designs.$.packagingCost': parseFloat(packagingCost || 0),
                        'designs.$.totalCOG': totalCOG,
                        'designs.$.configuredAt': new Date(),
                        'designs.$.configuredBy': session.user.userID,
                        'designs.$.updatedAt': new Date()
                    }
                }
            );
        } else {
            console.log('🔄 Updating design configuration (old _id format):', designId);
            updateResult = await db.collection('products').updateOne(
                {
                    productId: gemstone.productId,
                    'designs._id': new ObjectId(designId)
                },
                {
                    $set: {
                        'designs.$.cadLabor': parseFloat(cadLabor || 0),
                        'designs.$.productionLabor': parseFloat(productionLabor || 0),
                        'designs.$.pendantType': pendantType,
                        'designs.$.chainCost': parseFloat(chainCost || 0),
                        'designs.$.shippingCost': parseFloat(shippingCost || 0),
                        'designs.$.marketingCost': parseFloat(marketingCost || 0),
                        'designs.$.packagingCost': parseFloat(packagingCost || 0),
                        'designs.$.totalCOG': totalCOG,
                        'designs.$.configuredAt': new Date(),
                        'designs.$.configuredBy': session.user.userID,
                        'designs.$.updatedAt': new Date()
                    }
                }
            );
        }

        console.log('📊 Update result:', {
            modifiedCount: updateResult.modifiedCount,
            matchedCount: updateResult.matchedCount
        });

        if (updateResult.modifiedCount === 0) {
            console.log('⚠️ Configuration saved but update might have failed. Matched:', updateResult.matchedCount);
            return NextResponse.json({ 
                error: 'Failed to update design configuration',
                details: `Matched ${updateResult.matchedCount} documents but modified 0`
            }, { status: 500 });
        }

        console.log('✅ Design configuration saved successfully');

        return NextResponse.json({
            success: true,
            message: 'Design configuration saved successfully',
            design: {
                _id: designId,
                cadLabor: parseFloat(cadLabor || 0),
                productionLabor: parseFloat(productionLabor || 0),
                pendantType,
                chainCost: parseFloat(chainCost || 0),
                shippingCost: parseFloat(shippingCost || 0),
                marketingCost: parseFloat(marketingCost || 0),
                packagingCost: parseFloat(packagingCost || 0),
                totalCOG
            }
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Design Configuration API error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error.message 
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/designs/[designId]/configure
 * Retrieve design configuration and COG information
 */
export async function GET(request, { params }) {
    try {
        const { designId } = await params;
        console.log('📋 Fetching design configuration:', designId);

        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { db } = await connectToDatabase();

        // Find the gemstone with the design
        let gemstone = await db.collection('products').findOne({
            $or: [
                { 'designs.id': designId },
                { 'designs._id': new ObjectId(designId) }
            ],
            productType: 'gemstone'
        });

        if (!gemstone) {
            console.log('❌ Gemstone not found for design:', designId);
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        const design = gemstone.designs.find(d => d.id === designId || d._id?.toString() === designId);
        
        if (!design) {
            console.log('❌ Design not found');
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        console.log('✅ Design configuration retrieved');

        return NextResponse.json({
            success: true,
            configuration: {
                designId: design.id || design._id?.toString(),
                title: design.title,
                status: design.status,
                cadLabor: design.cadLabor || 0,
                productionLabor: design.productionLabor || 0,
                pendantType: design.pendantType || null,
                chainCost: design.chainCost || 0,
                shippingCost: design.shippingCost || 0,
                marketingCost: design.marketingCost || 0,
                packagingCost: design.packagingCost || 0,
                totalCOG: design.totalCOG || 0,
                configuredAt: design.configuredAt,
                configuredBy: design.configuredBy
            }
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Design Configuration Fetch error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error.message 
            },
            { status: 500 }
        );
    }
}
