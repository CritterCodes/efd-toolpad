import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import DesignsModel, { validateDesign, DESIGN_STATUS } from '@/app/api/designs/model';
import { getUserArtisanTypes, canManageGemstones } from '@/lib/productPermissions';
import { buildGemstoneDesignSpec } from '@/services/production/gemstoneDesign';

const isStaff = (role) => ['admin', 'staff', 'dev'].includes(role);

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design || design.category !== 'gemstone') return NextResponse.json({ error: 'Gemstone design not found' }, { status: 404 });
  return NextResponse.json({ success: true, design });
}

/** PUT — edit a gemstone Design. Preserves the edition production counters + the variant's identity. */
export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { designID } = await params;
  const existing = await DesignsModel.findById(designID);
  if (!existing || existing.category !== 'gemstone') return NextResponse.json({ error: 'Gemstone design not found' }, { status: 404 });

  // Permission: staff, or the gem-cutter who owns it.
  let artisanTypes = [];
  if (!isStaff(session.user.role)) {
    const database = await db.connect();
    const profile = await database.collection('users').findOne({ email: session.user.email });
    artisanTypes = getUserArtisanTypes(profile);
    const ownsIt = existing.primaryArtisanId && [session.user.userID, session.user.email].includes(existing.primaryArtisanId);
    if (!ownsIt || !canManageGemstones(session.user.role, artisanTypes)) {
      return NextResponse.json({ error: 'Not allowed to edit this gemstone design' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  try {
    const prevVariant = existing.variants?.[0] || {};
    const spec = buildGemstoneDesignSpec({
      ...body,
      variantId: prevVariant.variantId,       // keep the variant identity stable
      sku: prevVariant.sku,
      status: body.status && Object.values(DESIGN_STATUS).includes(body.status) ? body.status : existing.status,
    });
    delete spec._cost;
    // Preserve the live edition production counters (allocated/committed/nextNumber); only the
    // type/limit are editable here.
    spec.edition = {
      ...spec.edition,
      allocated: existing.edition?.allocated ?? 0,
      committed: existing.edition?.committed ?? 0,
      nextNumber: existing.edition?.nextNumber ?? 1,
    };
    const merged = { ...existing, ...spec };
    const validation = validateDesign(merged);
    if (!validation.valid) return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });

    const design = await DesignsModel.updateById(designID, spec);
    return NextResponse.json({ success: true, design });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update gemstone design' }, { status: 400 });
  }
}

/** DELETE — remove a gemstone Design. Refused once any piece has been produced/committed. */
export async function DELETE(_req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { designID } = await params;
  const existing = await DesignsModel.findById(designID);
  if (!existing || existing.category !== 'gemstone') return NextResponse.json({ error: 'Gemstone design not found' }, { status: 404 });

  if (!isStaff(session.user.role)) {
    const database = await db.connect();
    const profile = await database.collection('users').findOne({ email: session.user.email });
    const artisanTypes = getUserArtisanTypes(profile);
    const ownsIt = existing.primaryArtisanId && [session.user.userID, session.user.email].includes(existing.primaryArtisanId);
    if (!ownsIt || !canManageGemstones(session.user.role, artisanTypes)) {
      return NextResponse.json({ error: 'Not allowed to delete this gemstone design' }, { status: 403 });
    }
  }
  if ((existing.edition?.allocated || 0) > 0 || (existing.edition?.committed || 0) > 0) {
    return NextResponse.json({ error: 'Cannot delete — this gemstone has produced/committed pieces' }, { status: 409 });
  }
  const deleted = await DesignsModel.deleteById(designID);
  return NextResponse.json({ success: deleted }, { status: deleted ? 200 : 404 });
}
