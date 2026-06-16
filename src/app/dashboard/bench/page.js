'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Chip, Table, TableHead, TableRow, TableCell, TableBody, Button,
  CircularProgress, Stack, Paper, Tooltip,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { useRouter } from 'next/navigation';

const DISCIPLINE_LABEL = { bench_jewelry: 'Bench', cad: 'CAD', engraving: 'Engraving', gem_cutting: 'Gem cutting' };

function statusColor(s = '') {
  if (/PROGRESS/i.test(s)) return 'primary';
  if (/QC|QUALITY/i.test(s)) return 'secondary';
  if (/READY/i.test(s)) return 'info';
  if (/PARTS|COMMUNICATION/i.test(s)) return 'warning';
  return 'default';
}

function sourceLabel(wo) {
  const s = wo.source || {};
  if (s.kind === 'repair') return `Repair · ${s.clientName || s.businessName || wo.sourceID}`;
  if (s.kind === 'piece') return `Piece · ${s.designName || s.sku || wo.sourceID}`;
  return wo.sourceType;
}

export default function BenchPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyID, setBusyID] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bench/my-bench');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load bench');
      setItems(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (wo, action) => {
    setBusyID(wo.workOrderID);
    setError('');
    try {
      const res = await fetch(`/api/bench/work-orders/${wo.workOrderID}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `${action} failed`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyID('');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Bench</Typography>
          <Typography variant="body2" color="text.secondary">
            All work across your disciplines — repairs, production, customs, sale service.
          </Typography>
        </Box>
        <Button onClick={load}>Refresh</Button>
      </Stack>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {loading ? (
        <CircularProgress />
      ) : items.length === 0 ? (
        <Typography color="text.secondary">No active bench work in your lanes.</Typography>
      ) : (
        <Paper variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lane</TableCell>
                <TableCell>Work</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((wo) => (
                <TableRow key={wo.workOrderID} hover>
                  <TableCell><Chip size="small" label={DISCIPLINE_LABEL[wo.discipline] || wo.discipline} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {wo.isRush && <Tooltip title="Rush"><BoltIcon fontSize="small" color="warning" /></Tooltip>}
                      <span>{wo.title || '—'}</span>
                    </Stack>
                  </TableCell>
                  <TableCell>{sourceLabel(wo)}</TableCell>
                  <TableCell><Chip size="small" label={wo.status || '—'} color={statusColor(wo.status || '')} /></TableCell>
                  <TableCell>{wo.assignedJeweler || (wo.assignedToUserID ? 'assigned' : '—')}</TableCell>
                  <TableCell align="right">
                    {wo.sourceType === 'production_piece' ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {!wo.assignedToUserID && (
                          <Button size="small" disabled={busyID === wo.workOrderID} onClick={() => act(wo, 'claim')}>Claim</Button>
                        )}
                        <Button size="small" variant="outlined" disabled={busyID === wo.workOrderID} onClick={() => act(wo, 'complete')}>Complete</Button>
                      </Stack>
                    ) : wo.sourceType === 'repair' ? (
                      <Button size="small" onClick={() => router.push(`/dashboard/repairs/${wo.sourceID}`)}>Open repair</Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
