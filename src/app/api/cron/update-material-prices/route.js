/**
 * Cron Job Endpoint: Update Material Prices on Schedule
 * Called daily by Vercel Cron and runs only when due based on admin-configured frequency.
 */

import { db } from '@/lib/database';
import { priceJobDue, markPriceJobRun } from '@/services/cron/priceSchedules';
import { cronAuthorized } from '@/lib/cronAuth';
import { runMaterialPriceSync } from '@/app/api/materials/bulk-update-pricing/service';


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

    const settings = await adminCollection.findOne({ _id: 'repair_task_admin_settings' });

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
    // An honest run record (EFD-DEFECTS P23): it said "ok" whatever happened — even when the sync
    // refused to run — and read a count that isn't there (`result.updated`; it's on the payload).
    const sync = result?.payload || {};
    const runStatus = result?.status !== 200 ? 'failed' : sync.failed > 0 ? 'partial' : 'ok';
    const detail = result?.status !== 200
      ? (sync.error || `HTTP ${result?.status}`)
      : `synced ${sync.updated ?? 0} of ${sync.candidates ?? 0}${sync.failed ? `; ${sync.failed} failed: ${(sync.failures || []).map((f) => f.sku || f.name).slice(0, 10).join(', ')}` : ''}`;
    await markPriceJobRun('materialPrices', { status: runStatus, detail });
    if (runStatus === 'failed') {
      return Response.json({ success: false, ran: false, error: detail, sync }, { status: result?.status || 500 });
    }

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
      success: runStatus === 'ok',
      status: runStatus,
      ran: true,
      lastRun: completedAt.toISOString(),
      sync: result.payload
    }, { status: result.status });
  } catch (error) {
    console.error('Cron material price sync error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
