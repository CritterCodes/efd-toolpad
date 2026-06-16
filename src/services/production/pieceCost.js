/**
 * Piece COGS roll-up (S4). A Piece's real cost = actual materials (at cost) +
 * accrued labor (from the labor logs on its work orders). Pure function so it can
 * be unit-tested; callers supply the piece's actualMaterials and its labor logs.
 */
function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * @param {{ actualMaterials?: Array<{unitCost?:number, qty?:number}>,
 *           laborLogs?: Array<{creditedValue?:number}> }} args
 * @returns {{ accruedMaterialCost:number, accruedLaborCost:number, totalCOGS:number }}
 */
export function computePieceCosts({ actualMaterials = [], laborLogs = [] } = {}) {
  const accruedMaterialCost = (actualMaterials || []).reduce(
    (sum, m) => sum + (Number(m.unitCost) || 0) * Math.max(Number(m.qty) || 1, 1),
    0
  );
  const accruedLaborCost = (laborLogs || []).reduce(
    (sum, l) => sum + (Number(l.creditedValue) || 0),
    0
  );
  return {
    accruedMaterialCost: round(accruedMaterialCost),
    accruedLaborCost: round(accruedLaborCost),
    totalCOGS: round(accruedMaterialCost + accruedLaborCost),
  };
}
