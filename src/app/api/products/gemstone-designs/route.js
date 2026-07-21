import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import DesignsModel from '@/app/api/designs/model';
import { getUserArtisanTypes, canManageGemstones } from '@/lib/productPermissions';
import { buildGemstoneDesignSpec } from '@/services/production/gemstoneDesign';

const isStaff = (role) => ['admin', 'staff', 'dev'].includes(role);

/**
 * GET /api/products/gemstone-designs — list gemstone Designs (category:'gemstone').
 * Staff see all; a gem-cutter sees their own (primaryArtisanId).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const filter = { category: 'gemstone' };
  if (!isStaff(session.user.role)) {
    filter.primaryArtisanId = session.user.userID || session.user.email;
  }
  const designs = await DesignsModel.list(filter);
  return NextResponse.json({ success: true, designs });
}

/**
 * POST /api/products/gemstone-designs — author a gemstone Design (replaces the old
 * products/gemstone listing create). Gem-cutters + staff only.
 */
export async function POST(req) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  // Permission: gem-cutters (by artisanType) or staff.
  let artisanTypes = [];
  if (!isStaff(session.user.role)) {
    const database = await db.connect();
    const profile = await database.collection('users').findOne({ email: session.user.email });
    artisanTypes = getUserArtisanTypes(profile);
  }
  if (!canManageGemstones(session.user.role, artisanTypes)) {
    return NextResponse.json({ error: 'Only gem-cutters and admins can create gemstone designs' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const spec = buildGemstoneDesignSpec({
      ...body,
      primaryArtisanId: body.primaryArtisanId || session.user.userID || session.user.email,
    });
    const cost = spec._cost;
    delete spec._cost; // informational only; not part of the Design doc
    const design = await DesignsModel.create({ ...spec, createdBy: session.user.email });
    return NextResponse.json({ success: true, design, cost }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to create gemstone design' }, { status: 400 });
  }
}
