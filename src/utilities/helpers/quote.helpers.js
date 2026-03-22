/**
 * Calculate comprehensive analytics for a custom ticket quote
 */
export const calculateAnalyticMetrics = (data, settings) => {
  if (!settings) return { 
    totalMaterialsRevenue: 0, laborRevenue: 0, customDesignFee: 0, totalShippingCost: 0, rushUpcharge: 0, total: 0, 
    totalMaterialsAtCost: 0, totalLaborCost: 0, cog: 0, profit: 0, jewelerPayout: 0, cadDesignerPayout: 0, commissionPayout: 0,
    materialProfit: 0, netProfit: 0, grossMargin: 0
  };

  // Material costs at cost (COG component)
  const centerstoneAtCost = parseFloat(data.centerstone?.cost) || 0;
  const accentStonesAtCost = (data.accentStones || []).reduce((sum, stone) => sum + ((parseFloat(stone.cost) || 0) * (parseFloat(stone.quantity) || 1)), 0);
  const mountingAtCost = parseFloat(data.mounting?.cost) || 0;
  const additionalMaterialsAtCost = (data.additionalMaterials || []).reduce((sum, mat) => sum + ((parseFloat(mat.cost) || 0) * (parseFloat(mat.quantity) || 1)), 0);
  const totalMaterialsAtCost = centerstoneAtCost + accentStonesAtCost + mountingAtCost + additionalMaterialsAtCost;

  // Material revenue (with markup)
  const materialMarkup = settings.materialMarkupPercentage || 1.0; // Default to 100% markup
  const totalMaterialsRevenue = totalMaterialsAtCost * (1 + materialMarkup);
  const materialProfit = totalMaterialsRevenue - totalMaterialsAtCost;

  // Labor costs from tasks
  const laborTasks = data.laborTasks || [];
  const totalLaborCost = laborTasks.reduce((sum, task) => {
    const taskCost = (parseFloat(task.cost) || 0) * (parseFloat(task.quantity) || 1);
    return sum + taskCost;
  }, 0);
  const laborRevenue = totalLaborCost; // Labor is charged at cost, profit comes from materials

  // Custom design fee
  const customDesignFee = data.includeCustomDesign ? (parseFloat(settings.customDesignFee) || 100.00) : 0;

  // Shipping costs
  const shippingCosts = data.shippingCosts || [];
  const totalShippingCost = shippingCosts.reduce((sum, shipping) => {
    const shippingCost = (parseFloat(shipping.cost) || 0);
    return sum + shippingCost;
  }, 0);

  // Rush multiplier
  const rushMultiplier = data.isRush ? (parseFloat(settings.rushMultiplier) || 1.5) : 1;
  const rushUpcharge = data.isRush ? ((totalMaterialsRevenue + laborRevenue) * (rushMultiplier - 1)) : 0;

  // Calculate totals
  const subtotal = totalMaterialsRevenue + laborRevenue + customDesignFee + totalShippingCost + rushUpcharge;
  const total = subtotal;

  // Analytics breakdown
  const cog = totalMaterialsAtCost + totalLaborCost + customDesignFee + totalShippingCost; // Cost of goods: materials + labor + design + shipping
  const profit = materialProfit + rushUpcharge; // Profit from material markup + rush upcharge
  const jewelerPayout = totalLaborCost; // Jeweler gets paid for labor
  const cadDesignerPayout = customDesignFee; // CAD designer gets the custom design fee
  const commissionPayout = profit * (parseFloat(settings.commissionPercentage) || 0.10); // Commission on PROFIT only

  return {
    // Revenue breakdown
    totalMaterialsRevenue,
    laborRevenue,
    customDesignFee,
    totalShippingCost,
    rushUpcharge,
    total,

    // Cost breakdown
    totalMaterialsAtCost,
    totalLaborCost,

    // Analytics
    cog,
    profit,
    jewelerPayout,
    cadDesignerPayout,
    commissionPayout,

    // Additional metrics
    materialProfit,
    netProfit: total - cog - commissionPayout, // Total revenue minus all costs and commission
    grossMargin: total > 0 ? ((total - cog) / total * 100) : 0
  };
};