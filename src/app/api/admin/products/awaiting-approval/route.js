import { auth } from '@/lib/auth';
import Database from '@/lib/database';

export async function GET(req) {
  try {
    // Get session using NextAuth v5
    const session = await auth();

    // Check if user is admin
    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = new Database();
    const dbInstance = await db.connect();

    // Get products collection
    const productsCollection = dbInstance.collection('products');

    // Find all products with pending-approval status (submitted by artisans)
    const products = await productsCollection.find({
      status: 'pending-approval'
    })
    .sort({ submittedAt: -1 })
    .toArray();

    return Response.json({
      success: true,
      count: products.length,
      products: products || []
    });

  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
