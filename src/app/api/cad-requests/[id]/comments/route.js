import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
    try {
        console.log('💬 CAD Request Comment API called for ID:', params.id);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { comment, userId, userName } = body;

        if (!comment.trim()) {
            return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Find the gemstone with the CAD request
        const gemstone = await db.collection('products').findOne({
            'cadRequests._id': new ObjectId(params.id),
            productType: 'gemstone'
        });

        if (!gemstone) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        // Add the comment
        const newComment = {
            _id: new ObjectId(),
            comment: comment.trim(),
            userId,
            userName: userName || session.user.name,
            createdAt: new Date(),
            type: 'user_comment'
        };

        const result = await db.collection('products').updateOne(
            {
                'cadRequests._id': new ObjectId(params.id),
                productType: 'gemstone'
            },
            {
                $push: {
                    'cadRequests.$.comments': newComment
                },
                $set: {
                    'cadRequests.$.updatedAt': new Date()
                }
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
        }

        console.log('✅ Comment added by:', userName);

        return NextResponse.json({
            success: true,
            message: 'Comment added successfully',
            comment: newComment
        });

    } catch (error) {
        console.error('❌ CAD Request Comment API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request, { params }) {
    try {
        console.log('📖 CAD Request Comments Get API called for ID:', params.id);
        
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { db } = await connectToDatabase();

        // Find the gemstone with the CAD request
        const gemstone = await db.collection('products').findOne({
            'cadRequests._id': new ObjectId(params.id),
            productType: 'gemstone'
        });

        if (!gemstone) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        const cadRequest = gemstone.cadRequests.find(req => req._id.toString() === params.id);
        
        if (!cadRequest) {
            return NextResponse.json({ error: 'CAD request not found' }, { status: 404 });
        }

        const comments = cadRequest.comments || [];

        // Sort comments by creation date (newest first)
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log('✅ Retrieved comments:', comments.length);

        return NextResponse.json({
            comments
        });

    } catch (error) {
        console.error('❌ CAD Request Comments Get API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}