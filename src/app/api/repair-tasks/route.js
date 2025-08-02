import { NextResponse } from 'next/server';
import RepairTasksDatabaseService from '@/services/repairTasksDatabase.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {};
    
    // Extract filters from query parameters
    if (searchParams.get('sku')) filters.sku = searchParams.get('sku');
    if (searchParams.get('title')) filters.title = searchParams.get('title');
    if (searchParams.get('vendor')) filters.vendor = searchParams.get('vendor');
    if (searchParams.get('status')) filters.status = searchParams.get('status');
    if (searchParams.get('searchQuery')) filters.searchQuery = searchParams.get('searchQuery');
    if (searchParams.get('priceMin')) filters.priceMin = parseFloat(searchParams.get('priceMin'));
    if (searchParams.get('priceMax')) filters.priceMax = parseFloat(searchParams.get('priceMax'));
    if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit'));
    
    // Handle tags array
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags').split(',').map(tag => tag.trim());
    }
    
    const tasks = await RepairTasksDatabaseService.fetchAll(filters);
    
    return NextResponse.json({ 
      success: true, 
      data: tasks,
      count: tasks.length 
    });
    
  } catch (error) {
    console.error('Error fetching repair tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/repair-tasks/stats - Get statistics
export async function HEAD(request) {
  try {
    const stats = await RepairTasksDatabaseService.getStatistics();
    
    return NextResponse.json({ 
      success: true, 
      data: stats 
    });
    
  } catch (error) {
    console.error('Error fetching repair tasks statistics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}