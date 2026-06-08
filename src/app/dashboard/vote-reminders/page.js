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

          {/* Email cadence breakdown */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Email reminder cadence (active)</Typography>
              <Divider sx={{ mb: 2 }} />
              {data.email.byFrequency.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No active email subscribers yet.</Typography>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {data.email.byFrequency.map((f) => (
                    <Chip key={f.id} label={`${f.label}: ${f.count}`} color="warning" variant="outlined" />
                  ))}
                </Stack>
              )}
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
