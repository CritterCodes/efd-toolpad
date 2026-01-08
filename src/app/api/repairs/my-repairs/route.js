import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import RepairsService from '../service';

export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For wholesalers, only return repairs they created
    // For admins, they can see all repairs (but this endpoint is specifically for "my repairs")
    const userEmail = session.user.email;
    
    // Get status filter from query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    
    // Get repairs created by this user, with optional status filtering
    const repairs = await RepairsService.getRepairsByCreatorAndStatus(userEmail, statusFilter);
    
    return NextResponse.json({ 
      success: true, 
      repairs: repairs || [] 
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching user repairs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch repairs',
      details: error.message 
    }, { status: 500 });
  }
}