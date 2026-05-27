import { auth } from '@/lib/auth';

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  const bloggerUrl = process.env.BLOGGER_API_URL || 'http://localhost:3003';
  const bloggerSecret = process.env.BLOGGER_API_SECRET;

  try {
    const res = await fetch(`${bloggerUrl}/api/drafts/${id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bloggerSecret ? { Authorization: `Bearer ${bloggerSecret}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      return Response.json({ error: err.error || 'Publish failed' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ ok: true, slug: data.slug });
  } catch (err) {
    console.error('[blog-drafts] publish error:', err.message);
    return Response.json({ error: 'Could not reach blogger service' }, { status: 503 });
  }
}
