class MaterialsService {
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
		const qualityUpper = String(quality).toUpperCase();
		const compatibleMetals = [];

		if (qualityUpper.includes('YELLOW')) compatibleMetals.push('yellow_gold');
		if (qualityUpper.includes('WHITE')) compatibleMetals.push('white_gold');
		if (qualityUpper.includes('ROSE')) compatibleMetals.push('rose_gold');
		if (qualityUpper.includes('SILVER')) compatibleMetals.push('sterling_silver');
		if (qualityUpper.includes('PLAT')) compatibleMetals.push('platinum');

		const karatMatch = qualityUpper.match(/(10K|14K|18K|22K|24K|925|950|999)/);

		return {
			...existingData,
			displayName: existingData.displayName || stullerData.description || '',
			description: existingData.description || stullerData.longDescription || stullerData.description || '',
			supplier: 'Stuller',
			unitCost: Number(stullerData.price || stullerData.showcasePrice || 0),
			karat: karatMatch ? karatMatch[1] : existingData.karat || '',
			compatibleMetals: compatibleMetals.length > 0 ? compatibleMetals : (existingData.compatibleMetals || []),
			stuller_item_number: stullerData.itemNumber || existingData.stuller_item_number || '',
			auto_update_pricing: true,
			last_price_update: new Date().toISOString()
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