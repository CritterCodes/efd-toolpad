import { auth } from '@/lib/auth';

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  let answers;
  try {
    const body = await req.json();
    answers = body.answers;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!answers?.length) {
    return Response.json({ error: 'answers array is required' }, { status: 400 });
  }

  const bloggerUrl = process.env.BLOGGER_API_URL || 'http://localhost:3003';
  const bloggerSecret = process.env.BLOGGER_API_SECRET;

  try {
    const res = await fetch(`${bloggerUrl}/api/drafts/${id}/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bloggerSecret ? { Authorization: `Bearer ${bloggerSecret}` } : {}),
      },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      return Response.json({ error: err.error || 'Enrichment failed' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ ok: true, slug: data.slug });
  } catch (err) {
    console.error('[blog-drafts] submit error:', err.message);
    return Response.json({ error: 'Could not reach blogger service — is it running?' }, { status: 503 });
  }
}
