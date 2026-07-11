export function computeMargin(salePrice, costBasis) {
    const sp = parseFloat(salePrice) || 0;
    const cb = parseFloat(costBasis) || 0;
    if (sp <= 0) return 0;
    return ((sp - cb) / sp) * 100;
}

export function computeSalePrice(costBasis, laborCost, markupPct) {
    const cb = parseFloat(costBasis) || 0;
    const lc = parseFloat(laborCost) || 0;
    const mp = parseFloat(markupPct) || 0;
    return (cb + lc) * (1 + mp / 100);
}

export function computeLaborCost(laborHours, laborRate) {
    const lh = parseFloat(laborHours) || 0;
    const lr = parseFloat(laborRate) || 0;
    return lh * lr;
}

export function clampMarkup(val) {
    const n = parseFloat(val) || 0;
    return Math.min(500, Math.max(0, n));
}
