import { NotificationService, NOTIFICATION_TYPES, CHANNELS } from '@/lib/notificationService';

export async function sendApprovalNotifications(db, design, gemstone, isGlbApproval) {
    try {
        // 1. Notify designer of approval
        const designer = await db.collection('users').findOne({ userID: design.designerId });
        if (designer) {
            await NotificationService.createNotification({
                userId: design.designerId,
                type: isGlbApproval ? NOTIFICATION_TYPES.CAD_GLB_APPROVED : NOTIFICATION_TYPES.CAD_STL_APPROVED,
                title: isGlbApproval ? 'GLB Design Approved' : 'STL File Approved',
                message: isGlbApproval 
                    ? 'Your GLB design has been approved! The design is now available for purchase.' 
                    : 'Your STL file has been approved. Please submit the GLB design file.',
                channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                templateName: isGlbApproval ? 'cad_glb_approved' : 'cad_stl_approved',
                data: {
                    requestId: design.cadRequestId
                },
                recipientEmail: designer.email
            });
        }
        
        // 2. Notify the Gem Cutter who created the request
        const reqObj = gemstone.cadRequests?.find(req => req.id === design.cadRequestId);
        if (reqObj?.requestedBy?.email) {
            await NotificationService.createNotification({
                userId: reqObj.requestedBy?.userId,
                type: isGlbApproval ? NOTIFICATION_TYPES.CAD_COMPLETED : NOTIFICATION_TYPES.CAD_STL_APPROVED,
                title: isGlbApproval ? 'Your Design Is Complete & Ready!' : 'STL File Approved',
                message: isGlbApproval 
                    ? `Your CAD design for ${gemstone.name} has been approved and is now ready for production!` 
                    : 'The STL file for your design has been approved. The designer will now create the final GLB design.',
                channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                templateName: isGlbApproval ? 'cad_completed' : 'cad_stl_approved',
                data: {
                    requestId: design.cadRequestId,
                    ...(isGlbApproval && { totalCost: design.pricing?.totalCost })
                },
                recipientEmail: reqObj.requestedBy.email
            });
        }
    } catch (notificationError) {
        console.error('⚠️ Failed to send notifications:', notificationError);
    }
}
