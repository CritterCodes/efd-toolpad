
export * from './pricing/labor-pricing';
export * from './pricing/materials-pricing';
export * from './pricing/tax-calculations';

const normalizeMetalType = (metalType = '') =>
	String(metalType).toLowerCase().replace(/[\s-]+/g, '_');

const normalizeKarat = (karat = '') =>
	String(karat).toLowerCase().replace(/\s+/g, '');

const buildPricingKeys = (metalType, karat) => {
	const metal = normalizeMetalType(metalType);
	const k = normalizeKarat(karat);

	if (!metal) {
		return [];
	}

	if (!k) {
		return [metal];
	}

	return [
		`${metal}_${k}`,
		`${metal} ${k}`,
		`${metal}-${k}`,
		`${metal}${k}`,
	];
};

const withBusinessMultiplier = (price, adminSettings) => {
	const numericPrice = Number(price || 0);
	if (!Number.isFinite(numericPrice)) {
		return 0;
	}

	const multiplier = Number(adminSettings?.businessMultiplier || 1);
	return numericPrice * (Number.isFinite(multiplier) ? multiplier : 1);
};

export const supportsMetalType = (item, metalType, karat) => {
	if (!item) {
		return false;
	}

	if (!metalType || item.isMetalDependent === false || item.isUniversal || item.supportsAllMetals) {
		return true;
	}

	const keys = buildPricingKeys(metalType, karat);

	if (item.universalPricing && typeof item.universalPricing === 'object') {
		return keys.some((key) => Object.prototype.hasOwnProperty.call(item.universalPricing, key));
	}

	const totalCost = item?.pricing?.totalCost;
	if (totalCost && typeof totalCost === 'object') {
		return keys.some((key) => Object.prototype.hasOwnProperty.call(totalCost, key));
	}

	if (Array.isArray(item.stullerProducts) || Array.isArray(item.sturllerProducts)) {
		const products = item.stullerProducts || item.sturllerProducts;
		return products.some((product) => {
			const productKeys = buildPricingKeys(product?.metalType, product?.karat);
			return productKeys.some((k) => keys.includes(k));
		});
	}

	return true;
};

export const getMetalSpecificPrice = (
	item,
	metalType,
	karat = null,
	isWholesale = false,
	adminSettings = null
) => {
	if (!item) {
		return 0;
	}

	const keys = buildPricingKeys(metalType, karat);

	if (typeof item.price === 'number') {
		return withBusinessMultiplier(item.price, adminSettings);
	}

	if (typeof item.processPrice === 'number') {
		return withBusinessMultiplier(item.processPrice, adminSettings);
	}

	if (item.universalPricing && typeof item.universalPricing === 'object') {
		const match = keys.find((key) => item.universalPricing[key]);
		const pricing = match ? item.universalPricing[match] : null;
		const base =
			pricing && typeof pricing === 'object'
				? Number(pricing.retailPrice ?? pricing.totalCost ?? 0)
				: Number(pricing || 0);

		if (base > 0) {
			const retailPrice = withBusinessMultiplier(base, adminSettings);
			return isWholesale ? retailPrice * 0.5 : retailPrice;
		}
	}

	const totalCost = item?.pricing?.totalCost;
	if (typeof totalCost === 'number') {
		const retailPrice = withBusinessMultiplier(totalCost, adminSettings);
		return isWholesale ? retailPrice * 0.5 : retailPrice;
	}
	if (totalCost && typeof totalCost === 'object') {
		const match = keys.find((key) => totalCost[key] != null);
		if (match) {
			const retailPrice = withBusinessMultiplier(totalCost[match], adminSettings);
			return isWholesale ? retailPrice * 0.5 : retailPrice;
		}
	}

	const products = item.stullerProducts || item.sturllerProducts;
	if (Array.isArray(products)) {
		const matchedProduct = products.find((product) => {
			const productKeys = buildPricingKeys(product?.metalType, product?.karat);
			return productKeys.some((k) => keys.includes(k));
		}) || products[0];

		if (matchedProduct) {
			const base = Number(matchedProduct.pricePerPortion ?? matchedProduct.markedUpPrice ?? 0);
			const retailPrice = withBusinessMultiplier(base, adminSettings);
			return isWholesale ? retailPrice * 0.5 : retailPrice;
		}
	}

	return 0;
};
