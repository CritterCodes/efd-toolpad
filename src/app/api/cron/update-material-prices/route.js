/**
 * Cron Job Endpoint: Update Material Prices on Schedule
 * Called daily by Vercel Cron and runs only when due based on admin-configured frequency.
 */

import { db } from '@/lib/database';
import { priceJobDue, markPriceJobRun } from '@/services/cron/priceSchedules';
import { cronAuthorized } from '@/lib/cronAuth';
import { runMaterialPriceSync } from '@/app/api/materials/bulk-update-pricing/service';

const SUPPORTED_FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'];

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getNextRun(lastRun, frequency) {
  const base = new Date(lastRun);
  switch (frequency) {
    case 'daily':
      return new Date(base.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'bi-weekly':
      return new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return addMonths(base, 1);
    case 'quarterly':
      return addMonths(base, 3);
    case 'yearly':
      return addMonths(base, 12);
    default:
      return new Date(base.getTime() + 24 * 60 * 60 * 1000);
  }
}

function isSyncDue(lastRun, frequency, now) {
  if (!lastRun) return true;
  const nextRun = getNextRun(lastRun, frequency);
  return now >= nextRun;
}

function isAuthorizedCronRequest(req) {
  // The x-vercel-cron header this used to trust is just a request header --
  // anyone can send it. cronAuthorized checks the actual secret, in either
  // the Authorization header (Vercel scheduler) or ?secret= (manual runs).
  return cronAuthorized(req);
}

export async function GET(req) {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    await db.connect();
    const adminCollection = await db.dbAdminSettings();

    const settings =
      (await adminCollection.findOne({ _id: 'repair_task_admin_settings' })) ||
      (await adminCollection.findOne({}));

    const stuller = settings?.stuller || {};
    const now = new Date();

    if (!stuller.enabled) {
      return Response.json({
        success: true,
        skipped: true,
        reason: 'Stuller integration disabled',
        timestamp: now.toISOString()
      });
    }

    // Owner-controlled schedule (settings -> Price Update Schedules). This
    // replaces the old stuller.updateFrequency gate so ALL pricing jobs are
    // configured in one place.
    const { due, schedule } = await priceJobDue('materialPrices', now);
    if (!due && !req.nextUrl.searchParams.get('force')) {
      return Response.json({ success: true, skipped: true, reason: 'not due', schedule, timestamp: now.toISOString() });
    }

    const result = await runMaterialPriceSync(settings);
    await markPriceJobRun('materialPrices', { status: 'ok', detail: `synced ${result?.updated ?? ''}` });

    const completedAt = new Date();

    // lastPriceSyncAt stays on the Stuller panel for display; the schedule
    // itself now lives in Price Update Schedules (cronRuns is the gate's clock).
    await adminCollection.updateOne(
      { _id: settings?._id || 'repair_task_admin_settings' },
      {
        $set: {
          'stuller.lastPriceSyncAt': completedAt,
          'stuller.lastUpdate': completedAt,
          updatedAt: completedAt
        }
      }
    );

    return Response.json({
      success: true,
      ran: true,
      lastRun: completedAt.toISOString(),
      sync: result.payload
    }, { status: result.status });
  } catch (error) {
    console.error('Cron material price sync error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
