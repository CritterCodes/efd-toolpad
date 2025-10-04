import { NextResponse } from 'next/server';
import { 
  getAllArtisanApplications, 
  getArtisanApplicationStats,
  searchArtisanApplications 
} from '../../../lib/artisanService.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const searchTerm = searchParams.get('search');
    
    // Get statistics
    if (action === 'stats') {
      const stats = await getArtisanApplicationStats();
      return NextResponse.json({ success: true, data: stats });
    }
    
    // Search applications
    if (searchTerm) {
      const filters = {
        status: searchParams.get('status'),
        artisanType: searchParams.get('artisanType')
      };
      
      const applications = await searchArtisanApplications(searchTerm, filters);
      return NextResponse.json({ success: true, data: applications });
    }
    
    // Get all applications with filters
    const filters = {};
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status');
    }
    if (searchParams.get('artisanType')) {
      filters.artisanType = searchParams.get('artisanType');
    }
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom');
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo');
    }
    
    const applications = await getAllArtisanApplications(filters);
    
    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error in artisan applications API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch artisan applications' },
      { status: 500 }
    );
  }
}