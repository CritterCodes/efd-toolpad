'use client';

import React, { useEffect, useState } from 'react';
import {
    Card, CardContent, CardActions, Typography, Box, Grid,
    FormControl, InputLabel, Select, MenuItem, Button, Alert,
    CircularProgress, Chip, Tooltip
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Shop-local reference for the hour picker (Fort Smith = US Central).
const hourLabel = (h) => {
    const central = (h - 5 + 24) % 24; // CDT; close enough for a schedule hint
    const fmt = (x) => `${((x + 11) % 12) + 1}${x < 12 ? 'am' : 'pm'}`;
    return `${String(h).padStart(2, '0')}:00 UTC (~${fmt(central)} Central)`;
};
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');

/**
 * Price Update Schedules (owner: "I want all schedules in settings").
 * Each pricing cron fires hourly on Vercel; these settings decide when each
 * actually runs. Last-run stamps come from the gate itself, so what this panel
 * shows is what actually happened — not what was supposed to.
 */
export default function PriceUpdateSchedules() {
    const [jobs, setJobs] = useState(null);
    const [frequencies, setFrequencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const load = () => {
        setLoading(true);
        fetch('/api/admin/pricing-schedules')
            .then((r) => r.json())
            .then((d) => {
                if (d.success) { setJobs(d.jobs); setFrequencies(d.frequencies); }
                else setFeedback({ severity: 'error', text: d.error || 'Could not load schedules.' });
            })
            .catch((e) => setFeedback({ severity: 'error', text: e.message }))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const setSchedule = (key, patch) => {
        setJobs((prev) => ({ ...prev, [key]: { ...prev[key], schedule: { ...prev[key].schedule, ...patch } } }));
    };

    const save = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            const payload = Object.fromEntries(Object.entries(jobs).map(([k, v]) => [k, v.schedule]));
            const r = await fetch('/api/admin/pricing-schedules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobs: payload }),
            });
            const d = await r.json();
            if (!d.success) throw new Error(d.error || 'Save failed.');
            setFeedback({ severity: 'success', text: 'Schedules saved — they apply from the next hourly tick.' });
        } catch (e) {
            setFeedback({ severity: 'error', text: e.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <ScheduleIcon fontSize="small" />
                    <Typography variant="h6">Price Update Schedules</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    When each pricing job runs. Jobs check in hourly; a job runs at the first check-in
                    after its scheduled time, and a missed window catches up instead of skipping.
                </Typography>

                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>}
                {!loading && jobs && Object.entries(jobs).map(([key, job]) => {
                    const s = job.schedule;
                    return (
                        <Box key={key} sx={{ mb: 2.5, pb: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                <Typography sx={{ fontWeight: 600 }}>{job.label}</Typography>
                                {job.lastRun?.lastRunAt ? (
                                    <Tooltip title={job.lastRun.lastDetail || ''}>
                                        <Chip
                                            size="small"
                                            label={`last ran ${fmtWhen(job.lastRun.lastRunAt)}`}
                                            color={job.lastRun.lastStatus === 'ok' ? 'default' : 'warning'}
                                        />
                                    </Tooltip>
                                ) : (
                                    <Chip size="small" label="never ran" color="warning" />
                                )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {job.description}
                            </Typography>
                            <Grid container spacing={1.5}>
                                <Grid item xs={12} sm={4}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>Frequency</InputLabel>
                                        <Select value={s.frequency} label="Frequency" onChange={(e) => setSchedule(key, { frequency: e.target.value })}>
                                            {frequencies.map((f) => <MenuItem key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {['daily', 'weekly', 'monthly'].includes(s.frequency) && (
                                    <Grid item xs={12} sm={5}>
                                        <FormControl size="small" fullWidth>
                                            <InputLabel>Time</InputLabel>
                                            <Select value={s.hourUtc} label="Time" onChange={(e) => setSchedule(key, { hourUtc: e.target.value })}>
                                                {Array.from({ length: 24 }, (_, h) => <MenuItem key={h} value={h}>{hourLabel(h)}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                )}
                                {s.frequency === 'weekly' && (
                                    <Grid item xs={12} sm={3}>
                                        <FormControl size="small" fullWidth>
                                            <InputLabel>Day</InputLabel>
                                            <Select value={s.dayOfWeek} label="Day" onChange={(e) => setSchedule(key, { dayOfWeek: e.target.value })}>
                                                {DAYS.map((d, i) => <MenuItem key={d} value={i}>{d}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    );
                })}
                {feedback && <Alert severity={feedback.severity} sx={{ mt: 1 }} onClose={() => setFeedback(null)}>{feedback.text}</Alert>}
            </CardContent>
            <CardActions>
                <Button variant="contained" onClick={save} disabled={saving || loading || !jobs}>
                    {saving ? 'Saving…' : 'Save Schedules'}
                </Button>
                <Button onClick={load} disabled={loading}>Refresh</Button>
            </CardActions>
        </Card>
    );
}
