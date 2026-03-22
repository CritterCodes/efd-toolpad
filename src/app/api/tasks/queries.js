export function formatMetalKey(metalType, karat) {
  const metalTypeMap = {
    'yellow_gold': 'Yellow Gold',
    'white_gold': 'White Gold',
    'rose_gold': 'Rose Gold',
    'sterling_silver': 'Sterling Silver'
  };

  const formattedMetal = metalTypeMap[metalType] || metalType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `${formattedMetal} ${karat}`;
}

export function buildQuery(filters) {
  const query = {};

  console.log('🔥 MODEL - buildQuery called with filters:', filters);

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { sku: { $regex: filters.search, $options: 'i' } },
      { 'processes.displayName': { $regex: filters.search, $options: 'i' } }
    ];
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.metalType && filters.metalType !== 'all') {
    query.$or = [
      { metalType: filters.metalType },
      { [`pricing.totalCosts.${formatMetalKey(filters.metalType, '14K')}`]: { $exists: true } }
    ];
  }

  if (filters.hasUniversalPricing !== undefined) {
    if (filters.hasUniversalPricing === true || filters.hasUniversalPricing === 'true') {
      query['pricing.totalCosts'] = { $exists: true };
    } else {
      query['pricing.totalCosts'] = { $exists: false };
    }
  }

  if (filters.isActive !== undefined && filters.isActive !== '') {
    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    } else {
      query.isActive = filters.isActive === 'true';
    }
    console.log('🔥 MODEL - Active filter applied:', { filterValue: filters.isActive, queryValue: query.isActive });
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    const priceFilter = {};
    if (filters.priceMin !== undefined) priceFilter.$gte = parseFloat(filters.priceMin);
    if (filters.priceMax !== undefined) priceFilter.$lte = parseFloat(filters.priceMax);

    query.$or = [
      { price: priceFilter },
      { basePrice: priceFilter }
    ];

    if (filters.metalType && filters.karat) {
      const metalKey = formatMetalKey(filters.metalType, filters.karat);
      query.$or.push({ [`pricing.totalCosts.${metalKey}`]: priceFilter });
    }
  }

  console.log('🔥 MODEL - Final query built:', query);
  return query;
}
