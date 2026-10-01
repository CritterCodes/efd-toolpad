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

  // Every condition goes into $and — the search and the metal filter each used to SET `query.$or`, so
  // whichever came last silently replaced the other (EFD-DEFECTS P25).
  const and = [];
  const escape = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (filters.search) {
    const search = { $regex: escape(filters.search), $options: 'i' };
    and.push({ $or: [
      { title: search },
      { description: search },
      { sku: search },
      { 'processes.displayName': search }
    ] });
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
    and.push({ $or: [{ contexts: 'repair' }, { contexts: { $in: [null, []] } }, { contexts: { $exists: false } }] });
  } else if (filters.context) {
    query.contexts = filters.context;
  }

  // OFFERED FOR A METAL: unrestricted tasks, or tasks restricted to that metal. This read a STORED
  // per-metal price map (`pricing.totalCosts`) — prices aren't stored any more, so it matched nothing.
  if (filters.metalType && !['all', 'mixed'].includes(filters.metalType)) {
    and.push({ $or: [
      { metals: { $exists: false } },
      { metals: { $size: 0 } },
      { metals: { $regex: escape(filters.metalType), $options: 'i' } }
    ] });
  }

  if (filters.isActive !== undefined && filters.isActive !== '') {
    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    } else {
      query.isActive = filters.isActive === 'true';
    }
    console.log('🔥 MODEL - Active filter applied:', { filterValue: filters.isActive, queryValue: query.isActive });
  }

  // No price filters: prices are calculated on read and never stored (services/pricing/engine.js),
  // so there is nothing in the database to filter on.

  if (and.length) query.$and = and;

  console.log('🔥 MODEL - Final query built:', query);
  return query;
}
