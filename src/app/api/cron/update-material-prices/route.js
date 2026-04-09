/**
 * Cron Job Endpoint: Update Material Prices on Schedule
 * Called daily by Vercel Cron and runs only when due based on admin-configured frequency.
 */

import { db } from '@/lib/database';
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
  const querySecret = req.nextUrl.searchParams.get('secret');
  const vercelCronHeader = req.headers.get('x-vercel-cron');

  if (querySecret && querySecret === process.env.CRON_SECRET) {
    return true;
  }

  // Vercel cron requests include this header for scheduled invocations
  if (vercelCronHeader) {
    return true;
  }

  return false;
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
    const frequency = SUPPORTED_FREQUENCIES.includes(stuller.updateFrequency)
      ? stuller.updateFrequency
      : 'daily';

    const now = new Date();
    const lastRun = stuller.lastPriceSyncAt ? new Date(stuller.lastPriceSyncAt) : null;

    if (!stuller.enabled) {
      return Response.json({
        success: true,
        skipped: true,
        reason: 'Stuller integration disabled',
        frequency,
        timestamp: now.toISOString()
      });
    }

    if (!isSyncDue(lastRun, frequency, now)) {
      const nextRun = getNextRun(lastRun, frequency);
      await adminCollection.updateOne(
        { _id: settings?._id || 'repair_task_admin_settings' },
        { $set: { 'stuller.nextPriceSyncAt': nextRun, updatedAt: now } }
      );

      return Response.json({
        success: true,
        skipped: true,
        reason: 'Not due yet for configured schedule',
        frequency,
        lastRun: lastRun?.toISOString() || null,
        nextRun: nextRun.toISOString(),
        timestamp: now.toISOString()
      });
    }

    const result = await runMaterialPriceSync(settings);

    const completedAt = new Date();
    const nextRun = getNextRun(completedAt, frequency);

    await adminCollection.updateOne(
      { _id: settings?._id || 'repair_task_admin_settings' },
      {
        $set: {
          'stuller.lastPriceSyncAt': completedAt,
          'stuller.nextPriceSyncAt': nextRun,
          'stuller.lastUpdate': completedAt,
          updatedAt: completedAt
        }
      }
    );

    return Response.json({
      success: true,
      ran: true,
      frequency,
      lastRun: completedAt.toISOString(),
      nextRun: nextRun.toISOString(),
      sync: result.payload
    }, { status: result.status });
  } catch (error) {
    console.error('Cron material price sync error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
