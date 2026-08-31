'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, TextField,
    Table, TableBody, TableCell, TableHead, TableRow, Chip
} from '@mui/material';
import { Print as PrintIcon, RequestQuote as PriceIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (v) => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const metalLabel = (k) => String(k).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const TH = ({ children, align }) => (
    <TableCell align={align} sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}`, backgroundColor: UI.bgTertiary }}>
        {children}
    </TableCell>
);

/**
 * Live wholesale price sheet — served from the task catalog, so it is always
 * today's numbers rather than a PDF that goes stale in someone's inbox.
 * Print-friendly on purpose: partners pin this to the bench.
 */
export default function WholesalePriceSheetPage() {
    const [rows, setRows] = useState([]);
    const [generatedAt, setGeneratedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const load = () => {
        setLoading(true);
        setError('');
        fetch('/api/wholesale/price-sheet')
            .then((r) => r.json())
            .then((d) => {
                if (d.success) { setRows(d.rows || []); setGeneratedAt(d.generatedAt); }
                else setError(d.error || 'Could not load the price list.');
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const grouped = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = q ? rows.filter((r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) : rows;
        const map = new Map();
        for (const r of filtered) {
            if (!map.has(r.category)) map.set(r.category, []);
            map.get(r.category).push(r);
        }
        return [...map.entries()];
    }, [rows, search]);

    return (
        <Box sx={{ pb: 10, '@media print': { pb: 0 } }}>
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3,
                    '@media print': { display: 'none' },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: UI.textPrimary, backgroundColor: UI.bgCard, border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
                            <PriceIcon sx={{ fontSize: 16, color: UI.accent }} />
                            Wholesale
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
                            Price Sheet
                        </Typography>
                        <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
                            Your trade pricing for repair services — live from our catalog, current as of{' '}
                            {generatedAt ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'today'}.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading} sx={{ color: UI.textPrimary, borderColor: UI.border }}>
                            Refresh
                        </Button>
                        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} disabled={loading || rows.length === 0}>
                            Print
                        </Button>
                    </Box>
                </Box>
                <TextField
                    size="small" placeholder="Search services…" value={search}
                    onChange={(e) => setSearch(e.target.value)} sx={{ mt: 2, minWidth: 260 }}
                />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: UI.accent }} /></Box>}

            {!loading && grouped.map(([category, tasks]) => (
                <Box key={category} sx={{ mb: 3, border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden', breakInside: 'avoid' }}>
                    <Typography sx={{ px: 2, py: 1.25, fontWeight: 700, color: UI.textHeader, backgroundColor: UI.bgPanel, borderBottom: `1px solid ${UI.border}`, textTransform: 'capitalize' }}>
                        {String(category).replace(/[_-]+/g, ' ')}
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TH>Service</TH>
                                <TH align="right">Your Price</TH>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tasks.map((t) => (
                                <TableRow key={`${category}-${t.title}`} sx={{ backgroundColor: UI.bgCard, '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` }, '&:last-child td': { borderBottom: 'none' } }}>
                                    <TableCell sx={{ color: UI.textPrimary }}>
                                        {t.title}
                                        {t.sku && <Typography component="span" variant="caption" sx={{ color: UI.textMuted, ml: 1, fontFamily: 'monospace' }}>{t.sku}</Typography>}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: UI.textPrimary, whiteSpace: 'nowrap' }}>
                                        {t.byMetal ? (
                                            <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                {Object.entries(t.byMetal).map(([metal, price]) => (
                                                    <Chip key={metal} size="small" label={`${metalLabel(metal)} ${money(price)}`} sx={{ backgroundColor: UI.bgTertiary, color: UI.textPrimary }} />
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography component="span" sx={{ fontWeight: 600 }}>{money(t.wholesalePrice)}</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            ))}

            {!loading && !error && grouped.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
                    <Typography sx={{ color: UI.textSecondary }}>
                        {search ? 'No services match your search.' : 'No priced services available yet.'}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
