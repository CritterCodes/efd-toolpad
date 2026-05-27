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

// GET /api/admin/blogs — list all posts with optional ?status= filter
export async function GET(req) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const skip = (page - 1) * limit;

  try {
    const db = await getBloggerDb();
    const filter = status ? { status } : {};
    const [posts, total] = await Promise.all([
      db
        .collection('blog_posts')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          title: 1, slug: 1, status: 1, category: 1, wordCount: 1,
          readingTime: 1, createdAt: 1, publishedAt: 1, excerpt: 1,
          questionnaire: 1,
        })
        .toArray(),
      db.collection('blog_posts').countDocuments(filter),
    ]);

    const serialized = posts.map((p) => ({ ...p, _id: p._id.toString() }));
    return Response.json({ posts: serialized, total, page, limit });
  } catch (err) {
    console.error('[blogs] GET error:', err.message);
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
