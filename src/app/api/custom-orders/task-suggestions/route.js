import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getTaskSuggestions } from '@/services/customs/customTasks';

/** GET /api/custom-orders/task-suggestions?search= — labor-task autocomplete (repair catalog + custom history). */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { searchParams } = new URL(req.url);
  const suggestions = await getTaskSuggestions(searchParams.get('search') || '', 40);
  return NextResponse.json(suggestions, { status: 200 });
};
