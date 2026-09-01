'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, TextField,
    Table, TableBody, TableCell, TableHead, TableRow, GlobalStyles
} from '@mui/material';
import { Print as PrintIcon, RequestQuote as PriceIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (v) => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The metal matrix. Trade price sheets are karat-column tables — the eye scans
 * DOWN a column to compare tasks and ACROSS a row to compare metals. Gold colors
 * are shown exactly (owner: never collapse colors — yellow/white/rose price
 * differently and the sheet must say so).
 */
const METAL_GROUPS = [
    { label: 'Silver', columns: [{ key: 'sterling_silver_925', label: '925' }] },
    { label: '10k Gold', columns: [{ key: 'yellow_gold_10k', label: 'Y' }, { key: 'white_gold_10k', label: 'W' }, { key: 'rose_gold_10k', label: 'R' }] },
    { label: '14k Gold', columns: [{ key: 'yellow_gold_14k', label: 'Y' }, { key: 'white_gold_14k', label: 'W' }, { key: 'rose_gold_14k', label: 'R' }] },
    { label: '18k Gold', columns: [{ key: 'yellow_gold_18k', label: 'Y' }, { key: 'white_gold_18k', label: 'W' }, { key: 'rose_gold_18k', label: 'R' }] },
    { label: 'Platinum', columns: [{ key: 'platinum_950', label: '950' }] },
];
const ALL_COLUMNS = METAL_GROUPS.flatMap((g) => g.columns);

// "(laser welded)" and similar parentheticals are shop detail — keep them off the
// task name line so titles stop wrapping, but keep them visible as a subtitle.
const splitTitle = (title = '') => {
    const m = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return m ? { name: m[1], note: m[2] } : { name: title, note: null };
};

const priceCellSx = {
    color: UI.textPrimary, textAlign: 'right', whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums', fontSize: '0.82rem',
    borderBottom: `1px solid ${UI.border}`, px: 1,
};
const headCellSx = {
    color: UI.textMuted, fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.05em',
    textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}`,
    backgroundColor: UI.bgTertiary, textAlign: 'right', whiteSpace: 'nowrap', px: 1,
};

/**
 * Print rules. The page lives inside the dashboard shell (sidebar, top bar),
 * which has no business on paper — the classic visibility trick hides
 * everything, then re-shows the sheet pinned to the page origin so the
 * sidebar's space doesn't print as a blank column. The matrix drops its
 * screen min-width and compacts to fit a landscape sheet, black on white.
 */
const printStyles = (
    <GlobalStyles styles={`
        @media print {
            body * { visibility: hidden; }
            .psheet-root, .psheet-root * { visibility: visible; }
            /* right: 8px (not width: 100%) keeps the last column off the paper's
               clipped edge — the platinum cells were printing half-cut. */
            .psheet-root { position: absolute; left: 0; top: 0; right: 8px; width: auto; padding: 0; }
            .psheet-root table { min-width: 0 !important; width: 100%; table-layout: auto; }
            /* the cards clip overflow for rounded corners on screen; on paper that
               clipping is what amputated the platinum column */
            .psheet-root .psheet-card { overflow: visible !important; }
            .psheet-root td:last-child, .psheet-root th:last-child { padding-right: 10px !important; }
            .psheet-root td, .psheet-root th {
                padding: 2px 5px !important;
                font-size: 9.5px !important;
                color: #000 !important;
                background: #fff !important;
                border-color: #bbb !important;
            }
            .psheet-root .psheet-category {
                color: #000 !important;
                background: #eee !important;
                font-size: 11px !important;
                padding: 4px 8px !important;
            }
            .psheet-root .psheet-card {
                border-color: #999 !important;
                border-radius: 0 !important;
                margin-bottom: 10px !important;
                break-inside: avoid;
            }
            .psheet-root .psheet-scroll { overflow: visible !important; }
            .psheet-print-header { display: block !important; }
        }
    `} />
);

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
        // Within a category: flat-priced services first (the simple list), then the
        // metal matrix rows, each alphabetical.
        for (const list of map.values()) {
            list.sort((a, b) => (a.byMetal ? 1 : 0) - (b.byMetal ? 1 : 0) || a.title.localeCompare(b.title));
        }
        return [...map.entries()];
    }, [rows, search]);

    return (
        <Box className="psheet-root" sx={{ pb: 10, '@media print': { pb: 0 } }}>
            {printStyles}
            {/* Letterhead, print only — the on-screen header hides itself on paper. */}
            <Box className="psheet-print-header" sx={{ display: 'none', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#000' }}>
                    Engel Fine Design — Wholesale Price Sheet
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#000' }}>
                    Current as of {generatedAt ? new Date(generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                    Prices are live and change with the metal market — reprint rather than reuse. A dash means quote on request.
                </Typography>
            </Box>
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
                            {' '}A dash means quote on request.
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

            {!loading && grouped.map(([category, tasks]) => {
                const flatTasks = tasks.filter((t) => !t.byMetal);
                const matrixTasks = tasks.filter((t) => t.byMetal);
                return (
                    <Box key={category} className="psheet-card" sx={{ mb: 3, border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden', breakInside: 'avoid' }}>
                        <Typography className="psheet-category" sx={{ px: 2, py: 1.25, fontWeight: 700, color: UI.textHeader, backgroundColor: UI.bgPanel, borderBottom: `1px solid ${UI.border}`, textTransform: 'capitalize' }}>
                            {String(category).replace(/[_-]+/g, ' ')}
                        </Typography>

                        {/* Metal-independent services: a simple two-column list. */}
                        {flatTasks.length > 0 && (
                            <Table size="small">
                                <TableBody>
                                    {flatTasks.map((t) => {
                                        const { name, note } = splitTitle(t.title);
                                        return (
                                            <TableRow key={t.title} sx={{ backgroundColor: UI.bgCard }}>
                                                <TableCell sx={{ color: UI.textPrimary, borderBottom: `1px solid ${UI.border}` }}>
                                                    {name}
                                                    {note && <Typography component="span" variant="caption" sx={{ color: UI.textMuted, ml: 1 }}>{note}</Typography>}
                                                    {t.sku && <Typography component="span" variant="caption" sx={{ color: UI.textMuted, ml: 1, fontFamily: 'monospace' }}>{t.sku}</Typography>}
                                                </TableCell>
                                                <TableCell sx={{ ...priceCellSx, fontWeight: 600, width: 120 }}>{money(t.wholesalePrice)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}

                        {/* Metal-dependent services: the matrix. Scrolls sideways on small
                            screens rather than wrapping into chip soup. */}
                        {matrixTasks.length > 0 && (
                            <Box className="psheet-scroll" sx={{ overflowX: 'auto' }}>
                                <Table size="small" sx={{ minWidth: 900 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ ...headCellSx, textAlign: 'left', minWidth: 190 }} rowSpan={2}>Service</TableCell>
                                            {METAL_GROUPS.map((g) => (
                                                <TableCell key={g.label} colSpan={g.columns.length} sx={{ ...headCellSx, textAlign: 'center', borderLeft: `1px solid ${UI.border}` }}>
                                                    {g.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            {METAL_GROUPS.flatMap((g) => g.columns.map((c, i) => (
                                                <TableCell key={c.key} sx={{ ...headCellSx, ...(i === 0 ? { borderLeft: `1px solid ${UI.border}` } : {}) }}>
                                                    {c.label}
                                                </TableCell>
                                            )))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {matrixTasks.map((t) => {
                                            const { name, note } = splitTitle(t.title);
                                            return (
                                                <TableRow key={t.title} sx={{ backgroundColor: UI.bgCard, '&:hover': { backgroundColor: UI.bgTertiary } }}>
                                                    <TableCell sx={{ color: UI.textPrimary, borderBottom: `1px solid ${UI.border}` }}>
                                                        {name}
                                                        {note && <Typography variant="caption" sx={{ color: UI.textMuted, display: 'block' }}>{note}</Typography>}
                                                    </TableCell>
                                                    {ALL_COLUMNS.map((c, i) => {
                                                        const groupStart = METAL_GROUPS.some((g) => g.columns[0].key === c.key);
                                                        const price = t.byMetal?.[c.key];
                                                        return (
                                                            <TableCell key={c.key} sx={{ ...priceCellSx, ...(groupStart ? { borderLeft: `1px solid ${UI.border}` } : {}), color: price ? UI.textPrimary : UI.textMuted }}>
                                                                {price ? money(price) : '—'}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Box>
                );
            })}

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
