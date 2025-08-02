import { NextResponse } from 'next/server';
import RepairTasksDatabaseService from '@/services/repairTasksDatabase.service';

export async function GET(request) {
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
