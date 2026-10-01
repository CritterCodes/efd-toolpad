import { requireRole } from '@/lib/apiAuth';
import { listIntakeLogs } from '@/services/ai/smartIntakeLog';

/** Admin → Smart intake log (OPEN-QUESTIONS Q13): what was typed, what the AI said, what the ticket became. */
export async function GET(request) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const data = await listIntakeLogs({
      kind: searchParams.get('kind') || '',
      surface: searchParams.get('surface') || '',
      limit: searchParams.get('limit') || 200,
    });
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/smart-intake-logs error:', error);
    return Response.json({ success: false, error: 'Failed to load the smart intake log' }, { status: 500 });
  }
}
