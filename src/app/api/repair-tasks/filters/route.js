import { NextResponse } from 'next/server';
import RepairTasksDatabaseService from '@/services/repairTasksDatabase.service';

export async function GET(request) {
  try {
    const [tags, vendors] = await Promise.all([
      RepairTasksDatabaseService.getTags(),
      RepairTasksDatabaseService.getVendors()
    ]);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        tags,
        vendors
      }
    });
    
  } catch (error) {
    console.error('Error fetching repair tasks filters:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
