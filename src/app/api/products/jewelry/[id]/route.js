import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const { id } = await params;

        let jewelry = await db.collection('products').findOne({
            productId: id,
            productType: 'jewelry'
        });

        if (!jewelry) {
            if (ObjectId.isValid(id)) {
                jewelry = await db.collection('products').findOne({
                    _id: new ObjectId(id),
                    productType: 'jewelry'
                });
                
                if (jewelry && !jewelry.productId) {
                    const productId = `jwl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
                    await db.collection('products').updateOne(
                        { _id: jewelry._id },
                        { $set: { productId: productId } }
                    );
                    jewelry.productId = productId;
                }
            }
        }

        if (!jewelry) {
            return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
        }

        const userIdentifier = session.user.userID || session.user.email;
        const hasPermission = 
            jewelry.userId === userIdentifier ||
            jewelry.userId === session.user.email ||
            jewelry.userId === session.user.userID ||
            session.user.role === 'admin';

        if (!hasPermission) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            jewelry
        });

    } catch (error) {
        console.error(`GET /api/products/jewelry/[id] error:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch jewelry' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const { id } = await params;
        const data = await request.json();

        let existingJewelry = await db.collection('products').findOne({
            productId: id,
            productType: 'jewelry'
        });

        let searchCriteria = { productId: id };

        if (!existingJewelry && ObjectId.isValid(id)) {
            existingJewelry = await db.collection('products').findOne({
                _id: new ObjectId(id),
                productType: 'jewelry'
            });
            searchCriteria = { _id: new ObjectId(id) };
        }

        if (!existingJewelry) {
            return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
        }

        const userIdentifier = session.user.userID || session.user.email;
        const hasPermission = 
            existingJewelry.userId === userIdentifier ||
            existingJewelry.userId === session.user.email ||
            existingJewelry.userId === session.user.userID ||
            session.user.role === 'admin';

        if (!hasPermission) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { 
            title, 
            description,
            notes,
            type,
            material,
            purity,
            weight,
            size,
            price,
            status,
            images,
            customMounting,
            vendor,
            ...otherData
        } = data;

        const updateData = {
            title: title || existingJewelry.title,
            description: description || existingJewelry.description,
            notes: notes || existingJewelry.notes,
            status: status || existingJewelry.status,
            vendor: vendor || existingJewelry.vendor,
            updatedAt: new Date(),
            images: images || existingJewelry.images,
            price: parseFloat(price) || existingJewelry.price,
            
            jewelry: {
                ...existingJewelry.jewelry,
                type: type || existingJewelry.jewelry?.type,
                material: material || existingJewelry.jewelry?.material,
                purity: purity || existingJewelry.jewelry?.purity,
                weight: weight || existingJewelry.jewelry?.weight,
                size: size || existingJewelry.jewelry?.size,
                customMounting: customMounting !== undefined ? customMounting : existingJewelry.jewelry?.customMounting,
                ...otherData
            }
        };

        await db.collection('products').updateOne(
            searchCriteria,
            { $set: updateData }
        );

        return NextResponse.json({ success: true, productId: existingJewelry.productId || id });

    } catch (error) {
        console.error(`PUT /api/products/jewelry/[id] error:`, error);
        return NextResponse.json(
            { error: 'Failed to update jewelry' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const { id } = await params;

        let searchCriteria = { productId: id, productType: 'jewelry' };
        let jewelry = await db.collection('products').findOne(searchCriteria);

        if (!jewelry && ObjectId.isValid(id)) {
            searchCriteria = { _id: new ObjectId(id), productType: 'jewelry' };
            jewelry = await db.collection('products').findOne(searchCriteria);
        }

        if (!jewelry) {
            return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
        }

        const userIdentifier = session.user.userID || session.user.email;
        const hasPermission = 
            jewelry.userId === userIdentifier ||
            jewelry.userId === session.user.email ||
            jewelry.userId === session.user.userID ||
            session.user.role === 'admin';

        if (!hasPermission) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        await db.collection('products').deleteOne(searchCriteria);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error(`DELETE /api/products/jewelry/[id] error:`, error);
        return NextResponse.json(
            { error: 'Failed to delete jewelry' },
            { status: 500 }
        );
    }
}
