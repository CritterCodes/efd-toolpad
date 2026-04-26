class MaterialsService {
	normalizeMetalType(quality = '', description = '') {
		const source = `${quality} ${description}`.toUpperCase();

		if (source.includes('YELLOW')) return 'yellow_gold';
		if (source.includes('WHITE')) return 'white_gold';
		if (source.includes('ROSE')) return 'rose_gold';
		if (source.includes('PLAT')) return 'platinum';
		if (source.includes('STERLING') || source.includes('SILVER')) return 'sterling_silver';
		if (source.includes('FINE SILVER')) return 'fine_silver';

		return null;
	}

	extractKarat(quality = '', description = '') {
		const source = `${quality} ${description}`.toUpperCase();
		const karatMatch = source.match(/(10K|14K|18K|22K|24K|925|950|999)/);
		return karatMatch ? karatMatch[1] : '';
	}

	async request(url, options = {}) {
		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
				...(options.headers || {})
			},
			...options
		});

		const data = await response.json().catch(() => ({}));

		if (!response.ok) {
			throw new Error(data.error || data.details || `Request failed with status ${response.status}`);
		}

		return data;
	}

	async getMaterials(filters = {}) {
		const query = new URLSearchParams(
			Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
		);
		const suffix = query.toString() ? `?${query.toString()}` : '';
		const data = await this.request(`/api/materials${suffix}`, { method: 'GET' });
		return data.materials || [];
	}

	async createMaterial(materialData) {
		const payload = {
			...materialData,
			name: materialData.name || this.generatePreviewSku(materialData.displayName, materialData.category)
		};

		return this.request('/api/materials', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	}

	async updateMaterial(materialId, materialData) {
		const payload = {
			...materialData,
			name: materialData.name || this.generatePreviewSku(materialData.displayName, materialData.category)
		};

		return this.request(`/api/materials?id=${encodeURIComponent(materialId)}`, {
			method: 'PUT',
			body: JSON.stringify(payload)
		});
	}

	async deleteMaterial(materialId) {
		return this.request(`/api/materials?id=${encodeURIComponent(materialId)}`, {
			method: 'DELETE'
		});
	}

	async fetchStullerData(itemNumber) {
		const data = await this.request('/api/stuller/item', {
			method: 'POST',
			body: JSON.stringify({ itemNumber })
		});
		return data.data || data;
	}

	transformStullerToFormData(stullerData, existingData = {}) {
		const quality = stullerData?.metal?.quality || stullerData?.metal?.type || stullerData?.material || '';
		const description = stullerData?.description || '';
		const metalType = this.normalizeMetalType(quality, description);
		const compatibleMetals = metalType ? [metalType] : (existingData.compatibleMetals || []);

		return {
			...existingData,
			displayName: existingData.displayName || stullerData.description || '',
			description: existingData.description || stullerData.longDescription || stullerData.description || '',
			supplier: 'Stuller',
			unitCost: Number(stullerData.price || stullerData.showcasePrice || 0),
			karat: this.extractKarat(quality, description) || existingData.karat || '',
			compatibleMetals,
			stuller_item_number: stullerData.itemNumber || existingData.stuller_item_number || '',
			auto_update_pricing: true,
			last_price_update: new Date().toISOString()
		};
	}

	buildStullerProductData(stullerData, existingData = {}) {
		const qualityDisplay = stullerData?.metal?.type || stullerData?.material || stullerData?.description || '';
		const qualityCode = stullerData?.business?.qualityCatalogValue || stullerData?.metal?.quality || '';
		const description = stullerData?.description || existingData.description || 'Stuller Product';
		const unitOfSale = stullerData?.business?.unitOfSale || stullerData?.specifications?.['Unit of Sale']?.value || '';
		const dimensions = stullerData?.dimensions?.formatted || '';

		return {
			id: Date.now().toString(),
			stullerItemNumber: stullerData?.itemNumber || existingData.stullerItemNumber || '',
			stullerProductId: stullerData?.business?.id || null,
			metalType: this.normalizeMetalType(qualityDisplay, description) || existingData.metalType || null,
			karat: this.extractKarat(qualityDisplay, description) || existingData.karat || null,
			qualityCode: qualityCode || null,
			qualityDisplay: qualityDisplay || null,
			unitOfSale: unitOfSale || null,
			weight: Number(stullerData?.weight) || 0,
			weightUnitOfMeasure: stullerData?.weightUnit || null,
			gramWeight: Number(stullerData?.gramWeight) || 0,
			stullerPrice: Number(stullerData?.price || stullerData?.showcasePrice || 0),
			unitCost: Number(stullerData?.price || stullerData?.showcasePrice || 0),
			sku: '',
			description,
			dimensions,
			portionsPerUnit: Number(existingData.portionsPerUnit) || 1,
			addedAt: new Date().toISOString(),
			autoUpdatePricing: existingData.auto_update_pricing !== false
		};
	}

	calculateCostPerPortion(unitCost, portionsPerUnit) {
		const cost = Number(unitCost) || 0;
		const portions = Number(portionsPerUnit) || 0;

		if (portions <= 0) {
			return 0;
		}

		return Number((cost / portions).toFixed(4));
	}

	generatePreviewSku(displayName, category) {
		const categoryPrefix = String(category || 'material')
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 12);

		const nameSlug = String(displayName || '')
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 24);

		return [categoryPrefix, nameSlug].filter(Boolean).join('_') || 'MATERIAL';
	}
}

const materialsService = new MaterialsService();

export default materialsService;
