import { getServerSession } from 'next-auth/next';
import { connectDB } from '@/lib/mongodb';
import authOptions from '@/app/api/auth/[...nextauth]/options';
import Product from '@/models/Product';

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role === 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = params;
    const { cogData, selectedMetals, metalPrices, markCompleted } = await req.json();

    await connectDB();

    // Build update object
    const updateObj = {
      'cadRequests.$.cogData': {
        configurations: cogData,
        selectedMetals: selectedMetals,
        metalPrices: metalPrices,
        savedAt: new Date(),
        savedBy: session.user.userID
      }
    };

    // If marking completed, update status and set completedAt
    if (markCompleted) {
      updateObj['cadRequests.$.status'] = 'completed';
      updateObj['cadRequests.$.completedAt'] = new Date();
    }

    // Find the CAD request and save COG data
    const product = await Product.findOneAndUpdate(
      { 'cadRequests._id': id },
      { $set: updateObj },
      { new: true, runValidators: false }
    );

    if (!product) {
      return Response.json({ error: 'CAD Request not found' }, { status: 404 });
    }

    console.log('✅ COG data saved successfully for CAD request:', id, markCompleted ? '(marked completed)' : '');

    return Response.json({
      success: true,
      message: markCompleted ? 'COG data saved and CAD request marked as completed' : 'COG data saved successfully',
      cadRequest: product.cadRequests.find(cr => cr._id.toString() === id)
    });

  } catch (error) {
    console.error('❌ COG save error:', error);
    return Response.json(
      { error: error.message || 'Failed to save COG data' },
      { status: 500 }
    );
  }
}
