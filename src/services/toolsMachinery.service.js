class ToolsMachineryService {
  constructor() {
    this.baseUrl = '/api/tools-machinery';
  }

  async getTools() {
    const response = await fetch(this.baseUrl);
    if (!response.ok) throw new Error('Failed to load tools and machinery');
    const data = await response.json();
    return data.tools || [];
  }

  async createTool(payload) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create tool or machinery');
    }
    const data = await response.json();
    return data.tool;
  }

  async updateTool(id, payload) {
    const response = await fetch(`${this.baseUrl}?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update tool or machinery');
    }
    return true;
  }

  async deleteTool(id) {
    const response = await fetch(`${this.baseUrl}?id=${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete tool or machinery');
    }
    return true;
  }
}

const toolsMachineryService = new ToolsMachineryService();
export default toolsMachineryService;
