import { NextResponse } from 'next/server';
import { ToolMachineryService } from './service.js';

export default class ToolMachineryController {
  static async getTools(req) {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (id) {
        const result = await ToolMachineryService.getById(id);
        return NextResponse.json(result);
      }

      const result = await ToolMachineryService.getAll(Object.fromEntries(searchParams));
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: error.message || 'Failed to fetch tools and machinery' }, { status: 500 });
    }
  }

  static async createTool(req) {
    try {
      const body = await req.json();
      const result = await ToolMachineryService.create(body);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error.message || 'Failed to create tool or machinery' }, { status: 400 });
    }
  }

  static async updateTool(req) {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'Tool id is required' }, { status: 400 });
      }

      const body = await req.json();
      const result = await ToolMachineryService.update(id, body);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: error.message || 'Failed to update tool or machinery' }, { status: 400 });
    }
  }

  static async deleteTool(req) {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'Tool id is required' }, { status: 400 });
      }

      const result = await ToolMachineryService.remove(id);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: error.message || 'Failed to delete tool or machinery' }, { status: 400 });
    }
  }
}
