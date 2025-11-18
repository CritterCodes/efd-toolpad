import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { uploadFileToS3 } from '@/utils/s3.util';
import { calculateSTLVolume } from '@/utils/stlVolumeCalculator';
import { ObjectId } from 'mongodb';

export async function POST(request) {
    try {
        console.log('🎨 Design Upload API called');
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is a CAD Designer
        if (!session.user.artisanTypes?.includes('CAD Designer')) {
            return NextResponse.json({ 
                error: 'Access denied. CAD Designer role required.' 
            }, { status: 403 });
        }

        const { db } = await connectToDatabase();

        // Parse form data
        const formData = await request.formData();
        
        console.log('📋 Form data received');

        // Extract required fields
        const requestId = formData.get('requestId');
        const designerId = formData.get('designerId');
        const title = formData.get('title');
        const description = formData.get('description') || '';
        const notes = formData.get('notes') || '';
        const uploadedFile = formData.get('glbFile');

        // Detect file type from extension
        const fileExtension = uploadedFile?.name?.split('.')?.pop()?.toLowerCase();
        const fileType = fileExtension === 'stl' ? 'stl' : 'glb';
        
        console.log('🔍 Detected file type:', fileType);
        console.log('🔍 Request ID:', requestId);
        console.log('🔍 Designer ID:', designerId);
        console.log('🔍 Title:', title);

        // Validate required fields
        if (!requestId) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Design title is required' }, { status: 400 });
        }

        if (!uploadedFile || uploadedFile.size === 0) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        // Find the gemstone and CAD request
        console.log(`🔍 Looking for CAD request with ID: ${requestId}`);
        
        const gemstone = await db.collection('products').findOne({
            'cadRequests.id': requestId
        });

        if (!gemstone) {
            console.log('❌ Gemstone not found for CAD request:', requestId);
            return NextResponse.json({ 
                error: 'CAD request not found' 
            }, { status: 404 });
        }

        console.log('✅ Found gemstone:', gemstone.productId);

        // Find the specific CAD request
        const cadRequest = gemstone.cadRequests.find(req => req.id === requestId);
        
        if (!cadRequest) {
            return NextResponse.json({ 
                error: 'CAD request not found in gemstone' 
            }, { status: 404 });
        }

        console.log('✅ Found CAD request, current status:', cadRequest.status);

        // Verify designer ownership (must be the one who claimed it, or admin)
        if (cadRequest.designerId !== designerId && session.user.role !== 'admin') {
            return NextResponse.json({ 
                error: 'You do not have permission to upload designs for this request' 
            }, { status: 403 });
        }

        // Upload file to S3 with type-specific prefix
        console.log(`📁 Uploading ${fileType.toUpperCase()} file: ${uploadedFile.name} (${uploadedFile.size} bytes)`);
        
        const fileUrl = await uploadFileToS3(
            uploadedFile,
            `designs/${requestId}`,
            `${requestId}-${fileType}-`
        );
        
        console.log(`✅ ${fileType.toUpperCase()} uploaded to S3: ${fileUrl}`);

        // Calculate volume for STL files
        let volumeData = null;
        let meshStats = null;
        let printVolume = 0;

        if (fileType === 'stl') {
            try {
                console.log('📏 Calculating STL volume...');
                const fileBuffer = await uploadedFile.arrayBuffer();
                volumeData = calculateSTLVolume(fileBuffer);
                
                if (volumeData.success) {
                    printVolume = volumeData.volume;
                    meshStats = volumeData.meshStats;
                    console.log(`✅ Volume calculated: ${printVolume} mm³`);
                    console.log(`📐 Mesh stats:`, meshStats);
                } else {
                    console.warn('⚠️ Volume calculation failed:', volumeData.error);
                }
            } catch (volError) {
                console.error('⚠️ Error during volume calculation:', volError);
                // Continue without volume - not a critical error
            }
        }

        // Create design record with separate file storage
        const designData = {
            _id: new ObjectId(),
            title: title.trim(),
            description: description.trim(),
            notes: notes.trim(),
            status: 'pending_approval',
            designerId: session.user.userID,
            designerName: session.user.name,
            designerEmail: session.user.email,
            cadRequestId: requestId,
            files: {
                [fileType]: {
                    originalName: uploadedFile.name,
                    url: fileUrl,
                    size: uploadedFile.size,
                    mimetype: uploadedFile.type
                }
            },
            printVolume: printVolume,
            meshStats: meshStats,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('💾 Creating design record:', designData._id);

        // Add design to gemstone's designs array
        const updateResult = await db.collection('products').updateOne(
            { 
                productId: gemstone.productId
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

        if (updateResult.modifiedCount === 0) {
            return NextResponse.json({ 
                error: 'Failed to save design' 
            }, { status: 500 });
        }

        console.log('✅ Design saved successfully:', designData._id);

        // Update CAD request status based on file type
        // STL upload → in_progress (still waiting for STL approval)
        // GLB upload → design_submitted (GLB design submitted for approval)
        const newRequestStatus = fileType === 'stl' ? 'in_progress' : 'design_submitted';
        console.log(`🔄 Updating CAD request status to '${newRequestStatus}' (file type: ${fileType})`);
        
        await db.collection('products').updateOne(
            {
                'cadRequests.id': requestId
            },
            {
                $set: {
                    'cadRequests.$.status': newRequestStatus,
                    'cadRequests.$.updatedAt': new Date(),
                    'cadRequests.$.lastUpdatedBy': session.user.userID
                }
            }
        );

        console.log('✅ CAD request status updated');

        return NextResponse.json({
            success: true,
            design: {
                _id: designData._id,
                title: designData.title,
                description: designData.description,
                files: designData.files,
                status: designData.status,
                createdAt: designData.createdAt
            },
            message: 'Design uploaded successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('❌ Design Upload API error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error.message 
            },
            { status: 500 }
        );
    }
}
