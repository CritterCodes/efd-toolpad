import { NextResponse } from 'next/server';
import RepairTasksDatabaseService from '@/services/repairTasksDatabase.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    
    if (!sku) {
      return NextResponse.json(
        { success: false, error: 'SKU parameter is required' },
        { status: 400 }
      );
    }
    
    const task = await RepairTasksDatabaseService.findBySku(sku);
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Repair task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: task 
    });
    
  } catch (error) {
    console.error('Error searching repair task by SKU:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
