import { MongoClient } from 'mongodb';
import { auth } from '@/lib/auth';

async function getBloggerDb() {
  if (!global._bloggerMongoClient) {
    global._bloggerMongoClient = new MongoClient(process.env.MONGODB_URI);
    await global._bloggerMongoClient.connect();
  }
  return global._bloggerMongoClient.db(process.env.BLOGGER_DB_NAME || 'efd-database-DEV');
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const db = await getBloggerDb();
    const drafts = await db
      .collection('blog_posts')
      .find({ status: 'pending_review' })
      .project({ _id: 1, title: 1, slug: 1, excerpt: 1, category: 1, wordCount: 1, readingTime: 1, createdAt: 1, questionnaire: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json({ drafts: drafts.map((d) => ({ ...d, _id: d._id.toString() })) });
  } catch (err) {
    console.error('[blog-drafts] GET error:', err.message);
    return Response.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}
