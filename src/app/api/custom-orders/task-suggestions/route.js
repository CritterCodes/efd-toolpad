import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getTaskSuggestions } from '@/services/customs/customTasks';

/** GET /api/custom-orders/task-suggestions?search=&context= — labor-task autocomplete
 * (repair catalog + custom history). `context` (e.g. 'custom') scopes the repair catalog
 * to tasks tagged with that context, so the quote builder hides non-custom noise. */
export const GET = async (req) => {
  // Read-only task-catalog suggestions — artisans use them for design labor lines.
  const { errorResponse } = await requireRole(['admin', 'dev', 'staff', 'artisan']);
  if (errorResponse) return errorResponse;
  const { searchParams } = new URL(req.url);
  const suggestions = await getTaskSuggestions(searchParams.get('search') || '', 40, searchParams.get('context') || null);
  return NextResponse.json(suggestions, { status: 200 });
};
