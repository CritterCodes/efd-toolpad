import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOps } from '@/lib/apiAuth';

// Includes admin/dev: in this shop the owner/admins also work the bench, get labor
// review + payroll, and must be assignable (e.g. assigning a split task to yourself).
const ASSIGNABLE_ARTISAN_QUERY = {
  role: { $in: ['artisan', 'senior-artisan', 'admin', 'dev'] },
  isApproved: { $ne: false },
  isActive: { $ne: false },
  status: { $nin: ['inactive', 'disabled', 'deleted'] },
};

export const GET = async () => {
  try {
    const { errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const dbInstance = await db.connect();
    const jewelers = await dbInstance.collection('users')
      .find(ASSIGNABLE_ARTISAN_QUERY)
      .project({
        _id: 0,
        userID: 1,
        firstName: 1,
        lastName: 1,
        name: 1,
        email: 1,
        role: 1,
        artisanTypes: 1,
      })
      .sort({ firstName: 1, lastName: 1, email: 1 })
      .toArray();

    return NextResponse.json(jewelers, { status: 200 });
  } catch (error) {
    console.error('Error fetching bench jewelers:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
