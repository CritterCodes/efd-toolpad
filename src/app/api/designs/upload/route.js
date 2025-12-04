import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { uploadFileToS3 } from '@/utils/s3.util';
import { calculateSTLVolume } from '@/utils/stlVolumeCalculator';
import { ObjectId } from 'mongodb';
import { NotificationService, NOTIFICATION_TYPES, CHANNELS } from '@/lib/notificationService';

export async function POST(request) {
    try {
        console.log('🎨 Design Upload API called');
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is a CAD Designer (can upload designs)
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

        // Check if a design already exists for this CAD request
        // If so, we're updating it with the second file (STL or GLB)
        // One CAD request = ONE design with both STL and GLB files
        let existingDesign = gemstone.designs?.find(d => d.cadRequestId === requestId);

        if (existingDesign && existingDesign.files?.[fileType]) {
            // Design already has this file type, reject upload
            return NextResponse.json({ 
                error: `This design already has a ${fileType.toUpperCase()} file. Each CAD request should have only one of each file type.` 
            }, { status: 400 });
        }

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
            `${fileType}-`
        );

        console.log('✅ File uploaded to S3:', fileUrl);

        // Calculate volume and mesh stats for STL files
        let printVolume = null;
        let meshStats = null;
        
        if (fileType === 'stl') {
            console.log('📊 Calculating STL volume and mesh stats...');
            try {
                const buffer = await uploadedFile.arrayBuffer();
                const volumeData = await calculateSTLVolume(buffer);
                
                if (volumeData.success) {
                    printVolume = volumeData.volume;
                    meshStats = volumeData.meshStats;
                    console.log('✅ Volume calculated:', printVolume, 'mm³');
                    console.log('📐 Mesh stats:', meshStats);
                } else {
                    console.warn('⚠️ Volume calculation failed:', volumeData.error);
                }
            } catch (error) {
                console.warn('⚠️ Could not calculate volume:', error.message);
            }
        }

        // Create or update design - ONE design per CAD request with both STL and GLB files
        console.log(`✅ ${fileType.toUpperCase()} uploaded to S3`);
        
        let designData; // Will be set in create or update branch
        
        if (existingDesign) {
            // Update existing design with the new file
            console.log('🔄 Updating existing design with', fileType.toUpperCase(), 'file');
            
            const designIndex = gemstone.designs.findIndex(d => d.cadRequestId === requestId);
            
            // Determine new status based on what files we'll have
            let newDesignStatus = 'complete';  // Both files present
            
            const updatedDesign = {
                ...existingDesign,
                files: {
                    ...existingDesign.files,
                    [fileType]: {
                        originalName: uploadedFile.name,
                        url: fileUrl,
                        size: uploadedFile.size,
                        mimetype: uploadedFile.type
                    }
                },
                // Update volume/meshStats if from STL
                ...(fileType === 'stl' && { printVolume, meshStats }),
                status: newDesignStatus,
                updatedAt: new Date()
            };

            const updateResult = await db.collection('products').updateOne(
                { productId: gemstone.productId },
                { 
                    $set: {
                        [`designs.${designIndex}`]: updatedDesign,
                        updatedAt: new Date()
                    }
                }
            );

            if (updateResult.modifiedCount === 0) {
                return NextResponse.json({ 
                    error: 'Failed to update design' 
                }, { status: 500 });
            }

            console.log('✅ Design updated successfully, status: complete (both files present)');
            designData = updatedDesign;
        } else {
            // Create new design
            console.log('💾 Creating new design record');
            
            designData = {
                id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                title: title.trim(),
                description: description.trim(),
                notes: notes.trim(),
                status: fileType === 'stl' ? 'stl_only' : 'glb_only',  // Track what file we have
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
                // Only set if STL upload
                ...(fileType === 'stl' && { printVolume, meshStats }),
                createdAt: new Date(),
                updatedAt: new Date()
            };

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

            console.log('✅ Design created successfully:', designData._id);
        }

        // Update CAD request status based on file type and what we have
        // STL upload → stl_submitted (awaiting GLB)
        // GLB upload with both STL and GLB → design_submitted (ready for admin review)
        let newRequestStatus = 'in_progress';
        
        if (fileType === 'stl') {
            newRequestStatus = 'stl_submitted';
            console.log('📄 STL uploaded, status: stl_submitted (waiting for GLB)');
        } else if (fileType === 'glb') {
            // Check if design now has both STL and GLB
            if (designData.files?.stl && designData.files?.glb) {
                newRequestStatus = 'design_submitted';
                console.log('✨ Both STL and GLB present, status: design_submitted (ready for review)');
            } else {
                newRequestStatus = 'glb_submitted';
                console.log('🎬 GLB uploaded, status: glb_submitted (waiting for STL)');
            }
        }
        
        console.log(`🔄 Updating CAD request status to '${newRequestStatus}'`);
        
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

        // Send notifications
        try {
            // 1. Notify admins about submission
            const adminUsers = await db.collection('users').find({ role: 'admin' }).toArray();
            const notificationType = fileType === 'stl' ? NOTIFICATION_TYPES.CAD_STL_SUBMITTED : NOTIFICATION_TYPES.CAD_GLB_SUBMITTED;
            const templateName = fileType === 'stl' ? 'cad_stl_submitted' : 'cad_glb_submitted';
            
            for (const admin of adminUsers) {
                await NotificationService.createNotification({
                    userId: admin.userID,
                    type: notificationType,
                    title: `${fileType.toUpperCase()} File Submitted`,
                    message: `${session.user.name} has submitted a ${fileType.toUpperCase()} file for CAD request ${requestId}`,
                    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                    templateName,
                    data: {
                        requestId,
                        fileName: uploadedFile.name,
                        volume: fileType === 'stl' ? printVolume : undefined
                    },
                    recipientEmail: admin.email
                });
            }
            
            // 2. Notify the Gem Cutter who created the request
            const cadRequest = cadRequests.find(req => req.id === requestId);
            if (cadRequest?.requestedBy?.email) {
                await NotificationService.createNotification({
                    userId: cadRequest.requestedBy?.userId,
                    type: notificationType,
                    title: `${fileType.toUpperCase()} File Submitted to Your Request`,
                    message: `The designer has submitted a ${fileType.toUpperCase()} file for your ${fileType === 'stl' ? 'initial design' : 'final design'}.`,
                    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                    templateName,
                    data: {
                        requestId,
                        fileName: uploadedFile.name,
                        volume: fileType === 'stl' ? printVolume : undefined
                    },
                    recipientEmail: cadRequest.requestedBy.email
                });
            }
        } catch (notificationError) {
            console.error('⚠️ Failed to send notifications:', notificationError);
            // Don't fail the whole request if notifications fail
        }

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
