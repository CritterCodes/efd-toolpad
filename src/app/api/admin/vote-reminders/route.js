import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database';

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
    const db = await mongo.connect();
    const subs = db.collection('voteReminders');
    const events = db.collection('voteReminderEvents');
    const filter = { campaignKey: CAMPAIGN_KEY };

    const TZ = 'America/Chicago';
    const dayStr = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: TZ } });

    const [
      emailTotal,
      emailActive,
      emailUnsubscribed,
      byFrequencyRaw,
      calendarAdds,
      voteClicksRaw,
      recent,
      voterLogRaw,
      pageViewsTotal,
      dailyEventsRaw,
      dailySignupsRaw,
      cadenceClicksRaw,
      signupsByRefRaw,
      pageViewsByRefRaw,
    ] = await Promise.all([
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
      // Funnel: total landing-page views.
      events.countDocuments({ ...filter, type: 'page_view' }),
      // Daily trend: events per day per type (Central time).
      events
        .aggregate([
          { $match: { ...filter, type: { $in: ['page_view', 'vote_click', 'calendar_add'] } } },
          { $group: { _id: { day: dayStr('$createdAt'), type: '$type' }, count: { $sum: 1 } } },
        ])
        .toArray(),
      // Daily trend: signups per day.
      subs
        .aggregate([{ $match: filter }, { $group: { _id: dayStr('$createdAt'), count: { $sum: 1 } } }])
        .toArray(),
      // Cadence effectiveness: vote-clicks joined to subscriber frequency.
      events
        .aggregate([
          { $match: { ...filter, type: 'vote_click', email: { $ne: null } } },
          { $lookup: { from: 'voteReminders', localField: 'email', foreignField: 'email', as: 'sub' } },
          { $unwind: '$sub' },
          { $match: { 'sub.campaignKey': CAMPAIGN_KEY } },
          { $group: { _id: '$sub.frequency', clicks: { $sum: 1 } } },
        ])
        .toArray(),
      // Channel attribution: signups by ref.
      subs
        .aggregate([
          { $match: filter },
          { $group: { _id: { $ifNull: ['$ref', 'direct'] }, count: { $sum: 1 } } },
        ])
        .toArray(),
      // Channel attribution: page views by ref.
      events
        .aggregate([
          { $match: { ...filter, type: 'page_view' } },
          { $group: { _id: { $ifNull: ['$source', 'direct'] }, count: { $sum: 1 } } },
        ])
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

    // Daily trend — merge events + signups into one per-day series.
    const dayMap = {};
    const ensureDay = (d) => (dayMap[d] ||= { date: d, pageViews: 0, signups: 0, voteClicks: 0, calendarAdds: 0 });
    for (const row of dailyEventsRaw) {
      const day = ensureDay(row._id.day);
      if (row._id.type === 'page_view') day.pageViews = row.count;
      else if (row._id.type === 'vote_click') day.voteClicks = row.count;
      else if (row._id.type === 'calendar_add') day.calendarAdds = row.count;
    }
    for (const row of dailySignupsRaw) ensureDay(row._id).signups = row.count;
    const daily = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    // Funnel: visits → email signups → vote clicks.
    const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
    const funnel = {
      visits: pageViewsTotal,
      signups: emailTotal,
      voteClicks: voteClicksTotal,
      signupRate: pct(emailTotal, pageViewsTotal),
      clickRate: pct(voteClicksTotal, pageViewsTotal),
    };

    // Cadence effectiveness: clicks per active subscriber, by frequency.
    const clicksByFreq = Object.fromEntries(cadenceClicksRaw.map((c) => [c._id, c.clicks]));
    const subsByFreq = Object.fromEntries(byFrequency.map((f) => [f.id, f.count]));
    const cadence = Object.keys({ ...subsByFreq, ...clicksByFreq }).map((id) => {
      const subscribers = subsByFreq[id] || 0;
      const clicks = clicksByFreq[id] || 0;
      return {
        id,
        label: FREQUENCY_LABELS[id] || id,
        subscribers,
        clicks,
        clicksPerSubscriber: subscribers > 0 ? Math.round((clicks / subscribers) * 100) / 100 : 0,
      };
    });

    // Channel attribution: merge visits + signups by ref.
    const channelMap = {};
    const ensureChannel = (r) => (channelMap[r] ||= { ref: r, visits: 0, signups: 0 });
    for (const row of pageViewsByRefRaw) ensureChannel(row._id || 'direct').visits = row.count;
    for (const row of signupsByRefRaw) ensureChannel(row._id || 'direct').signups = row.count;
    const channels = Object.values(channelMap)
      .map((c) => ({ ...c, signupRate: pct(c.signups, c.visits) }))
      .sort((a, b) => b.visits - a.visits || b.signups - a.signups);

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
      pageViews: pageViewsTotal,
      funnel,
      daily,
      cadence,
      channels,
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
