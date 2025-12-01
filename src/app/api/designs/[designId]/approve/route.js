import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
    try {
        const { designId } = await params;
        console.log('✅ Design Approval API called for design ID:', designId);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { notes, approvedBy } = body;

        const { db } = await connectToDatabase();

        // Find the gemstone with the design using custom design ID (or fall back to _id for old designs)
        let gemstone = await db.collection('products').findOne({
            'designs.id': designId,
            productType: 'gemstone'
        });

        // If not found with new ID format, try old _id format
        if (!gemstone) {
            console.log('🔍 Design not found with new ID format, trying old _id format...');
            gemstone = await db.collection('products').findOne({
                'designs._id': new ObjectId(designId),
                productType: 'gemstone'
            });
        }

        if (!gemstone) {
            console.log('❌ Design not found with ID:', designId);
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find design by new ID first, then fall back to old _id
        let design = gemstone.designs.find(d => d.id === designId);
        if (!design) {
            design = gemstone.designs.find(d => d._id?.toString() === designId);
        }
        
        if (!design) {
            return NextResponse.json({ error: 'Design not found' }, { status: 404 });
        }

        // Find the CAD request that created this design
        const cadRequest = gemstone.cadRequests?.find(r => r.id === design.cadRequestId);

        // Check permissions: admin, gem cutter who requested CAD, or designer
        const isAdmin = session.user.role === 'admin';
        const isGemCutter = session.user.artisanTypes?.includes('Gem Cutter') && cadRequest?.gemCutterId === session.user.userID;
        const isDesigner = design.designerId === session.user.userID;
        
        if (!isAdmin && !isGemCutter && !isDesigner) {
            return NextResponse.json({ 
                error: 'Access denied. Only admins, the requesting gem cutter, or the designer can approve.' 
            }, { status: 403 });
        }

        // Allow approval if status is pending_approval, stl_only, stl_submitted, glb_only, or complete
        const approvableStatuses = ['pending_approval', 'stl_only', 'stl_submitted', 'glb_only', 'complete'];
        if (!approvableStatuses.includes(design.status)) {
            return NextResponse.json({ 
                error: 'Design is not in an approvable status',
                currentStatus: design.status,
                approvableStatuses 
            }, { status: 400 });
        }

        // Update the design in the gemstone - handle both new (id) and old (_id) formats
        const designIndex = gemstone.designs.findIndex(d => d.id === designId || d._id?.toString() === designId);
        
        if (designIndex === -1) {
            return NextResponse.json({ error: 'Design not found in gemstone' }, { status: 404 });
        }
        
        // Determine new design status based on file type
        // STL approval → stl_approved (waiting for GLB)
        // GLB approval → approved (ready for purchase)
        const newDesignStatus = design.files?.stl && !design.files?.glb ? 'stl_approved' : 'approved';
        
        // Build query to match the design (works with both id and _id formats)
        const updateQuery = design.id ? 
            { productId: gemstone.productId, 'designs.id': designId } :
            { productId: gemstone.productId, 'designs._id': new ObjectId(designId) };
        
        const updateResult = await db.collection('products').updateOne(
            updateQuery,
            {
                $set: {
                    'designs.$.status': newDesignStatus,
                    'designs.$.approvedAt': new Date(),
                    'designs.$.approvedBy': approvedBy,
                    'designs.$.approvedByName': session.user.name,
                    'designs.$.approvalNotes': notes,
                    'designs.$.isAvailableForPurchase': newDesignStatus === 'approved', // Only available for purchase after GLB approval
                    'designs.$.updatedAt': new Date()
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to approve design in gemstone' }, { status: 500 });
        }

        // Update the standalone design product
        const designProductResult = await db.collection('products').updateOne(
            {
                productId: `design_${designId}`,
                productType: 'design'
            },
            {
                $set: {
                    status: 'approved',
                    isAvailableForPurchase: true,
                    isEcommerceReady: true,
                    approvedAt: new Date(),
                    approvedBy: approvedBy,
                    approvedByName: session.user.name,
                    approvalNotes: notes,
                    updatedAt: new Date()
                }
            }
        );

        // Update the CAD request status if there is one
        if (design.cadRequestId) {
            // Determine new status based on file type
            // STL approval → stl_approved
            // GLB approval → design_approved
            const newRequestStatus = design.files?.stl && !design.files?.glb ? 'stl_approved' : 'design_approved';
            
            await db.collection('products').updateOne(
                {
                    productId: gemstone.productId,
                    'cadRequests.id': design.cadRequestId
                },
                {
                    $set: {
                        'cadRequests.$.status': newRequestStatus,
                        'cadRequests.$.approvedAt': new Date(),
                        'cadRequests.$.approvedBy': approvedBy,
                        'cadRequests.$.updatedAt': new Date()
                    },
                    $push: {
                        'cadRequests.$.statusHistory': {
                            _id: new ObjectId(),
                            status: newRequestStatus,
                            notes: notes || (design.files?.stl && !design.files?.glb ? 'STL approved! Ready for GLB design.' : 'Design approved and ready for purchase'),
                            updatedBy: approvedBy,
                            updatedByName: session.user.name,
                            updatedAt: new Date()
                        },
                        'cadRequests.$.comments': {
                            _id: new ObjectId(),
                            comment: `${design.files?.stl && !design.files?.glb ? 'STL approved' : 'Design approved'}! ${notes || (design.files?.stl && !design.files?.glb ? 'Ready for GLB design.' : 'The design is now available for purchase.')}`,
                            userId: approvedBy,
                            userName: session.user.name,
                            createdAt: new Date(),
                            type: 'approval'
                        }
                    }
                }
            );
        }

        // Only create/update standalone product and pricing for GLB approval (full approval)
        if (newDesignStatus === 'approved') {
            // Create pricing variants for different metals
            const metalVariants = {
                '14k_gold': calculatePricingForMetal('14k_gold', design.printVolume),
                '18k_gold': calculatePricingForMetal('18k_gold', design.printVolume),
                'sterling_silver': calculatePricingForMetal('sterling_silver', design.printVolume),
                'platinum': calculatePricingForMetal('platinum', design.printVolume),
                'palladium': calculatePricingForMetal('palladium', design.printVolume)
            };

            // Update the standalone design product
            const designProductResult = await db.collection('products').updateOne(
                {
                    productId: `design_${designId}`,
                    productType: 'design'
                },
                {
                    $set: {
                        status: 'approved',
                        isAvailableForPurchase: true,
                        isEcommerceReady: true,
                        approvedAt: new Date(),
                        approvedBy: approvedBy,
                        approvedByName: session.user.name,
                        approvalNotes: notes,
                        updatedAt: new Date()
                    }
                }
            );

            // Update the standalone product with metal variants
            await db.collection('products').updateOne(
                {
                    productId: `design_${designId}`,
                    productType: 'design'
                },
                {
                    $set: {
                        metalVariants,
                        pricing: metalVariants,  // Keep original pricing structure
                        variants: Object.keys(metalVariants).map(metal => ({
                            id: metal,
                            name: metal.replace('_', ' ').toUpperCase(),
                            price: metalVariants[metal].totalCost,
                            available: true
                        }))
                    }
                }
            );

            console.log('✅ GLB Design fully approved and made available for purchase');
            console.log('📊 Created product variants:', Object.keys(metalVariants));

            return NextResponse.json({
                success: true,
                message: 'Design approved and made available for purchase',
                designProductId: `design_${designId}`,
                variants: metalVariants
            });
        } else {
            console.log('✅ STL Design approved! Ready for GLB design upload');
            return NextResponse.json({
                success: true,
                message: 'STL design approved! Ready for GLB design upload',
                designId: designId
            });
        }

    } catch (error) {
        console.error('❌ Design Approval API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// Helper function to calculate pricing for different metals
function calculatePricingForMetal(metalType, printVolume) {
    const basePrices = {
        '14k_gold': 60.0,  // per gram
        '18k_gold': 70.0,
        'sterling_silver': 0.80,
        'platinum': 90.0,
        'palladium': 65.0
    };

    const densities = {
        '14k_gold': 13.0,    // g/cm³
        '18k_gold': 15.5,
        'sterling_silver': 10.4,
        'platinum': 21.5,
        'palladium': 12.0
    };

    const basePrice = basePrices[metalType] || basePrices['sterling_silver'];
    const density = densities[metalType] || densities['sterling_silver'];
    
    // Convert print volume (cm³) to grams
    const estimatedWeight = printVolume * density;
    const materialCost = estimatedWeight * basePrice;
    
    // Add design fee and markup
    const designFee = 150.0; // Base design fee
    const markup = 1.4; // 40% markup
    
    const totalCost = (materialCost + designFee) * markup;

    return {
        materialCost: Math.round(materialCost * 100) / 100,
        designFee: designFee,
        markup: markup,
        totalCost: Math.round(totalCost * 100) / 100,
        estimatedWeight: Math.round(estimatedWeight * 100) / 100,
        pricePerGram: basePrice,
        metalType: metalType,
        breakdown: {
            printVolume: printVolume,
            density: density,
            metalType: metalType
        }
    };
}