"use client";

import { useEffect, useState, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

function StatCard({ title, value, note, highlight }) {
  return (
    <Card sx={{ height: '100%', ...(highlight ? { borderTop: '3px solid', borderColor: 'warning.main' } : {}) }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h3" fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
        {note && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{note}</Typography>}
      </CardContent>
    </Card>
  );
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function VoteRemindersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/vote-reminders', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h4" fontWeight={700}>Vote Campaign</Typography>
        <Button onClick={load} startIcon={<RefreshIcon />} disabled={loading} variant="outlined" size="small">
          Refresh
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Best of the River Valley — reminder sign-ups
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <>
          {/* Headline stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <StatCard title="Total reminders set" value={data.totalReminders} note="Active email + calendar" highlight />
            <StatCard title="📅 Calendar reminders" value={data.calendar.total} note="One-tap phone reminders" />
            <StatCard title="✉️ Email subscribers" value={data.email.active} note={`${data.email.total} total`} />
            <StatCard title="Unsubscribed" value={data.email.unsubscribed} note="Email opt-outs" />
          </Box>

          {/* Conversion funnel */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Conversion funnel</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <StatCard title="Page visits" value={data.funnel?.visits ?? 0} note="Landing-page views" />
                <StatCard title="Email signups" value={data.funnel?.signups ?? 0} note={`${data.funnel?.signupRate ?? 0}% of visits`} />
                <StatCard title="Vote clicks" value={data.funnel?.voteClicks ?? 0} note={`${data.funnel?.clickRate ?? 0}% of visits`} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                Page-view tracking is new — conversion rates only reflect visits recorded since it went live.
              </Typography>
            </CardContent>
          </Card>

          {/* Daily trend */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Daily trend</Typography>
              {!data.daily?.length ? (
                <Typography variant="body2" color="text.secondary">No activity yet.</Typography>
              ) : (
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={data.daily} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="pageViews" name="Visits" stroke="#94a3b8" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="signups" name="Signups" stroke="#fbbf24" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="voteClicks" name="Vote clicks" stroke="#34d399" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="calendarAdds" name="Calendar adds" stroke="#60a5fa" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Channel attribution */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Where traffic comes from (?ref)</Typography>
              <Divider sx={{ mb: 2 }} />
              {!data.channels?.length ? (
                <Typography variant="body2" color="text.secondary">No attributed traffic yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Channel</TableCell>
                        <TableCell align="right">Visits</TableCell>
                        <TableCell align="right">Signups</TableCell>
                        <TableCell align="right">Signup rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.channels.map((c) => (
                        <TableRow key={c.ref}>
                          <TableCell>{c.ref}</TableCell>
                          <TableCell align="right">{c.visits}</TableCell>
                          <TableCell align="right">{c.signups}</TableCell>
                          <TableCell align="right">{c.signupRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Vote clicks */}
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Vote clicks</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <StatCard title="🗳️ Total vote clicks" value={data.voteClicks?.total ?? 0} note="“Vote now” taps → voting site" highlight />
            <StatCard title="From email" value={data.voteClicks?.fromEmail ?? 0} note="Welcome + reminder emails" />
            <StatCard title="From calendar" value={data.voteClicks?.fromCalendar ?? 0} note="Calendar reminder taps" />
          </Box>

          {/* Vote clicks by source */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Vote clicks by source</Typography>
              <Divider sx={{ mb: 2 }} />
              {!data.voteClicks?.bySource?.length ? (
                <Typography variant="body2" color="text.secondary">No vote clicks tracked yet.</Typography>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {data.voteClicks.bySource.map((c) => (
                    <Chip key={c.id} label={`${c.label}: ${c.count}`} variant="outlined" />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Who clicked the vote link (email subscribers) */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Who clicked the vote link (email subscribers)</Typography>
              <Divider sx={{ mb: 2 }} />
              {!data.voteClicks?.recent?.length ? (
                <Typography variant="body2" color="text.secondary">
                  No identified vote clicks yet. (Calendar and on-site clicks are anonymous.)
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Email</TableCell>
                        <TableCell>Channel</TableCell>
                        <TableCell>When</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.voteClicks.recent.map((v, i) => (
                        <TableRow key={`${v.email}-${i}`}>
                          <TableCell>{v.email}</TableCell>
                          <TableCell>{v.channel}</TableCell>
                          <TableCell>{formatDate(v.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Reminder cadence — reach & engagement */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Reminder cadence — reach &amp; engagement</Typography>
              <Divider sx={{ mb: 2 }} />
              {!data.cadence?.length ? (
                <Typography variant="body2" color="text.secondary">No active email subscribers yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cadence</TableCell>
                        <TableCell align="right">Subscribers</TableCell>
                        <TableCell align="right">Vote clicks</TableCell>
                        <TableCell align="right">Clicks / subscriber</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.cadence.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.label}</TableCell>
                          <TableCell align="right">{c.subscribers}</TableCell>
                          <TableCell align="right">{c.clicks}</TableCell>
                          <TableCell align="right">{c.clicksPerSubscriber}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                “Clicks / subscriber” shows which cadence drives the most repeat voting.
              </Typography>
            </CardContent>
          </Card>

          {/* Recent signups */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Recent email sign-ups</Typography>
              <Divider sx={{ mb: 2 }} />
              {data.recent.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No sign-ups yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Email</TableCell>
                        <TableCell>Cadence</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Signed up</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.recent.map((r, i) => (
                        <TableRow key={`${r.email}-${i}`}>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>{r.frequency}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.status}
                              color={r.status === 'active' ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{r.source}</TableCell>
                          <TableCell>{formatDate(r.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </Box>
  );
}
