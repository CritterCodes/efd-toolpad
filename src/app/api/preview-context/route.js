import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { PREVIEW_STATE_ID, readCatalogFixtureDigest } from '@/services/production/catalogFixtures';

export const dynamic = 'force-dynamic';

function previewDatabaseName() {
  const dbName = process.env.MONGO_DB_NAME || '';
  if (process.env.VERCEL_ENV !== 'preview' || !/^efd-preview-[a-z0-9][a-z0-9-]{0,79}$/.test(dbName)) {
    throw new Error('preview context is unavailable outside an isolated preview database');
  }
  return dbName;
}

export async function GET() {
  try {
    const databaseIdentity = previewDatabaseName();
    const database = await db.connect();
    const state = await database.collection('_previewFixtureState').findOne({ _id: PREVIEW_STATE_ID });
    if (!state) return NextResponse.json({ error: 'preview fixtures have not been seeded' }, { status: 503 });

    const fixtureDigest = await readCatalogFixtureDigest(database, 'preview');
    const writeProbe = await database.collection('_previewFixtureState').updateOne(
      { _id: PREVIEW_STATE_ID },
      { $set: { lastProbeAt: new Date() } },
    );

    return NextResponse.json({
      kind: 'preview',
      databaseIdentity,
      writable: writeProbe.matchedCount === 1,
      fixtureVersion: state.fixtureVersion,
      fixtureDigest,
      resetDigest: state.resetDigest,
      resetVerifiedAt: state.resetVerifiedAt,
      resetPath: state.resetPath,
      seededAt: state.seededAt,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
