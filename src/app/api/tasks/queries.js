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

  // WHERE A TASK IS OFFERED. `contexts` is an array of surfaces: 'repair' (repair intake) and/or
  // 'custom' (the custom quote builder). A task can be in both — stone setting is charged the same way
  // on a repair and on a custom — or in one only.
  //
  // 'custom' is STRICT opt-in: the quote builder should not be flooded with retipping and sizing, so a
  // task appears there only when it says so.
  //
  // 'repair' also matches UNTAGGED tasks. Every task in the catalog predates this field, and they are
  // all repair tasks; excluding them would empty the repair intake picker, which is the busiest screen
  // in the shop. Untagged therefore means "repair", and tagging a task 'custom' alone is what takes it
  // OUT of repairs — the only way to express a custom-only task.
  if (filters.context === 'repair') {
    query.$and = [
      ...(query.$and || []),
      { $or: [{ contexts: 'repair' }, { contexts: { $in: [null, []] } }, { contexts: { $exists: false } }] },
    ];
  } else if (filters.context) {
    query.contexts = filters.context;
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
