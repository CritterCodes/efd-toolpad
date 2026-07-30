import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { runMaterialPriceSync } from '@/app/api/materials/bulk-update-pricing/service';
import { STAFF_ROLES } from '@/lib/designPermissions';
// STAFF-ONLY. Every gate in this file was `session.user?.email?.includes('@')` — i.e. ANY
// authenticated user with a plausible email, including an artisan or a client, passed it. These
// endpoints carry pricing/catalog/credential data. The idiom appeared at 24 sites across 12 files;
// swept together rather than one at a time, which is how the last round's fix landed on the wrong
// sibling of this very file.

const SUPPORTED_FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'];

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getNextRun(base, frequency) {
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

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.connect();
    const adminCollection = await db.dbAdminSettings();
    const settings =
      (await adminCollection.findOne({ _id: 'repair_task_admin_settings' })) ||
      (await adminCollection.findOne({}));

    const frequency = SUPPORTED_FREQUENCIES.includes(settings?.stuller?.updateFrequency)
      ? settings.stuller.updateFrequency
      : 'daily';

    const result = await runMaterialPriceSync(settings, { forceTaskRecalculation: true });
    if (!result?.payload?.success) {
      return NextResponse.json(result?.payload || { error: 'Manual sync failed' }, { status: result?.status || 500 });
    }

    const completedAt = new Date();
    const nextRun = getNextRun(completedAt, frequency);

    await adminCollection.updateOne(
      { _id: settings?._id || 'repair_task_admin_settings' },
      {
        $set: {
          'stuller.lastPriceSyncAt': completedAt,
          'stuller.nextPriceSyncAt': nextRun,
          'stuller.lastUpdate': completedAt,
          updatedAt: completedAt,
          lastModifiedBy: session.user.email
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Manual price sync completed',
      frequency,
      lastRun: completedAt.toISOString(),
      nextRun: nextRun.toISOString(),
      sync: result.payload
    });
  } catch (error) {
    console.error('Manual Stuller sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
