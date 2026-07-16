import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { resetCatalogFixtures } from '@/services/production/catalogFixtures';

export async function POST(request) {
  const dbName = process.env.MONGO_DB_NAME || '';
  const expectedToken = process.env.PREVIEW_RESET_TOKEN;
  const suppliedToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (process.env.VERCEL_ENV !== 'preview' || !/^efd-preview-[a-z0-9][a-z0-9-]{0,79}$/.test(dbName)) {
    return NextResponse.json({ error: 'preview reset is unavailable' }, { status: 404 });
  }
  if (!expectedToken || suppliedToken !== expectedToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await resetCatalogFixtures(await db.connect(), 'preview');
  return NextResponse.json({ databaseIdentity: dbName, ...result });
}
