import { auth } from '@/lib/auth';

export async function POST(req) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const bloggerUrl = process.env.BLOGGER_API_URL || 'http://localhost:3003';
  const bloggerSecret = process.env.BLOGGER_API_SECRET;

  let topicHint;
  try {
    const body = await req.json().catch(() => ({}));
    topicHint = body.topicHint || null;
  } catch {
    topicHint = null;
  }

  try {
    const res = await fetch(`${bloggerUrl}/api/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bloggerSecret ? { Authorization: `Bearer ${bloggerSecret}` } : {}),
      },
      body: JSON.stringify({ topicHint }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      return Response.json({ error: err.error || 'Trigger failed' }, { status: res.status });
    }

    return Response.json({ ok: true, message: 'Pipeline started' });
  } catch (err) {
    console.error('[trigger] error:', err.message);
    return Response.json({ error: 'Could not reach blogger service' }, { status: 503 });
  }
}
