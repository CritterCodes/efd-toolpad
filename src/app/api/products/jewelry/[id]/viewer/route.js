import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadFileToS3 } from '../../../../../../utils/s3.util';

/**
 * GET  /api/products/jewelry/[id]/viewer
 * Returns just the viewer config for a product.
 *
 * PATCH /api/products/jewelry/[id]/viewer
 * Updates the viewer config (JSON body with the viewer object).
 * Accepted fields mirror the MongoDB viewer schema:
 *   { glbUrl, scale, centerModel, camera, meshMap, environment, background }
 *
 * POST /api/products/jewelry/[id]/viewer (multipart/form-data)
 * Uploads a GLB file to S3 and saves the URL on the product.
 * Form fields:
 *   glb  — the GLB file (required)
 */

async function resolveProduct(db, id) {
    let product = await db.collection('products').findOne({ productId: id, productType: 'jewelry' })
    if (!product && ObjectId.isValid(id)) {
        product = await db.collection('products').findOne({ _id: new ObjectId(id), productType: 'jewelry' })
    }
    return product
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const { db } = await connectToDatabase()
        const { id }  = await params
        const product = await resolveProduct(db, id)

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, viewer: product.viewer ?? null })
    } catch (error) {
        console.error('GET viewer error:', error)
        return NextResponse.json({ error: 'Failed to fetch viewer config' }, { status: 500 })
    }
}

// ── PATCH — save viewer config JSON ──────────────────────────────────────────
export async function PATCH(request, { params }) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const { db } = await connectToDatabase()
        const { id }  = await params
        const product = await resolveProduct(db, id)

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role)
        const isOwner =
            product.userId === session.user.userID ||
            product.userId === session.user.email
        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const body = await request.json()

        // Sanitise: only accept known viewer fields
        const viewer = {
            glbUrl:      body.glbUrl      ?? product.viewer?.glbUrl ?? null,
            scale:       body.scale       ?? product.viewer?.scale  ?? 50,
            centerModel: body.centerModel ?? product.viewer?.centerModel ?? false,
            camera: {
                position:  body.camera?.position  ?? product.viewer?.camera?.position ?? [0, 0.05, 2.8],
                fov:       body.camera?.fov       ?? product.viewer?.camera?.fov      ?? 36,
            },
            meshMap:     Array.isArray(body.meshMap) ? body.meshMap : (product.viewer?.meshMap ?? []),
            environment: body.environment ?? product.viewer?.environment ?? 'city',
            background:  body.background  ?? product.viewer?.background  ?? '#080808',
        }

        const criteria = product.productId
            ? { productId: product.productId }
            : { _id: product._id }

        await db.collection('products').updateOne(criteria, {
            $set: { viewer, updatedAt: new Date() },
        })

        return NextResponse.json({ success: true, viewer })
    } catch (error) {
        console.error('PATCH viewer error:', error)
        return NextResponse.json({ error: 'Failed to save viewer config' }, { status: 500 })
    }
}

// ── POST — upload GLB to S3 ───────────────────────────────────────────────────
export async function POST(request, { params }) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const { db } = await connectToDatabase()
        const { id }  = await params
        const product = await resolveProduct(db, id)

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role)
        const isOwner =
            product.userId === session.user.userID ||
            product.userId === session.user.email
        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const formData = await request.formData()
        const glbFile  = formData.get('glb')

        if (!glbFile || glbFile.size === 0) {
            return NextResponse.json({ error: 'No GLB file provided' }, { status: 400 })
        }

        if (!glbFile.name.toLowerCase().endsWith('.glb')) {
            return NextResponse.json({ error: 'File must be a .glb file' }, { status: 400 })
        }

        // Upload to S3 under admin/products/glb/<productId>/
        const productId = product.productId || id
        const glbUrl    = await uploadFileToS3(
            glbFile,
            `admin/products/glb/${productId}`,
            'model-'
        )

        // Save glbUrl on product.viewer (merge with existing config if any)
        const existingViewer = product.viewer ?? {}
        const criteria = product.productId
            ? { productId: product.productId }
            : { _id: product._id }

        await db.collection('products').updateOne(criteria, {
            $set: {
                'viewer.glbUrl': glbUrl,
                'viewer.scale':  existingViewer.scale  ?? 50,
                'viewer.meshMap': existingViewer.meshMap ?? [],
                updatedAt: new Date(),
            },
        })

        return NextResponse.json({ success: true, glbUrl })
    } catch (error) {
        console.error('POST viewer GLB upload error:', error)
        return NextResponse.json({ error: 'Failed to upload GLB' }, { status: 500 })
    }
}
