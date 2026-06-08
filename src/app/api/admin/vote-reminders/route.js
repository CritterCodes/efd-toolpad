import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// The Best of the River Valley campaign (matches efd-shop lib/voteCampaign.js).
const CAMPAIGN_KEY = 'best-of-river-valley-2026';

const FREQUENCY_LABELS = {
  daily: 'Daily',
  every3: 'Every 3 days',
  weekly: 'Weekly',
};

/**
 * GET /api/admin/vote-reminders
 * Returns counts for the vote-reminder campaign:
 *  - email subscribers (total / active / unsubscribed, and breakdown by cadence)
 *  - calendar reminders added (one-tap phone reminders)
 *  - recent email signups
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || !['admin', 'dev'].includes(session.user.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { db } = await connectToDatabase();
    const subs = db.collection('voteReminders');
    const events = db.collection('voteReminderEvents');
    const filter = { campaignKey: CAMPAIGN_KEY };

    const [emailTotal, emailActive, emailUnsubscribed, byFrequencyRaw, calendarAdds, recent] =
      await Promise.all([
        subs.countDocuments(filter),
        subs.countDocuments({ ...filter, status: 'active' }),
        subs.countDocuments({ ...filter, status: 'unsubscribed' }),
        subs
          .aggregate([
            { $match: { ...filter, status: 'active' } },
            { $group: { _id: '$frequency', count: { $sum: 1 } } },
          ])
          .toArray(),
        events.countDocuments({ ...filter, type: 'calendar_add' }),
        subs
          .find(filter, { projection: { email: 1, frequency: 1, status: 1, source: 1, createdAt: 1 } })
          .sort({ createdAt: -1 })
          .limit(25)
          .toArray(),
      ]);

    const byFrequency = byFrequencyRaw.map((f) => ({
      id: f._id || 'unknown',
      label: FREQUENCY_LABELS[f._id] || f._id || 'Unknown',
      count: f.count,
    }));

    return Response.json({
      campaignKey: CAMPAIGN_KEY,
      email: {
        total: emailTotal,
        active: emailActive,
        unsubscribed: emailUnsubscribed,
        byFrequency,
      },
      calendar: { total: calendarAdds },
      totalReminders: emailActive + calendarAdds,
      recent: recent.map((r) => ({
        email: r.email,
        frequency: FREQUENCY_LABELS[r.frequency] || r.frequency || '—',
        status: r.status || 'active',
        source: r.source || '—',
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('[admin/vote-reminders] error:', error);
    return Response.json({ error: 'Failed to load vote reminder stats' }, { status: 500 });
  }
}
