'use client';

import React from 'react';
import {
    Accordion, AccordionSummary, AccordionDetails,
    FormControl, InputLabel, Select, MenuItem, Checkbox,
    ListItemText, OutlinedInput, TextField, Typography,
    Chip, Box, Stack, FormControlLabel, Autocomplete
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const RELATED_PATHS = { design: '/dashboard/designs', drop: '/dashboard/drops', repair: '/dashboard/repairs' };

const CHANNELS = [
    { value: 'retail', label: 'Retail' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'show-floor', label: 'Show floor' },
];

const accordionSx = {
    backgroundColor: REPAIRS_UI.bgPanel,
    boxShadow: 'none',
    border: `1px solid ${REPAIRS_UI.border}`,
    mb: 1,
    borderRadius: '8px !important',
    '&:before': { display: 'none' },
};

const inputSx = {
    '& .MuiOutlinedInput-root': { backgroundColor: REPAIRS_UI.bgTertiary },
    '& .MuiInputLabel-root': { color: REPAIRS_UI.textSecondary },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
    '& .MuiInputBase-input': { color: REPAIRS_UI.textPrimary },
};

const selectInputSx = {
    backgroundColor: REPAIRS_UI.bgTertiary,
    color: REPAIRS_UI.textPrimary,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
    '& .MuiSvgIcon-root': { color: REPAIRS_UI.textSecondary },
};

const labelSx = { color: REPAIRS_UI.textSecondary };

export default function ProductStatusRail({ form, onChange }) {
    const selectedChannels = Array.isArray(form.channels) ? form.channels : [];

    const handleChannelChange = (e) => {
        const val = e.target.value;
        onChange('channels', typeof val === 'string' ? val.split(',') : val);
    };

    const formatDate = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
    };

    return (
        <Box>
            <Box sx={{
                backgroundColor: REPAIRS_UI.bgPanel,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 2,
                p: 2,
                mb: 1,
            }}>
                <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 1.5, fontSize: '0.9rem' }}>
                    Status
                </Typography>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel sx={labelSx}>Status</InputLabel>
                    <Select
                        value={form.status}
                        label="Status"
                        onChange={(e) => onChange('status', e.target.value)}
                        sx={selectInputSx}
                        MenuProps={repairsMenuProps}
                    >
                        <MenuItem value="draft">Draft</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="archived">Archived</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                    <InputLabel sx={labelSx}>Channels</InputLabel>
                    <Select
                        multiple
                        value={selectedChannels}
                        onChange={handleChannelChange}
                        input={<OutlinedInput label="Channels" />}
                        renderValue={(selected) => (
                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                {selected.map(v => {
                                    const ch = CHANNELS.find(c => c.value === v);
                                    return <Chip key={v} label={ch?.label || v} size="small" />;
                                })}
                            </Stack>
                        )}
                        sx={selectInputSx}
                        MenuProps={repairsMenuProps}
                    >
                        {CHANNELS.map(ch => (
                            <MenuItem key={ch.value} value={ch.value}>
                                <Checkbox checked={selectedChannels.includes(ch.value)} size="small" sx={{ color: REPAIRS_UI.textSecondary }} />
                                <ListItemText primary={ch.label} primaryTypographyProps={{ sx: { color: REPAIRS_UI.textPrimary } }} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Accordion sx={accordionSx} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: REPAIRS_UI.textSecondary }} />}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontSize: '0.9rem', fontWeight: 600 }}>Organization</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                    <TextField fullWidth label="Artisan" size="small" value={form.artisan} onChange={(e) => onChange('artisan', e.target.value)} sx={{ ...inputSx, mb: 2 }} />
                    <Autocomplete
                        multiple
                        freeSolo
                        value={Array.isArray(form.collections) ? form.collections : []}
                        onChange={(_, newValue) => onChange('collections', newValue)}
                        options={[]}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                            ))
                        }
                        renderInput={(params) => (
                            <TextField {...params} label="Collections" size="small" placeholder="Type and Enter" sx={inputSx} />
                        )}
                        sx={{ mb: 2 }}
                    />
                    <TextField fullWidth label="Vendor" size="small" value={form.vendor} onChange={(e) => onChange('vendor', e.target.value)} sx={inputSx} />
                </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: REPAIRS_UI.textSecondary }} />}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontSize: '0.9rem', fontWeight: 600 }}>Inventory</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                    <TextField fullWidth label="Qty on hand" size="small" type="number" value={form.onHandQty} onChange={(e) => onChange('onHandQty', e.target.value)} sx={{ ...inputSx, mb: 2 }} />
                    <TextField fullWidth label="Location" size="small" value={form.location} onChange={(e) => onChange('location', e.target.value)} sx={{ ...inputSx, mb: 1 }} />
                    <FormControlLabel
                        control={<Checkbox checked={!!form.continueSelling} onChange={(e) => onChange('continueSelling', e.target.checked)} size="small" sx={{ color: REPAIRS_UI.textSecondary }} />}
                        label={<Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>Continue selling when out of stock</Typography>}
                    />
                </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: REPAIRS_UI.textSecondary }} />}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontSize: '0.9rem', fontWeight: 600 }}>Fulfillment</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                    <TextField fullWidth label="Weight (oz)" size="small" type="number" value={form.weight} onChange={(e) => onChange('weight', e.target.value)} sx={{ ...inputSx, mb: 2 }} />
                    <TextField fullWidth label="Shipping class" size="small" value={form.shippingClass} onChange={(e) => onChange('shippingClass', e.target.value)} sx={inputSx} />
                </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: REPAIRS_UI.textSecondary }} />}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontSize: '0.9rem', fontWeight: 600 }}>Related</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                    {Array.isArray(form.related) && form.related.length > 0 ? (
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                            {form.related.map((item, i) => (
                                <Chip
                                    key={i}
                                    label={item.label || `${item.type} ${item.id}`}
                                    size="small"
                                    component="a"
                                    href={`${RELATED_PATHS[item.type] || '/dashboard'}/${item.id}`}
                                    clickable
                                    variant="outlined"
                                    sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>
                            No linked designs, drops, or repairs.
                        </Typography>
                    )}
                </AccordionDetails>
            </Accordion>

            <Accordion sx={accordionSx} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: REPAIRS_UI.textSecondary }} />}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontSize: '0.9rem', fontWeight: 600 }}>History</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                    <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>Created</Typography>
                            <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>{formatDate(form.createdAt)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>Updated</Typography>
                            <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>{formatDate(form.updatedAt)}</Typography>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
}
