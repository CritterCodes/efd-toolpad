import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// The Best of the River Valley campaign (matches efd-shop lib/voteCampaign.js).
const CAMPAIGN_KEY = 'best-of-river-valley-2026';

const FREQUENCY_LABELS = {
  daily: 'Daily',
  every3: 'Every 3 days',
  weekly: 'Weekly',
};

// Friendly labels for vote-click sources (set by efd-shop's /go redirect).
const SOURCE_LABELS = {
  landing_page: 'Landing page',
  landing_signedup: 'Landing (after signup)',
  modal_skip: 'Banner popup (skip)',
  modal_signup: 'Banner popup (after signup)',
  email_welcome: 'Email — welcome',
  email_reminder: 'Email — reminder',
  calendar: 'Calendar reminder',
  unknown: 'Other / direct',
};

const EMAIL_SOURCES = ['email_welcome', 'email_reminder'];

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

    const [emailTotal, emailActive, emailUnsubscribed, byFrequencyRaw, calendarAdds, voteClicksRaw, recent, voterLogRaw] =
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
        events
          .aggregate([
            { $match: { ...filter, type: 'vote_click' } },
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray(),
        subs
          .find(filter, { projection: { email: 1, frequency: 1, status: 1, source: 1, createdAt: 1 } })
          .sort({ createdAt: -1 })
          .limit(25)
          .toArray(),
        // Email-attributed vote clicks — "who voted (via the link), when".
        events
          .find(
            { ...filter, type: 'vote_click', email: { $ne: null } },
            { projection: { email: 1, source: 1, createdAt: 1 } }
          )
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray(),
      ]);

    const byFrequency = byFrequencyRaw.map((f) => ({
      id: f._id || 'unknown',
      label: FREQUENCY_LABELS[f._id] || f._id || 'Unknown',
      count: f.count,
    }));

    const voteClicksBySource = voteClicksRaw.map((c) => ({
      id: c._id || 'unknown',
      label: SOURCE_LABELS[c._id] || c._id || 'Other / direct',
      count: c.count,
    }));
    const voteClicksTotal = voteClicksBySource.reduce((sum, c) => sum + c.count, 0);
    const voteClicksFromEmail = voteClicksBySource
      .filter((c) => EMAIL_SOURCES.includes(c.id))
      .reduce((sum, c) => sum + c.count, 0);
    const voteClicksFromCalendar = voteClicksBySource
      .filter((c) => c.id === 'calendar')
      .reduce((sum, c) => sum + c.count, 0);

    const voterLog = voterLogRaw.map((v) => ({
      email: v.email,
      channel: SOURCE_LABELS[v.source] || v.source || 'Other',
      createdAt: v.createdAt,
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
      voteClicks: {
        total: voteClicksTotal,
        fromEmail: voteClicksFromEmail,
        fromCalendar: voteClicksFromCalendar,
        bySource: voteClicksBySource,
        recent: voterLog,
      },
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
