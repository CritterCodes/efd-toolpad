import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { uploadFileToS3 } from '@/utils/s3.util';

export async function POST(request) {
    try {
        console.log('🎨 Design Creation API called');
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is a CAD Designer
        if (!session.user.artisanTypes?.includes('CAD Designer')) {
            return NextResponse.json({ error: 'Access denied. CAD Designer role required.' }, { status: 403 });
        }

        const { db } = await connectToDatabase();

        // Parse form data
        const formData = await request.formData();
        
        console.log('📋 Form data received');

        // Extract and validate IDs
        const cadRequestId = formData.get('cadRequestId');
        const gemstoneId = formData.get('gemstoneId');
        
        console.log('🔍 CAD Request ID:', cadRequestId);
        console.log('🔍 Gemstone ID:', gemstoneId);

        if (!cadRequestId) {
            return NextResponse.json({ error: 'CAD Request ID is required' }, { status: 400 });
        }

        if (!gemstoneId) {
            return NextResponse.json({ error: 'Gemstone ID is required' }, { status: 400 });
        }

        // Extract form fields
        const designData = {
            _id: new ObjectId(),
            title: formData.get('title'),
            description: formData.get('description'),
            printVolume: parseFloat(formData.get('printVolume')) || 0,
            estimatedTime: parseFloat(formData.get('estimatedTime')) || 0,
            notes: formData.get('notes') || '',
            status: 'pending_approval',
            designerId: session.user.userID,
            designerName: session.user.name,
            designerEmail: session.user.email,
            cadRequestId: cadRequestId, // Store as string (custom ID format)
            createdAt: new Date(),
            updatedAt: new Date(),
            files: {}
        };

        // Handle file uploads to S3
        const stlFile = formData.get('stlFile');
        const glbFile = formData.get('glbFile');

        if (stlFile && stlFile.size > 0) {
            console.log(`📁 Uploading STL file: ${stlFile.name} (${stlFile.size} bytes)`);
            
            // Upload to S3 with organized folder structure
            const stlUrl = await uploadFileToS3(
                stlFile, 
                `designs/cad-requests/${cadRequestId}`, 
                `design-${designData._id}-stl-`
            );
            
            designData.files.stl = {
                originalName: stlFile.name,
                url: stlUrl,
                size: stlFile.size,
                mimetype: stlFile.type
            };
            
            console.log(`✅ STL uploaded to S3: ${stlUrl}`);
        }

        if (glbFile && glbFile.size > 0) {
            console.log(`📁 Uploading GLB file: ${glbFile.name} (${glbFile.size} bytes)`);
            
            // Upload to S3 with organized folder structure
            const glbUrl = await uploadFileToS3(
                glbFile, 
                `designs/cad-requests/${cadRequestId}`, 
                `design-${designData._id}-glb-`
            );
            
            designData.files.glb = {
                originalName: glbFile.name,
                url: glbUrl,
                size: glbFile.size,
                mimetype: glbFile.type
            };
            
            console.log(`✅ GLB uploaded to S3: ${glbUrl}`);
        }

        // Get the gemstone and CAD request
        console.log(`🔍 Looking for gemstone with productId: ${gemstoneId}`);
        
        const gemstone = await db.collection('products').findOne({
            productId: gemstoneId
        });

        console.log('🔍 Gemstone query result:', gemstone ? 'Found' : 'Not found');
        
        if (gemstone) {
            console.log('🔍 Gemstone title:', gemstone.title);
            console.log('🔍 Gemstone productType:', gemstone.productType);
            console.log('🔍 Gemstone has cadRequests:', !!gemstone.cadRequests);
            
            if (gemstone.cadRequests) {
                console.log('🔍 Number of CAD requests:', gemstone.cadRequests.length);
                console.log('🔍 CAD request IDs:');
                gemstone.cadRequests.forEach((req, index) => {
                    console.log(`  ${index}: ${req.id || req._id} (type: ${typeof (req.id || req._id)})`);
                });
            }
        }

        if (!gemstone) {
            return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
        }

        console.log(`🔍 Looking for CAD request with ID: ${cadRequestId}`);
        console.log(`🔍 Available CAD requests:`, gemstone.cadRequests?.map(req => req.id || req._id) || []);
        
        // Find CAD request by ID (handle both id and _id fields)
        const cadRequest = gemstone.cadRequests?.find(req => {
            const reqId = req.id || req._id; // Try both id and _id fields
            console.log(`  🔍 Comparing ${reqId} (${typeof reqId}) with ${cadRequestId}`);
            
            if (typeof reqId === 'object' && reqId.toString) {
                const idStr = reqId.toString();
                console.log(`    🔍 ObjectId toString: ${idStr}`);
                return idStr === cadRequestId;
            }
            return reqId === cadRequestId;
        });
        
        console.log('🔍 CAD request found:', !!cadRequest);
        
        if (!cadRequest) {
            return NextResponse.json({ 
                error: 'CAD request not found', 
                debug: {
                    cadRequestId,
                    availableRequests: gemstone.cadRequests?.map(req => ({
                        id: req.id || req._id,
                        type: typeof (req.id || req._id),
                        toString: (req.id || req._id)?.toString ? (req.id || req._id).toString() : 'no toString method'
                    })) || []
                }
            }, { status: 404 });
        }

        // Calculate pricing based on metal type and print volume
        const metalType = cadRequest.mountingDetails?.metalType || 'Sterling Silver';
        const mountingType = cadRequest.mountingDetails?.mountingType || 'Ring';
        
        designData.pricing = calculateDesignPricing(metalType, designData.printVolume);

        // Add design to gemstone object
        const result = await db.collection('products').updateOne(
            { 
                productId: gemstoneId,
                productType: 'gemstone'
            },
            { 
                $push: { 
                    designs: designData 
                },
                $set: {
                    updatedAt: new Date(),
                    hasDesigns: true,
                    designCount: (gemstone.designs?.length || 0) + 1
                }
            }
        );

        // Update the CAD request status
        console.log(`🔄 Updating CAD request status for ID: ${cadRequestId}`);
        
        // Try updating with id field first (based on what we found)
        let updateResult = null;
        try {
            updateResult = await db.collection('products').updateOne(
                { 
                    productId: gemstoneId,
                    'cadRequests.id': cadRequestId
                },
                { 
                    $set: {
                        'cadRequests.$.status': 'design_submitted',
                        'cadRequests.$.designId': designData._id,
                        'cadRequests.$.updatedAt': new Date()
                    }
                }
            );
            
            console.log('📊 CAD request update result (using id field):', updateResult);
        } catch (updateError) {
            console.log('🔄 Update with id field failed, trying _id field');
            // Fallback to _id field
            updateResult = await db.collection('products').updateOne(
                { 
                    productId: gemstoneId,
                    'cadRequests._id': cadRequestId
                },
                { 
                    $set: {
                        'cadRequests.$.status': 'design_submitted',
                        'cadRequests.$.designId': designData._id,
                        'cadRequests.$.updatedAt': new Date()
                    }
                }
            );
            
            console.log('📊 CAD request update result (using _id field):', updateResult);
        }

        console.log('📊 Design creation result:', result);

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to add design to gemstone' }, { status: 400 });
        }

        // Create standalone design product for shop
        const designProduct = {
            _id: new ObjectId(),
            productId: `design_${designData._id.toString()}`,
            productType: 'design',
            title: designData.title,
            description: designData.description,
            category: 'Custom Designs',
            subcategory: mountingType,
            designData: {
                ...designData,
                forGemstone: {
                    productId: gemstoneId,
                    title: gemstone.title,
                    species: gemstone.gemstone?.species,
                    subspecies: gemstone.gemstone?.subspecies,
                    carat: gemstone.gemstone?.carat
                }
            },
            pricing: designData.pricing,
            metalOptions: getMetalOptions(metalType),
            status: 'active',
            userId: session.user.userID,
            createdAt: new Date(),
            updatedAt: new Date(),
            isEcommerceReady: true,
            tags: ['custom-design', 'cad-design', mountingType.toLowerCase()]
        };

        // Insert standalone design product
        await db.collection('products').insertOne(designProduct);

        return NextResponse.json({
            success: true,
            designId: designData._id,
            designProductId: designProduct.productId,
            message: 'Design created and added to gemstone successfully'
        });

    } catch (error) {
        console.error('❌ Design Creation API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// Helper function to calculate design pricing
function calculateDesignPricing(metalType, printVolume) {
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
        breakdown: {
            printVolume: printVolume,
            density: density,
            metalType: metalType
        }
    };
}

// Helper function to get metal options for e-commerce
function getMetalOptions(primaryMetal) {
    const allMetals = {
        '14k_gold': { name: '14K Gold', available: true },
        '18k_gold': { name: '18K Gold', available: true },
        'sterling_silver': { name: 'Sterling Silver', available: true },
        'platinum': { name: 'Platinum', available: true },
        'palladium': { name: 'Palladium', available: true }
    };

    // Mark the primary metal as the default
    if (allMetals[primaryMetal]) {
        allMetals[primaryMetal].default = true;
    }

    return allMetals;
}

