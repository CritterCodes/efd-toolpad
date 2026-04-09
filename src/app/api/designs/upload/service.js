import { connectToDatabase } from '@/lib/mongodb';
import { S3UploadService } from '@/services/aws/s3Upload.service';
import { calculateSTLVolume } from '@/utils/stlVolumeCalculator';
import { NotificationService, NOTIFICATION_TYPES, CHANNELS } from '@/lib/notificationService';

class HttpError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class DesignUploadService {
    static async handleUpload(payload) {
        const { 
            requestId, designerId, title, description, notes, 
            fileType, fileName, fileSize, fileMimeType, fileBuffer, sessionUser 
        } = payload;

        const { db } = await connectToDatabase();

        const gemstone = await db.collection('products').findOne({ 'cadRequests.id': requestId });
        if (!gemstone) throw new HttpError('CAD request not found', 404);

        const cadRequest = gemstone.cadRequests.find(req => req.id === requestId);
        if (!cadRequest) throw new HttpError('CAD request not found in gemstone', 404);

        let existingDesign = gemstone.designs?.find(d => d.cadRequestId === requestId);
        if (existingDesign && existingDesign.files?.[fileType]) {
            throw new HttpError(`This design already has a ${fileType.toUpperCase()} file.`, 400);
        }

        if (cadRequest.designerId !== designerId && sessionUser.role !== 'admin') {
            throw new HttpError('You do not have permission to upload designs for this request', 403);
        }

        const fileUrl = await S3UploadService.uploadToS3(
            fileBuffer, fileName, fileMimeType, `designs/${requestId}`, `${fileType}-`
        );

        let printVolume = null;
        let meshStats = null;
        if (fileType === 'stl') {
            try {
                const volumeData = await calculateSTLVolume(fileBuffer);
                if (volumeData.success) {
                    printVolume = volumeData.volume;
                    meshStats = volumeData.meshStats;
                }
            } catch (error) {
                console.warn('⚠️ Could not calculate volume:', error.message);
            }
        }

        let designData;
        if (existingDesign) {
            const designIndex = gemstone.designs.findIndex(d => d.cadRequestId === requestId);
            const updatedDesign = {
                ...existingDesign,
                files: {
                    ...existingDesign.files,
                    [fileType]: { originalName: fileName, url: fileUrl, size: fileSize, mimetype: fileMimeType }
                },
                ...(fileType === 'stl' && { printVolume, meshStats }),
                status: 'complete',
                updatedAt: new Date()
            };

            const updateResult = await db.collection('products').updateOne(
                { productId: gemstone.productId },
                { $set: { [`designs.${designIndex}`]: updatedDesign, updatedAt: new Date() } }
            );

            if (updateResult.modifiedCount === 0) throw new HttpError('Failed to update design', 500);
            designData = updatedDesign;
        } else {
            designData = {
                id: `design_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                title, description, notes,
                status: fileType === 'stl' ? 'stl_only' : 'glb_only',
                designerId: sessionUser.userID,
                designerName: sessionUser.name,
                designerEmail: sessionUser.email,
                cadRequestId: requestId,
                files: {
                    [fileType]: { originalName: fileName, url: fileUrl, size: fileSize, mimetype: fileMimeType }
                },
                ...(fileType === 'stl' && { printVolume, meshStats }),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const updateResult = await db.collection('products').updateOne(
                { productId: gemstone.productId },
                { 
                    $push: { designs: designData },
                    $set: { updatedAt: new Date(), hasDesigns: true, designCount: (gemstone.designs?.length || 0) + 1 }
                }
            );

            if (updateResult.modifiedCount === 0) throw new HttpError('Failed to save design', 500);
        }

        let newRequestStatus = 'in_progress';
        if (fileType === 'stl') {
            newRequestStatus = 'stl_submitted';
        } else if (fileType === 'glb') {
            newRequestStatus = (designData.files?.stl && designData.files?.glb) ? 'design_submitted' : 'glb_submitted';
        }

        await db.collection('products').updateOne(
            { 'cadRequests.id': requestId },
            { $set: { 'cadRequests.$.status': newRequestStatus, 'cadRequests.$.updatedAt': new Date(), 'cadRequests.$.lastUpdatedBy': sessionUser.userID } }
        );

        await this._sendNotifications(sessionUser, db, fileType, requestId, fileName, printVolume, gemstone.cadRequests);

        return {
            _id: designData._id || designData.id,
            title: designData.title,
            description: designData.description,
            files: designData.files,
            status: designData.status,
            createdAt: designData.createdAt
        };
    }

    static async _sendNotifications(sessionUser, db, fileType, requestId, fileName, printVolume, cadRequests) {
        try {
            const adminUsers = await db.collection('users').find({ role: 'admin' }).toArray();
            const notificationType = fileType === 'stl' ? NOTIFICATION_TYPES.CAD_STL_SUBMITTED : NOTIFICATION_TYPES.CAD_GLB_SUBMITTED;
            const templateName = fileType === 'stl' ? 'cad_stl_submitted' : 'cad_glb_submitted';
            
            for (const admin of adminUsers) {
                await NotificationService.createNotification({
                    userId: admin.userID,
                    type: notificationType,
                    title: `${fileType.toUpperCase()} File Submitted`,
                    message: `${sessionUser.name} has submitted a ${fileType.toUpperCase()} file for CAD request ${requestId}`,
                    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                    templateName,
                    data: { requestId, fileName, volume: fileType === 'stl' ? printVolume : undefined },
                    recipientEmail: admin.email
                });
            }
            
            const cadRequest = cadRequests.find(req => req.id === requestId);
            if (cadRequest?.requestedBy?.email) {
                await NotificationService.createNotification({
                    userId: cadRequest.requestedBy?.userId,
                    type: notificationType,
                    title: `${fileType.toUpperCase()} File Submitted to Your Request`,
                    message: `The designer has submitted a ${fileType.toUpperCase()} file for your ${fileType === 'stl' ? 'initial design' : 'final design'}.`,
                    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                    templateName,
                    data: { requestId, fileName, volume: fileType === 'stl' ? printVolume : undefined },
                    recipientEmail: cadRequest.requestedBy.email
                });
            }
        } catch (error) {
            console.error('⚠️ Failed to send notifications:', error);
        }
    }
}
