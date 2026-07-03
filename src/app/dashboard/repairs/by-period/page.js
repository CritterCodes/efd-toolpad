"use client";
import React, { useMemo, useState } from 'react';
import {
    Box, Typography, TextField, MenuItem, Select, InputLabel, FormControl,
    Stack, Chip, Paper, CircularProgress
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RepairsGrid from '@/app/components/repairs/repairGrid';
import { useRepairs } from '@/app/context/repairs.context';
import {
    ANALYTICS_DATE_RANGE_OPTIONS,
    ANALYTICS_DATE_RANGES,
    getAnalyticsDateWindow,
    isDateInWindow,
} from '@/services/repairAnalytics';

const DATE_FIELD_OPTIONS = [
    { label: 'Created', value: 'createdAt' },
    { label: 'Promise Date', value: 'promiseDate' },
    { label: 'Completed', value: 'completedAt' },
];

const STATUS_OPTIONS = [
    "RECEIVING",
    "NEEDS QUOTE",
    "COMMUNICATION REQUIRED",
    "NEEDS PARTS",
    "PARTS ORDERED",
    "READY FOR WORK",
    "IN PROGRESS",
    "QC",
    "READY FOR PICKUP",
    "DELIVERY BATCHED",
    "PAID_CLOSED",
    "COMPLETED",
];

const COMPLETED_STATUSES = new Set([
    'COMPLETED',
    'READY FOR PICKUP',
    'READY FOR PICK-UP',
    'DELIVERY BATCHED',
    'PAID_CLOSED',
]);

function parseLocalStart(value) {
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
}

function parseLocalEnd(value) {
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
}

function formatBoundary(value) {
    if (!value) return 'Any';
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const RepairsByPeriodPage = () => {
    const { repairs, loading } = useRepairs();

    const [dateRange, setDateRange] = useState(ANALYTICS_DATE_RANGES.this_month);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [dateField, setDateField] = useState('createdAt');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');

    const isCustom = dateRange === 'custom';

    const window = useMemo(() => {
        if (isCustom) {
            return { startDate: parseLocalStart(customStart), endDate: parseLocalEnd(customEnd) };
        }
        return getAnalyticsDateWindow(dateRange);
    }, [isCustom, dateRange, customStart, customEnd]);

    const filteredRepairs = useMemo(() => {
        let updated = (repairs || []).filter((repair) => isDateInWindow(repair?.[dateField], window));

        if (statusFilter === '__completed__') {
            updated = updated.filter((repair) => COMPLETED_STATUSES.has(repair.status));
        } else if (statusFilter) {
            updated = updated.filter((repair) => repair.status === statusFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            updated = updated.filter((repair) =>
                (repair.clientName || '').toLowerCase().includes(q) ||
                (repair.description || '').toLowerCase().includes(q) ||
                (repair.businessName || '').toLowerCase().includes(q) ||
                (repair.repairID || '').toLowerCase().includes(q)
            );
        }

        updated = [...updated].sort((a, b) => {
            const dateA = new Date(a[dateField] || a.createdAt || 0);
            const dateB = new Date(b[dateField] || b.createdAt || 0);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return updated;
    }, [repairs, dateField, window, statusFilter, searchQuery, sortOrder]);

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, pb: 10 }}>
            <Stack spacing={0.5} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonthIcon color="primary" />
                    <Typography variant="h4" fontWeight="bold">Repairs by Period</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    Filter repairs by a date range and open any repair directly from its card.
                </Typography>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Period</InputLabel>
                        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} label="Period">
                            {ANALYTICS_DATE_RANGE_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                            <MenuItem value="custom">Custom Range</MenuItem>
                        </Select>
                    </FormControl>

                    {isCustom && (
                        <>
                            <TextField
                                label="Start"
                                type="date"
                                size="small"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="End"
                                type="date"
                                size="small"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </>
                    )}

                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Date Field</InputLabel>
                        <Select value={dateField} onChange={(e) => setDateField(e.target.value)} label="Date Field">
                            {DATE_FIELD_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 170 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="__completed__">Completed (all closed)</MenuItem>
                            {STATUS_OPTIONS.map((status) => (
                                <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Sort</InputLabel>
                        <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} label="Sort">
                            <MenuItem value="newest">Newest First</MenuItem>
                            <MenuItem value="oldest">Oldest First</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Search"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ flex: '1 1 auto', minWidth: 200 }}
                    />
                </Box>

                <Stack direction="row" spacing={1} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
                    <Chip
                        size="small"
                        variant="outlined"
                        label={`${formatBoundary(window.startDate)} → ${formatBoundary(window.endDate)}`}
                    />
                    <Chip size="small" label={`${filteredRepairs.length} repair${filteredRepairs.length !== 1 ? 's' : ''}`} />
                </Stack>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : filteredRepairs.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                    No repairs match this period and filters.
                </Typography>
            ) : (
                <RepairsGrid repairs={filteredRepairs} rowsPerPage={12} />
            )}
        </Box>
    );
};

export default RepairsByPeriodPage;
