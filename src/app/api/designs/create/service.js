import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadFileToS3 } from '@/utils/s3.util';

// Import helper functions to keep this file under constraints
import { 
    validateDesignRequestIds, 
    buildDesignData, 
    calculateDesignPricing, 
    buildDesignProduct 
} from './service.helpers';

export default class DesignService {
    static async createDesign(formData, user) {
        const { db } = await connectToDatabase();

        // Extract and validate IDs
        const cadRequestId = formData.get('cadRequestId');
        const gemstoneId = formData.get('gemstoneId');
        
        console.log('🔍 CAD Request ID:', cadRequestId);
        console.log('🔍 Gemstone ID:', gemstoneId);

        const validationError = validateDesignRequestIds(cadRequestId, gemstoneId);
        if (validationError) return validationError;

        // Extract form fields
        const designData = buildDesignData(formData, user, cadRequestId);

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
            return { error: 'Gemstone not found', status: 404 };
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
            return { 
                error: 'CAD request not found', 
                status: 404,
                debug: {
                    cadRequestId,
                    availableRequests: gemstone.cadRequests?.map(req => ({
                        id: req.id || req._id,
                        type: typeof (req.id || req._id),
                        toString: (req.id || req._id)?.toString ? (req.id || req._id).toString() : 'no toString method'
                    })) || []
                }
            };
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
            return { error: 'Failed to add design to gemstone', status: 400 };
        }

        // Create standalone design product for shop
        const designProduct = buildDesignProduct(designData, gemstone, mountingType, metalType, user);

        // Insert standalone design product
        await db.collection('products').insertOne(designProduct);

        return {
            designId: designData._id,
            designProductId: designProduct.productId,
            message: 'Design created and added to gemstone successfully'
        };
    }
}
