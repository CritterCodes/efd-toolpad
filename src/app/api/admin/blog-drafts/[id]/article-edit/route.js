import { auth } from '@/lib/auth';

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  let instruction;
  try {
    const body = await req.json();
    instruction = body.instruction;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!instruction?.trim()) {
    return Response.json({ error: 'instruction is required' }, { status: 400 });
  }

  const bloggerUrl = process.env.BLOGGER_API_URL || 'http://localhost:3003';
  const bloggerSecret = process.env.BLOGGER_API_SECRET;

  try {
    const res = await fetch(`${bloggerUrl}/api/drafts/${id}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bloggerSecret ? { Authorization: `Bearer ${bloggerSecret}` } : {}),
      },
      body: JSON.stringify({ instruction }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      return Response.json({ error: err.error || 'Edit failed' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ ok: true, content: data.content });
  } catch (err) {
    console.error('[article-edit] error:', err.message);
    return Response.json({ error: 'Could not reach blogger service' }, { status: 503 });
  }
}
