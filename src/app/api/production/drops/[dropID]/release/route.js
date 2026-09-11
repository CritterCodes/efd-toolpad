import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { preflightDrop, releaseDrop } from '@/services/production/dropRelease';

/**
 * GET /api/production/drops/[dropID]/release — preflight: what would release, and what is
 * blocking the rest (per design, with the fix). Read-only.
 */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'superadmin', 'dev', 'staff']);
  if (errorResponse) return errorResponse;

  const { dropID } = await params;
  const report = await preflightDrop(dropID);
  if (report.error) return NextResponse.json(report, { status: 404 });
  return NextResponse.json(report, { status: 200 });
};

/**
 * POST /api/production/drops/[dropID]/release — release the drop for real: publish every
 * eligible design's listing (making it visible to the shop) and mark the drop released.
 *
 * Releasing is EFD's call, never the artisan's (dropPermissions keeps status off the
 * artisan patch surface), so this is staff-only.
 * Body: { dryRun?, force? }
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'superadmin', 'dev', 'staff']);
  if (errorResponse) return errorResponse;

  const { dropID } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await releaseDrop(dropID, {
    dryRun: body.dryRun === true,
    force: body.force === true,
    releasedBy: session.user.userID || session.user.email || null,
  });

  // A refused release is a 409 with the blocking reasons — never a 200 that reads as success
  // while the shop stays empty (which is exactly how the status dropdown used to behave).
  if (!result.ok) return NextResponse.json(result, { status: result.error === 'Drop not found.' ? 404 : 409 });
  return NextResponse.json(result, { status: 200 });
};
