"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

function ReviewCard({ log, onApprove, loading }) {
  const [hours, setHours] = useState(log.creditedLaborHours || 0);
  const [notes, setNotes] = useState(log.notes || '');

  return (
    <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
          {log.logID}
        </Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mt: 0.5 }}>
          {log.primaryJewelerName}
        </Typography>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>
          Repair {log.repairID}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
          <TextField
            label="Credited Hours"
            size="small"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            inputProps={{ min: 0, step: 0.25 }}
          />
          <TextField
            label="Notes"
            size="small"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
          />
        </Box>
        <Button
          variant="contained"
          disabled={loading}
          onClick={() => onApprove(log.logID, hours, notes)}
          sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}
        >
          Finalize Review
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LaborReviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingLogID, setSavingLogID] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRes, weeklyRes] = await Promise.all([
        fetch('/api/repairs/labor-review'),
        fetch('/api/repairs/labor-report'),
      ]);

      if (!pendingRes.ok || !weeklyRes.ok) {
        throw new Error('Failed to load labor review data.');
      }

      const [pendingData, weeklyData] = await Promise.all([pendingRes.json(), weeklyRes.json()]);
      setPending(Array.isArray(pendingData) ? pendingData : []);
      setWeekly(Array.isArray(weeklyData) ? weeklyData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      fetchData();
    }
  }, [fetchData, router, session?.user?.role, status]);

  const currentWeek = useMemo(() => {
    if (!weekly.length) return [];
    return weekly.filter((entry) => {
      const monday = new Date(entry.weekStart);
      const now = new Date();
      const diff = now.getTime() - monday.getTime();
      return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
    });
  }, [weekly]);

  const finalizeReview = async (logID, creditedLaborHours, notes) => {
    setSavingLogID(logID);
    setError('');
    try {
      const res = await fetch('/api/repairs/labor-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logID, creditedLaborHours, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to finalize labor review.');
      }
      await fetchData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingLogID('');
    }
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return null;
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReceiptLongIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
              Labor Review
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Review shared-work exceptions and track weekly credited labor by jeweler.
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : (
        <>
          <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em' }}>
            Pending Review
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5, mb: 4 }}>
            {pending.length === 0 ? (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No shared-work reviews are pending.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : pending.map((log) => (
              <Grid item xs={12} md={6} key={log.logID}>
                <ReviewCard log={log} loading={savingLogID === log.logID} onApprove={finalizeReview} />
              </Grid>
            ))}
          </Grid>

          <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em' }}>
            Current Week
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {(currentWeek.length ? currentWeek : weekly).map((entry) => (
              <Grid item xs={12} md={6} lg={4} key={`${entry.userID}-${entry.weekStart}`}>
                <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>{entry.userName}</Typography>
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                      Week of {new Date(entry.weekStart).toLocaleDateString()}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary, mt: 1.5 }}>
                      Hours: {Number(entry.laborHours || 0).toFixed(2)}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary }}>
                      Repairs: {entry.repairsWorked || 0}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary }}>
                      Pay Snapshot: ${Number(entry.laborPay || 0).toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
