// Helper function to calculate pricing for different metals
export function calculatePricingForMetal(metalType, printVolume) {
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
        metalType: metalType,
        breakdown: {
            printVolume: printVolume,
            density: density,
            metalType: metalType
        }
    };
}
