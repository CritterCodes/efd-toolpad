import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { connectToDatabase } from '@/lib/mongodb';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

async function uploadImageToS3(imageUrl, folder = 'products') {
    try {
        // Skip if already an S3 URL
        if (!imageUrl || imageUrl.includes('amazonaws.com')) return imageUrl;

        // Check for credentials
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
            throw new Error('Missing AWS Credentials in environment variables');
        }

        // 1. Fetch image
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // 2. Generate Key
        const urlParts = imageUrl.split('/');
        let filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
        filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
        
        const timestamp = Date.now();
        const key = `${folder}/${timestamp}-${filename}`;

        // 3. Upload
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType
        });

        await s3Client.send(command);

        // 4. Return URL
        return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;

    } catch (error) {
        console.error(`Failed to upload image ${imageUrl} to S3:`, error);
        throw error; // Re-throw to be caught by the loop
    }
}

// --- Parsing Helpers ---

function parseMetals(text) {
    const metals = [];
    const lower = (text || '').toLowerCase();

    if (lower.includes('sterling silver') || lower.includes('925')) {
        metals.push({ type: 'Silver', purity: '925 Sterling', color: 'White' });
    }
    
    if (lower.includes('platinum')) {
        metals.push({ type: 'Platinum', purity: '950', color: 'White' });
    }

    // Gold parsing
    const goldMatches = text.match(/(\d{1,2})k\s*(yellow|white|rose)?\s*gold/gi);
    if (goldMatches) {
        goldMatches.forEach(match => {
            const mLower = match.toLowerCase();
            let color = 'Yellow';
            if (mLower.includes('white')) color = 'White';
            if (mLower.includes('rose')) color = 'Rose';
            
            let purity = '14k';
            if (mLower.includes('18k')) purity = '18k';
            if (mLower.includes('10k')) purity = '10k';
            
            // Avoid duplicates
            if (!metals.some(m => m.type === 'Gold' && m.purity === purity && m.color === color)) {
                metals.push({ type: 'Gold', purity, color });
            }
        });
    }
    
    // Fallback: if "gold" is mentioned but no karat, assume 14k Yellow if not specified
    if (metals.length === 0 && lower.includes('gold') && !lower.includes('plated') && !lower.includes('filled')) {
         // Check context for color
         let color = 'Yellow';
         if (lower.includes('white gold')) color = 'White';
         if (lower.includes('rose gold')) color = 'Rose';
         metals.push({ type: 'Gold', purity: '14k', color });
    }

    return metals;
}

function parseStones(text, variants) {
    const stones = [];
    const stoneTypes = [
        'Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Tanzanite', 'Opal', 'Garnet', 
        'Amethyst', 'Citrine', 'Peridot', 'Topaz', 'Iolite', 'Aquamarine', 'Morganite',
        'Tourmaline', 'Spinel', 'Zircon', 'Pearl', 'Turquoise', 'Moonstone'
    ];

    const lowerText = (text || '').toLowerCase();
    
    // Check variants first (often contain stone names)
    if (variants && Array.isArray(variants)) {
        variants.forEach(v => {
            const vTitle = v.title.toLowerCase();
            stoneTypes.forEach(type => {
                if (vTitle.includes(type.toLowerCase())) {
                    if (!stones.some(s => s.type === type)) {
                        stones.push({ type, count: 1, shape: 'Round' }); // Default shape
                    }
                }
            });
        });
    }

    // Check description
    stoneTypes.forEach(type => {
        if (lowerText.includes(type.toLowerCase())) {
             if (!stones.some(s => s.type === type)) {
                stones.push({ type, count: 1, shape: 'Round' });
            }
        }
    });

    return stones;
}

