import { MongoClient, ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';

async function getBloggerDb() {
  if (!global._bloggerMongoClient) {
    global._bloggerMongoClient = new MongoClient(process.env.MONGODB_URI);
    await global._bloggerMongoClient.connect();
  }
  return global._bloggerMongoClient.db(process.env.BLOGGER_DB_NAME || process.env.MONGO_DB_NAME || 'efd-database');
}

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = await getBloggerDb();
    const draft = await db.collection('blog_posts').findOne({ _id: new ObjectId(id) });

    if (!draft) {
      return Response.json({ error: 'Draft not found' }, { status: 404 });
    }

    return Response.json({ draft: { ...draft, _id: draft._id.toString() } });
  } catch (err) {
    console.error('[blog-drafts] GET single error:', err.message);
    return Response.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}
