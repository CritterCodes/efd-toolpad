import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const designs = await db.collection('products').find({ 
            productType: 'cad-design' 
        }).toArray();

        return NextResponse.json({ 
            success: true, 
            designs: designs || []
        });
    } catch (error) {
        console.error('GET /api/products/cad-designs error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch CAD designs' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
        
        const design = {
            productType: 'cad-design',
            name,
            client: client || '',
            type,
            software: software || '',
            status: status || 'Draft',
            description: description || '',
            progress: status === 'Approved' ? 100 : 0,
            createdBy: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('products').insertOne(design);
        
        return NextResponse.json({ 
            success: true, 
            design: { ...design, _id: result.insertedId }
        });
    } catch (error) {
        console.error('POST /api/products/cad-designs error:', error);
        return NextResponse.json(
            { error: 'Failed to create CAD design' },
            { status: 500 }
        );
    }
}