function parseGemstoneDetails(html) {
    const details = {};
    if (!html) return details;
    
    // Helper to extract value from <p>Key: Value</p>
    const extract = (key) => {
        const regex = new RegExp(`<p>\\s*${key}\\s*[:|-]\\s*([^<]+)<\\/p>`, 'i');
        const match = html.match(regex);
        return match ? match[1].trim() : null;
    };

    details.carat = extract('Weight');
    details.cut = extract('Shape/Cut') || extract('Shape') || extract('Cut');
    details.color = extract('Color');
    details.clarity = extract('Clarity');
    details.origin = extract('Origin');
    
    // Clean up carat (remove 'ct')
    if (details.carat) {
        const caratMatch = details.carat.match(/([\d.]+)/);
        if (caratMatch) {
            details.carat = parseFloat(caratMatch[1]);
        }
    }

    return details;
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse body for cursor
        let body = {};
        try {
            body = await request.json();
        } catch (e) {}
        const { cursor } = body;

        const { db } = await connectToDatabase();
        
        // 1. Get Shopify Config
        const adminSettings = await db.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' });
        if (!adminSettings?.shopify?.enabled) {
            return NextResponse.json({ error: 'Shopify integration not enabled' }, { status: 400 });
        }

        const { shopUrl, accessToken: rawToken, apiVersion } = adminSettings.shopify;
        let accessToken = rawToken;
        
        if (isDataEncrypted(rawToken)) {
            try {
                accessToken = decryptSensitiveData(rawToken);
            } catch (e) {
                console.warn('Failed to decrypt Shopify token, attempting to use as plain text:', e.message);
                accessToken = rawToken;
            }
        }

        if (!shopUrl || !accessToken) {
             return NextResponse.json({ error: 'Shopify configuration incomplete' }, { status: 400 });
        }

        const version = apiVersion || '2024-01';

        // 2. Find last migrated ID to support batching (prevent timeouts)
        let lastId = cursor;
        if (!lastId) {
            const lastProduct = await db.collection('products')
                .find({ shopifyId: { $exists: true } })
                .sort({ shopifyId: -1 })
                .limit(1)
                .toArray();
            lastId = lastProduct.length > 0 ? lastProduct[0].shopifyId : 0;
            console.log(`Resuming migration from DB max ID: ${lastId}`);
        } else {
            console.log(`Resuming migration from provided cursor: ${lastId}`);
        }

        // 3. Fetch BATCH of Products (Limit 10 to prevent Vercel 10s timeout)
        let allProducts = [];
        // Use since_id to skip already migrated items
        let url = `https://${shopUrl}/admin/api/${version}/products.json?limit=10&since_id=${lastId}`;
        
        console.log('Starting Shopify migration fetch...');

        // Only fetch ONE page per request to ensure we process and return quickly
        if (url) {
            const response = await fetch(url, {
                headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) throw new Error(`Shopify API error: ${response.statusText}`);
            
            const data = await response.json();
            allProducts = data.products;
        }

        console.log(`Fetched ${allProducts.length} products from Shopify.`);

        // 4. Process
        let stats = {
            jewelry: { new: 0, updated: 0 },
            gemstones: { new: 0, updated: 0 },
            skipped: 0,
            processed: allProducts.length,
            errors: [],
            logs: [] // Debug logs
        };

        for (const p of allProducts) {
            const type = (p.product_type || '').toLowerCase();
            const isJewelry = ['ring', 'earrings', 'necklace', 'bracelet', 'jewelry', 'pendant'].some(t => type.includes(t));
            const isGemstone = type.includes('gemstone');

            if (!isJewelry && !isGemstone) {
                stats.skipped++;
                continue;
            }

            // Common Fields
            const images = await Promise.all((p.images || []).map(async (img) => {
                try {
                    const s3Url = await uploadImageToS3(img.src, `products/${p.handle || 'misc'}`);
                    if (s3Url !== img.src) {
                        stats.logs.push(`Uploaded ${p.title} image to S3: ${s3Url}`);
                    } else {
                        stats.logs.push(`Skipped upload for ${p.title} (already S3 or invalid)`);
                    }
                    return {
                        id: img.id.toString(),
                        url: s3Url,
                        alt: img.alt || p.title,
                        position: img.position
                    };
                } catch (err) {
                    stats.errors.push(`Image upload failed for ${p.title} (${img.id}): ${err.message}`);
                    return {
                        id: img.id.toString(),
                        url: img.src, // Fallback to Shopify URL
                        alt: img.alt || p.title,
                        position: img.position
                    };
                }
            }));

            const prices = (p.variants || []).map(v => parseFloat(v.price));
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
            const priceDisplay = minPrice === maxPrice ? minPrice : `${minPrice} - ${maxPrice}`;

            let productData = {
                title: p.title,
                description: p.body_html,
                shopifyId: p.id.toString(),
                shopifyHandle: p.handle,
                tags: p.tags ? p.tags.split(',').map(t => t.trim()) : [],
                status: p.status,
                images: images,
                price: priceDisplay, // Legacy price field
                retailPrice: maxPrice, // New schema price
                updatedAt: new Date()
            };

            // --- JEWELRY MIGRATION ---
            if (isJewelry) {
                productData.productType = 'jewelry';
                productData.vendor = p.vendor; // Vendor is Artisan
                productData.userId = 'admin'; // Default owner
                
                // Parse Rich Data
                productData.metals = parseMetals(p.body_html + ' ' + p.title + ' ' + p.tags);
                const stones = parseStones(p.body_html + ' ' + p.title + ' ' + p.tags, p.variants);
                productData.centerStones = stones.length > 0 ? [stones[0]] : [];
                productData.accentStones = stones.length > 1 ? stones.slice(1) : [];

                // Upsert
                const existing = await db.collection('products').findOne({ shopifyId: p.id.toString() });
                if (existing) {
                    await db.collection('products').updateOne({ _id: existing._id }, { $set: productData });
                    stats.jewelry.updated++;
                } else {
                    productData.createdAt = new Date();
                    productData.productId = `jwl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
                    await db.collection('products').insertOne(productData);
                    stats.jewelry.new++;
                }
            }

            // --- GEMSTONE MIGRATION ---
            else if (isGemstone) {
                productData.productType = 'gemstone';
                productData.userId = 'admin'; // Critter owns them
                productData.supplier = p.vendor; // Vendor is Supplier/Source
                
                // Parse Rich Data
                const details = parseGemstoneDetails(p.body_html || '');
                
                productData.species = p.tags.includes('Emerald') ? 'Emerald' : 
                                      p.tags.includes('Sapphire') ? 'Sapphire' : 
                                      p.tags.includes('Ruby') ? 'Ruby' : 
                                      p.tags.includes('Diamond') ? 'Diamond' : 'Other'; // Basic fallback
                
                if (details.carat) productData.carat = details.carat;
                if (details.cut) productData.cut = details.cut;
                if (details.color) productData.color = details.color;
                if (details.clarity) productData.clarity = details.clarity;
                if (details.origin) productData.locale = details.origin;

                // Upsert
                const existing = await db.collection('products').findOne({ shopifyId: p.id.toString() });
                if (existing) {
                    await db.collection('products').updateOne({ _id: existing._id }, { $set: productData });
                    stats.gemstones.updated++;
                } else {
                    productData.createdAt = new Date();
                    productData.productId = `gem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
                    await db.collection('products').insertOne(productData);
                    stats.gemstones.new++;
                }
            }
        }

        // Determine the ID of the last item fetched, regardless of whether it was skipped or processed
        const lastFetchedProduct = allProducts.length > 0 ? allProducts[allProducts.length - 1] : null;
        const nextCursor = lastFetchedProduct ? lastFetchedProduct.id : null;

        return NextResponse.json({ success: true, stats, nextCursor });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
