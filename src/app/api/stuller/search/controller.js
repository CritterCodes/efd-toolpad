import { NextResponse } from 'next/server';
import StullerSearchService from './service.js';

export default class StullerSearchController {
  static async searchItems(request) {
    try {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q');

      if (!query) {
        return NextResponse.json(
          { error: 'Search query (q) is required' },
          { status: 400 }
        );
      }

      console.log(`[StullerSearchController] Searching for: ${query}`);
      
      const results = await StullerSearchService.searchProducts(query);

      if (query) {
        console.log('[StullerSearchController] Search summary:', {
          query,
          count: results.length,
          firstFiveSkus: results.slice(0, 5).map((item) => item.itemNumber)
        });
      }

      return NextResponse.json({
        success: true,
        count: results.length,
        results
      });
    } catch (error) {
      console.error('[StullerSearchController] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to search Stuller' },
        { status: error.status || 500 }
      );
    }
  }
}
