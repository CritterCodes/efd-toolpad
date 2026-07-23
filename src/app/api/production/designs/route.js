import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import DropsModel from '@/app/api/drops/model';
import { isStaff, canCreateDesignCategory, designListFilter, sessionArtisanTypes } from '@/lib/designPermissions';
import { canViewDrop } from '@/lib/dropPermissions';

/** GET /api/production/designs — list designs (optional ?dropID=).
 *  Staff see everything; artisans see ONLY their own designs (primaryArtisanId). */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  if (!isStaff(session) && session.user.role !== 'artisan') {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dropID = searchParams.get('dropID');
  const scope = designListFilter(session);
  const designs = dropID ? await DesignsModel.findByDrop(dropID, scope) : await DesignsModel.list(scope);
  return NextResponse.json(designs, { status: 200 });
};

/** POST /api/production/designs — create a design. Artisan self-service (owner's matrix):
 *  gem cutters author gemstone designs; jewelers/engravers/CAD designers author jewelry.
 *  Artisan-created designs are always credited to (owned by) the artisan themselves. */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });

  if (!canCreateDesignCategory(session, body.category)) {
    const need = body.category === 'gemstone' ? 'gem cutters' : 'jewelers, engravers, or CAD designers';
    return NextResponse.json(
      { error: `Access denied — ${body.category === 'gemstone' ? 'gemstone' : 'jewelry'} designs can be created by ${need} (and staff). Your artisan types: ${sessionArtisanTypes(session).join(', ') || 'none'}.` },
      { status: 403 },
    );
  }

  // An artisan may only attach a design to a drop they own or collaborate on.
  if (!isStaff(session) && body.dropId) {
    const drop = await DropsModel.findById(body.dropId);
    if (!drop || !canViewDrop(session, drop)) {
      return NextResponse.json({ error: 'Access denied — you are not an owner or collaborator on that drop.' }, { status: 403 });
    }
  }

  const design = await DesignsModel.create({
    ...body,
    // Artisans always own what they create; staff may credit anyone.
    ...(isStaff(session) ? {} : { primaryArtisanId: session.user.userID || session.user.email }),
    createdBy: session.user.userID || session.user.email || '',
  });
  return NextResponse.json(design, { status: 201 });
};
