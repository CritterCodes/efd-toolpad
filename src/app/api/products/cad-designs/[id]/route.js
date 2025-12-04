import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const data = await request.json();
        const { name, client, type, software, status, description } = data;

        // Validate required fields
        if (!name || !type) {
            return NextResponse.json(
                { error: 'Name and type are required' },
                { status: 400 }
            );
        }

        const { db } = await connectToDatabase();
        
        const updateData = {
            name,
            client: client || '',
            type,
            software: software || '',
            status: status || 'Draft',
            description: description || '',
            progress: status === 'Approved' ? 100 : (status === 'In Review' ? 75 : 25),
            updatedAt: new Date()
        };

        const result = await db.collection('products').updateOne(
            { _id: new ObjectId(id), productType: 'cad-design' },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'CAD design not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: 'CAD design updated successfully'
        });
    } catch (error) {
        console.error('PUT /api/products/cad-designs/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to update CAD design' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { db } = await connectToDatabase();

        const result = await db.collection('products').deleteOne(
            { _id: new ObjectId(id), productType: 'cad-design' }
        );

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: 'CAD design not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: 'CAD design deleted successfully'
        });
    } catch (error) {
        console.error('DELETE /api/products/cad-designs/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete CAD design' },
            { status: 500 }
        );
    }
}

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { db } = await connectToDatabase();

        const design = await db.collection('products').findOne(
            { _id: new ObjectId(id), productType: 'cad-design' }
        );

        if (!design) {
            return NextResponse.json(
                { error: 'CAD design not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            design
        });
    } catch (error) {
        console.error('GET /api/products/cad-designs/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch CAD design' },
            { status: 500 }
        );
    }
}