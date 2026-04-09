import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import GemstoneService from "./service.js";

export default class GemstoneController {
  
  static async getGemstones(request) {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const gemstones = await GemstoneService.getGemstones(session.user);
      
      return NextResponse.json({ 
        success: true, 
        gemstones: gemstones || []
      });
    } catch (error) {
      console.error('GET /api/products/gemstones error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gemstones' },
        { status: 500 }
      );
    }
  }

  static async createGemstone(request) {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const data = await request.json();
      console.log('POST /api/products/gemstones - Received data:', data);

      const gemstone = await GemstoneService.createGemstone(data, session.user);
      
      return NextResponse.json({ 
        success: true, 
        gemstone,
        productId: gemstone.productId
      });
    } catch (error) {
      console.error('POST /api/products/gemstones error:', error);
      
      // Determine if it is a bad request vs internal error
      const status = error.message.includes('required') ? 400 : 500;
      
      return NextResponse.json(
        { error: 'Failed to create gemstone', details: error.message },
        { status }
      );
    }
  }

  static async updateGemstone(request) {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const data = await request.json();
      console.log('PUT /api/products/gemstones - Received data:', data);

      const gemstone = await GemstoneService.updateGemstone(data, session.user);
      
      return NextResponse.json({ 
        success: true, 
        gemstone
      });
    } catch (error) {
      console.error('PUT /api/products/gemstones error:', error);
      
      let status = 500;
      if (error.message.includes('required')) status = 400;
      if (error.message.includes('not found')) status = 404;

      return NextResponse.json(
        { error: 'Failed to update gemstone', details: error.message },
        { status }
      );
    }
  }

  static async deleteGemstone(request) {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      await GemstoneService.deleteGemstone(id);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Gemstone deleted successfully'
      });
    } catch (error) {
      console.error('DELETE /api/products/gemstones error:', error);
      
      let status = 500;
      if (error.message.includes('required')) status = 400;
      if (error.message.includes('not found')) status = 404;

      return NextResponse.json(
        { error: 'Failed to delete gemstone', details: error.message },
        { status }
      );
    }
  }
}
