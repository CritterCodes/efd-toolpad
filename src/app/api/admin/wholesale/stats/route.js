import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/admin/wholesale/stats - Get wholesale application statistics
export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    
    // Get counts by status
    const pipeline = [
      {
        $match: {
          wholesaleApplication: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$wholesaleApplication.status',
          count: { $sum: 1 }
        }
      }
    ];
    
    const statusCounts = await db.collection('users').aggregate(pipeline).toArray();
    
    // Initialize stats
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    // Populate stats from aggregation results
    statusCounts.forEach(item => {
      const status = item._id;
      const count = item.count;
      
      stats.total += count;
      
      if (status === 'pending') {
        stats.pending = count;
      } else if (status === 'approved') {
        stats.approved = count;
      } else if (status === 'rejected') {
        stats.rejected = count;
      }
    });
    
    console.log('Wholesale stats:', stats);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching wholesale stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wholesale statistics' },
      { status: 500 }
    );
  }
}