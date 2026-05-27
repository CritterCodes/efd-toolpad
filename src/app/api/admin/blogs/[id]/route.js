import { MongoClient, ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';

async function getBloggerDb() {
  if (!global._bloggerMongoClient) {
    global._bloggerMongoClient = new MongoClient(process.env.MONGODB_URI);
    await global._bloggerMongoClient.connect();
  }
  return global._bloggerMongoClient.db(
    process.env.BLOGGER_DB_NAME || process.env.MONGO_DB_NAME || 'efd-database'
  );
}

// GET /api/admin/blogs/:id — full post (includes enrichedContent)
export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = await getBloggerDb();
    const post = await db.collection('blog_posts').findOne({ _id: new ObjectId(id) });
    if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ post: { ...post, _id: post._id.toString() } });
  } catch (err) {
    console.error('[blogs] GET single error:', err.message);
    return Response.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PATCH /api/admin/blogs/:id — update editable fields (title, excerpt, metaTitle, metaDescription, enrichedContent, content)
export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  const ALLOWED_FIELDS = ['title', 'excerpt', 'metaTitle', 'metaDescription', 'enrichedContent', 'content', 'category', 'tags'];

  try {
    const body = await req.json();
    const update = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) update[key] = body[key];
    }
    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    update.updatedAt = new Date();

    const db = await getBloggerDb();
    await db.collection('blog_posts').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[blogs] PATCH error:', err.message);
    return Response.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/admin/blogs/:id — delete post
export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = await getBloggerDb();
    const result = await db.collection('blog_posts').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[blogs] DELETE error:', err.message);
    return Response.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
