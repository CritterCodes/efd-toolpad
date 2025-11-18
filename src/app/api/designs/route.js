import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request) {
    try {
        const session = await auth();
        
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const gemstoneId = searchParams.get('gemstoneId');
        const productType = searchParams.get('productType') || 'gemstone';

        // For now, return mock designs that are compatible with different gemstone characteristics
        // This can later be replaced with actual database queries for designs

        let mockDesigns = [
            {
                id: 'design-solitaire-classic',
                name: 'Classic Solitaire',
                type: 'Ring',
                category: 'engagement',
                description: 'Timeless solitaire setting showcasing the gemstone beautifully',
                minCaratWeight: 0.5,
                maxCaratWeight: 10.0,
                suitableShapes: ['round', 'oval', 'cushion', 'princess', 'emerald'],
                metalOptions: ['14k-gold', '18k-gold', 'platinum'],
                price: 850,
                productionTime: '2-3 weeks',
                image: '/images/designs/classic-solitaire.jpg',
                thumbnail: '/images/designs/thumbs/classic-solitaire-thumb.jpg',
                compatible: true
            },
            {
                id: 'design-vintage-halo',
                name: 'Vintage Halo',
                type: 'Ring',
                category: 'vintage',
                description: 'Ornate vintage-inspired halo setting with intricate milgrain details',
                minCaratWeight: 0.75,
                maxCaratWeight: 5.0,
                suitableShapes: ['round', 'oval', 'cushion', 'pear'],
                metalOptions: ['14k-gold', '18k-gold', 'platinum'],
                price: 1250,
                productionTime: '3-4 weeks',
                image: '/images/designs/vintage-halo.jpg',
                thumbnail: '/images/designs/thumbs/vintage-halo-thumb.jpg',
                compatible: true
            },
            {
                id: 'design-modern-tension',
                name: 'Modern Tension',
                type: 'Ring',
                category: 'modern',
                description: 'Contemporary tension setting for a floating gemstone effect',
                minCaratWeight: 1.0,
                maxCaratWeight: 3.0,
                suitableShapes: ['round', 'oval', 'princess'],
                metalOptions: ['titanium', 'platinum', '18k-gold'],
                price: 1100,
                productionTime: '4-5 weeks',
                image: '/images/designs/modern-tension.jpg',
                thumbnail: '/images/designs/thumbs/modern-tension-thumb.jpg',
                compatible: false // Will be determined by gemstone characteristics
            },
            {
                id: 'design-three-stone',
                name: 'Three Stone Classic',
                type: 'Ring',
                category: 'engagement',
                description: 'Classic three-stone setting with center focus',
                minCaratWeight: 0.5,
                maxCaratWeight: 8.0,
                suitableShapes: ['round', 'oval', 'emerald', 'princess'],
                metalOptions: ['14k-gold', '18k-gold', 'platinum'],
                price: 1400,
                productionTime: '3-4 weeks',
                image: '/images/designs/three-stone.jpg',
                thumbnail: '/images/designs/thumbs/three-stone-thumb.jpg',
                compatible: true
            },
            {
                id: 'design-bezel-modern',
                name: 'Modern Bezel',
                type: 'Ring',
                category: 'modern',
                description: 'Sleek bezel setting offering protection and modern aesthetics',
                minCaratWeight: 0.25,
                maxCaratWeight: 5.0,
                suitableShapes: ['round', 'oval', 'cushion', 'emerald', 'princess'],
                metalOptions: ['14k-gold', '18k-gold', 'platinum', 'titanium'],
                price: 950,
                productionTime: '2-3 weeks',
                image: '/images/designs/modern-bezel.jpg',
                thumbnail: '/images/designs/thumbs/modern-bezel-thumb.jpg',
                compatible: true
            }
        ];

        // If gemstoneId is provided, filter designs based on compatibility
        if (gemstoneId && productType === 'gemstone') {
            // Here you would normally fetch the gemstone details and filter based on:
            // - Carat weight
            // - Shape/cut
            // - Hardness
            // - Special considerations

            // For now, just mark some as compatible/incompatible based on mock rules
            mockDesigns = mockDesigns.map(design => {
                // Example logic: tension settings only work with harder stones > 1 carat
                if (design.id === 'design-modern-tension') {
                    design.compatible = Math.random() > 0.5; // Random for demo
                    design.incompatibilityReason = design.compatible ? null : 'Requires gemstone > 1 carat for structural integrity';
                }
                return design;
            });
        }

        return NextResponse.json({
            success: true,
            designs: mockDesigns,
            total: mockDesigns.length,
            filters: {
                categories: ['engagement', 'vintage', 'modern'],
                types: ['Ring', 'Pendant', 'Earrings'],
                metalOptions: ['14k-gold', '18k-gold', 'platinum', 'titanium']
            }
        });

    } catch (error) {
        console.error('Designs API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch designs' }, 
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const data = await request.json();
        const { 
            title, 
            notes, 
            estimatedLabor, 
            estimatedVolume, 
            STL, 
            GLB, 
            gemstoneId, 
            requestId, 
            designerUserId 
        } = data;

        if (!title || !STL || !gemstoneId) {
            return NextResponse.json(
                { error: 'Title, STL file, and gemstone ID are required' }, 
                { status: 400 }
            );
        }

        const { connectToDatabase } = await import('@/lib/mongodb');
        const { ObjectId } = await import('mongodb');
        const { db } = await connectToDatabase();

        // Create design record
        const design = {
            title,
            notes: notes || '',
            volume: estimatedVolume || 0,
            labor: estimatedLabor || 0,
            STL,
            GLB: GLB || null,
            gemstoneId,
            requestId: requestId ? new ObjectId(requestId) : null,
            designerUserId: designerUserId || session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('designs').insertOne(design);

        // Update the gemstone with the design reference
        await db.collection('products').updateOne(
            { productId: gemstoneId },
            { 
                $set: { 
                    hasCustomDesign: true,
                    customDesignId: result.insertedId,
                    updatedAt: new Date()
                } 
            }
        );

        return NextResponse.json({
            success: true,
            designId: result.insertedId,
            message: 'Design saved successfully'
        });

    } catch (error) {
        console.error('Error saving design:', error);
        return NextResponse.json(
            { error: 'Failed to save design' }, 
            { status: 500 }
        );
    }
}