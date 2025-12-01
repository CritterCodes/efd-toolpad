import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { migrateProductsToNewStatusModel } from '@/lib/migrations/migrateToNewStatusModel';

/**
 * POST /api/admin/migrate/products-status
 * 
 * Migrate all products from old status model to new model
 * Only accessible by admins
 * 
 * Old model: status with values like 'pending-approval', 'approved', etc.
 * New model: status (draft/published/archived) + isApproved (true/false)
 */
export async function POST(req) {
  try {
    const session = await auth();
    
    // Only admins can run migrations
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    console.log(`🔄 Admin ${session.user.email} initiated product status migration`);

    const result = await migrateProductsToNewStatusModel();

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      result
    });

  } catch (error) {
    console.error('Migration endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate/products-status
 * 
 * Check migration status - see how many products need migration
 */
export async function GET(req) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { db } = await import('@/lib/database.js');
    const database = await db.connect();
    const productsCollection = database.collection('products');

    // Count products by model
    const withNewModel = await productsCollection.countDocuments({
      isApproved: { $exists: true }
    });

    const withOldModel = await productsCollection.countDocuments({
      isApproved: { $exists: false }
    });

    const total = await productsCollection.countDocuments({});

    return NextResponse.json({
      success: true,
      migrationStatus: {
        total,
        alreadyMigrated: withNewModel,
        needsMigration: withOldModel,
        percentComplete: Math.round((withNewModel / total) * 100)
      }
    });

  } catch (error) {
    console.error('Migration status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
