import { ToolMachineryModel } from './model.js';
import { usersOfTool, InUseError } from '@/services/catalog/catalogUsage';

export class ToolMachineryService {
  static normalizePayload(payload = {}) {
    const purchasePrice = Number(payload.purchasePrice || 0);
    const expectedUses = Number(payload.expectedUses || 0);
    const suppliedCostPerUse = Number(payload.costPerUse || 0);

    // A cost per use someone TYPED (costPerUseOverride) wins; otherwise it's purchase price ÷ expected
    // uses. It used to be recalculated whenever expected uses was set, silently replacing an override
    // (EFD-DEFECTS P25).
    const override = payload.costPerUseOverride === true && suppliedCostPerUse > 0;
    const computedCostPerUse = override
      ? suppliedCostPerUse
      : expectedUses > 0 ? purchasePrice / expectedUses : suppliedCostPerUse;

    return {
      name: String(payload.name || '').trim(),
      category: String(payload.category || 'machinery').trim().toLowerCase(),
      purchasePrice: purchasePrice > 0 ? purchasePrice : 0,
      expectedUses: expectedUses > 0 ? expectedUses : 0,
      costPerUse: computedCostPerUse > 0 ? Number(computedCostPerUse.toFixed(4)) : 0,
      costPerUseOverride: override,
      notes: String(payload.notes || '').trim(),
      isActive: payload.isActive !== false
    };
  }

  static validatePayload(data = {}) {
    if (!data.name) {
      throw new Error('Tool or machinery name is required');
    }
    if (data.purchasePrice < 0) {
      throw new Error('Purchase price cannot be negative');
    }
    if (data.expectedUses < 0) {
      throw new Error('Expected uses cannot be negative');
    }
    if (data.costPerUse < 0) {
      throw new Error('Cost per use cannot be negative');
    }
    if (data.costPerUse === 0 && data.purchasePrice > 0 && data.expectedUses === 0) {
      throw new Error('Provide expected uses or set a cost per use');
    }
  }

  static async getAll(filters = {}) {
    const query = {};
    if (filters.active !== undefined) {
      query.isActive = filters.active === 'true' || filters.active === true;
    }
    if (filters.category) {
      query.category = String(filters.category).toLowerCase();
    }
    const tools = await ToolMachineryModel.findAll(query);
    return { success: true, tools: tools || [] };
  }

  static async getById(id) {
    const tool = await ToolMachineryModel.findById(id);
    if (!tool) throw new Error('Tool or machinery not found');
    return { success: true, tool };
  }

  static async create(payload) {
    const normalized = this.normalizePayload(payload);
    this.validatePayload(normalized);

    const duplicate = await ToolMachineryModel.findByName(normalized.name);
    if (duplicate) throw new Error('A tool or machinery item with this name already exists');

    const result = await ToolMachineryModel.create(normalized);
    return { success: true, tool: result.tool, insertedId: result.insertedId };
  }

  static async update(id, payload) {
    const normalized = this.normalizePayload(payload);
    this.validatePayload(normalized);

    const existing = await ToolMachineryModel.findById(id);
    if (!existing) throw new Error('Tool or machinery not found');

    const duplicate = await ToolMachineryModel.findByName(normalized.name, id);
    if (duplicate) throw new Error('A tool or machinery item with this name already exists');

    await ToolMachineryModel.updateById(id, normalized);
    return { success: true };
  }

  // ARCHIVE, never delete, and never while an active task uses it (EFD-DEFECTS P21).
  static async remove(id) {
    const existing = await ToolMachineryModel.findById(id);
    if (!existing) throw new Error('Tool or machinery not found');
    const users = await usersOfTool(id);
    if (users.length) throw new InUseError(`"${existing.name || 'This tool'}"`, users);
    await ToolMachineryModel.updateById(id, { isActive: false, archivedAt: new Date() });
    return { success: true, archived: true };
  }
}
