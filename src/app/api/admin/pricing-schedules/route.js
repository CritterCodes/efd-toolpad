import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import {
  PRICE_JOBS, FREQUENCIES, SCHEDULES_DOC_ID,
  getSchedules, getPriceJobRuns, normalizeSchedule,
} from '@/services/cron/priceSchedules';

/**
 * GET/PUT /api/admin/pricing-schedules — the owner's schedule panel (owner:
 * "I want all schedules in settings"). Each pricing cron fires hourly on
 * Vercel; these settings decide when each actually runs.
 *
 * Saved with per-job dot-path $set — never a whole-document replace — so a
 * concurrent edit to one job can't erase another (the subdoc-replace trap).
 */
export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  try {
    const [schedules, runs] = await Promise.all([getSchedules(), getPriceJobRuns()]);
    const jobs = Object.fromEntries(Object.entries(PRICE_JOBS).map(([key, meta]) => [key, {
      label: meta.label,
      description: meta.description,
      schedule: schedules[key],
      lastRun: runs[key] || null,
    }]));
    return NextResponse.json({ success: true, frequencies: FREQUENCIES, jobs });
  } catch (error) {
    console.error('GET /api/admin/pricing-schedules error:', error);
    return NextResponse.json({ error: 'Could not load schedules.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  try {
    const body = await request.json().catch(() => ({}));
    const jobs = body?.jobs || {};
    const $set = { updatedAt: new Date(), updatedBy: session.user.email || session.user.userID || '' };
    let touched = 0;
    for (const [key, raw] of Object.entries(jobs)) {
      if (!PRICE_JOBS[key]) continue; // unknown job names never land in the doc
      $set[`jobs.${key}`] = normalizeSchedule(raw, key);
      touched += 1;
    }
    if (!touched) return NextResponse.json({ error: 'No known jobs in the payload.' }, { status: 400 });

    const dbi = await db.connect();
    await dbi.collection('adminSettings').updateOne(
      { _id: SCHEDULES_DOC_ID },
      { $set },
      { upsert: true },
    );
    const schedules = await getSchedules();
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error('PUT /api/admin/pricing-schedules error:', error);
    return NextResponse.json({ error: 'Could not save schedules.' }, { status: 500 });
  }
}
