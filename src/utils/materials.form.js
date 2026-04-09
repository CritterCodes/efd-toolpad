  
  const totalValue = materials.reduce((sum, material) => {
    return sum + (parseFloat(material.unitCost) || 0);
  }, 0);

  const categoryCounts = {};
  materials.forEach(material => {
    const category = material.category || 'unknown';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return {
    total: materials.length,
    active: activeCount,
    inactive: inactiveCount,
    totalValue: totalValue,
    averageValue: materials.length > 0 ? totalValue / materials.length : 0,
    categoryCounts
  };
};

export * from './materials.constants';
export * from './materials.form.jsx';
