import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { createPieceFromDesign } from '@/services/production/pieceRouting';
import DesignsModel, { DESIGN_STATUS } from '@/app/api/designs/model';

export async function POST(request, { params }) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { requestId } = params;
        if (!ObjectId.isValid(requestId)) {
            return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
        }

        const db = await mongo.connect();

        const designRequest = await db.collection('designRequests').findOne({
            _id: new ObjectId(requestId),
        });

        if (!designRequest) {
            return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
        }

        if (designRequest.status !== 'in_progress') {
            return NextResponse.json(
                { error: 'Request must be in_progress to produce' },
                { status: 409 }
            );
        }

        // Resolve the Design: prefer one explicitly linked to this request (legacy
        // requestId field), then fall back to gemstoneId match, then mint a stub.
        const designsCol = await DesignsModel.collection();
        let design = await designsCol.findOne({
            designID: { $exists: true },
            $or: [
                { requestId: designRequest._id },
                { requestId: requestId },
            ],
        });

        if (!design && designRequest.gemstoneId) {
            const matches = await DesignsModel.list({ gemstoneId: designRequest.gemstoneId });
            design = matches[0] ?? null;
        }

        if (!design) {
            const reqSnippet = designRequest.requirements
                ? designRequest.requirements.slice(0, 60)
                : null;
            design = await DesignsModel.create({
                name: reqSnippet ? `Custom design — ${reqSnippet}` : 'Custom design',
                gemstoneId: designRequest.gemstoneId ?? null,
                designerUserID: designRequest.assignedTo ?? null,
                description: designRequest.requirements ?? null,
                status: DESIGN_STATUS.APPROVED_FOR_PRODUCTION,
                createdBy: session.user.id,
            });
        }

        // Spawn the Piece + routed work orders; thread the gemstone end-to-end (M6).
        const piece = await createPieceFromDesign(design.designID, {
            gemstoneId: designRequest.gemstoneId ?? design.gemstoneId ?? null,
            createdBy: session.user.id,
        });

        await db.collection('designRequests').updateOne(
            { _id: new ObjectId(requestId) },
            {
                $set: {
                    status: 'completed',
                    pieceID: piece.pieceID,
                    designID: design.designID,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                },
            }
        );

        if (designRequest.gemstoneId) {
            await db.collection('products').updateOne(
                { productId: designRequest.gemstoneId },
                {
                    $set: {
                        needsCustomDesign: false,
                        hasCustomDesign: true,
                        pieceId: piece.pieceID,
                        updatedAt: new Date(),
                    },
                }
            );
        }

        return NextResponse.json({
            success: true,
            pieceID: piece.pieceID,
            designID: design.designID,
            message: 'Production piece spawned successfully',
        });

    } catch (error) {
        console.error('Error producing design request:', error);
        return NextResponse.json({ error: 'Failed to produce design request' }, { status: 500 });
    }
}
