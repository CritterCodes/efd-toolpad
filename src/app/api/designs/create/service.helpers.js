import { ObjectId } from 'mongodb';

/**
 * Validates the extracted IDs from the form data
 */
export function validateDesignRequestIds(cadRequestId, gemstoneId) {
    if (!cadRequestId) {
        return { error: 'CAD Request ID is required', status: 400 };
    }
    if (!gemstoneId) {
        return { error: 'Gemstone ID is required', status: 400 };
    }
    return null;
}

/**
 * Builds the initial design data object
 */
export function buildDesignData(formData, user, cadRequestId) {
    return {
        _id: new ObjectId(),
        title: formData.get('title'),
        description: formData.get('description'),
        printVolume: parseFloat(formData.get('printVolume')) || 0,
        estimatedTime: parseFloat(formData.get('estimatedTime')) || 0,
        notes: formData.get('notes') || '',
        status: 'pending_approval',
        designerId: user.userID,
        designerName: user.name,
        designerEmail: user.email,
        cadRequestId: cadRequestId, // Store as string (custom ID format)
        createdAt: new Date(),
        updatedAt: new Date(),
        files: {}
    };
}

/**
 * Calculates pricing based on metal type and print volume
 */
export function calculateDesignPricing(metalType, printVolume) {
    const basePrices = {
        '14k_gold': 60.0,  // per gram
        '18k_gold': 70.0,
        'sterling_silver': 0.80,
        'platinum': 90.0,
        'palladium': 65.0
    };

    const densities = {
        '14k_gold': 13.0,    // g/cm³
        '18k_gold': 15.5,
        'sterling_silver': 10.4,
        'platinum': 21.5,
        'palladium': 12.0
    };

    const basePrice = basePrices[metalType] || basePrices['sterling_silver'];
    const density = densities[metalType] || densities['sterling_silver'];
    
    // Convert print volume (cm³) to grams
    const estimatedWeight = printVolume * density;
    const materialCost = estimatedWeight * basePrice;
    
    // Add design fee and markup
    const designFee = 150.0; // Base design fee
    const markup = 1.4; // 40% markup
    
    const totalCost = (materialCost + designFee) * markup;

    return {
        materialCost: Math.round(materialCost * 100) / 100,
        designFee: designFee,
        markup: markup,
        totalCost: Math.round(totalCost * 100) / 100,
        estimatedWeight: Math.round(estimatedWeight * 100) / 100,
        pricePerGram: basePrice,
        breakdown: {
            printVolume: printVolume,
            density: density,
            metalType: metalType
        }
    };
}

/**
 * Returns available metal options with default highlighted
 */
export function getMetalOptions(primaryMetal) {
    const allMetals = {
        '14k_gold': { name: '14K Gold', available: true },
        '18k_gold': { name: '18K Gold', available: true },
        'sterling_silver': { name: 'Sterling Silver', available: true },
        'platinum': { name: 'Platinum', available: true },
        'palladium': { name: 'Palladium', available: true }
    };

    // Mark the primary metal as the default
    if (allMetals[primaryMetal]) {
        allMetals[primaryMetal].default = true;
    }

    return allMetals;
}

/**
 * Builds the standalone design product object for the shop
 */
export function buildDesignProduct(designData, gemstone, mountingType, metalType, user) {
    return {
        _id: new ObjectId(),
        productId: `design_${designData._id.toString()}`,
        productType: 'design',
        title: designData.title,
        description: designData.description,
        category: 'Custom Designs',
        subcategory: mountingType,
        designData: {
            ...designData,
            forGemstone: {
                productId: gemstone.productId,
                title: gemstone.title,
                species: gemstone.gemstone?.species,
                subspecies: gemstone.gemstone?.subspecies,
                carat: gemstone.gemstone?.carat
            }
        },
        pricing: designData.pricing,
        metalOptions: getMetalOptions(metalType),
        status: 'active',
        userId: user.userID,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEcommerceReady: true,
        tags: ['custom-design', 'cad-design', mountingType.toLowerCase()]
    };
}
