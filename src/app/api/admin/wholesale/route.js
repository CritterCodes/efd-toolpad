import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/admin/wholesale - Get all wholesale applications with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const { db } = await connectToDatabase();
    
    // Build query to find users with wholesale applications
    let query = {
      role: { $in: ['wholesale-applicant', 'wholesaler'] },
      wholesaleApplication: { $exists: true }
    };
    
    // Filter by status if specified
    if (status) {
      query['wholesaleApplication.status'] = status;
    }
    
    const users = await db.collection('users')
      .find(query)
      .sort({ 'wholesaleApplication.submittedAt': -1 })
      .toArray();
    
    console.log(`Found ${users.length} wholesale applications`);
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching wholesale applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wholesale applications' },
      { status: 500 }
    );
  }
}
