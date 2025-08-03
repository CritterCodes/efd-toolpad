import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

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

    await db.connect();
    const collection = db._instance.collection('tasks');
    
    // Build query from filters
    const query = {};
    if (filters.searchQuery) {
      query.$or = [
        { title: { $regex: filters.searchQuery, $options: 'i' } },
        { description: { $regex: filters.searchQuery, $options: 'i' } }
      ];
    }
    
    const tasks = await collection.find(query).limit(filters.limit || 100).toArray();
    
    return NextResponse.json({ 
      success: true, 
      data: tasks,
      count: tasks.length 
    });
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/tasks/stats - Get statistics
export async function HEAD(request) {
  try {
    await db.connect();
    const collection = db._instance.collection('tasks');
    
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averagePrice: { $avg: '$basePrice' },
          categories: { $addToSet: '$category' }
        }
      }
    ]).toArray();
    
    return NextResponse.json({ 
      success: true, 
      data: stats[0] || { total: 0, averagePrice: 0, categories: [] }
    });
    
  } catch (error) {
    console.error('Error fetching tasks statistics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
