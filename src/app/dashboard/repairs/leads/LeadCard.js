/**
 * One lead on the Leads board, and the board's stat cards — moved verbatim out of page.js on 2026-10-02 for
 * max-lines. Presentational: every lead action arrives as a prop (onConvert, onQuote, onToggleSelect).
 */
import { Box, Checkbox, Typography, Chip, Divider, Stack, Button, CircularProgress } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { SmartToy as BotIcon, Email as EmailIcon, Phone as PhoneIcon, RequestQuote as QuoteIcon, MoveUp as ConvertIcon, Inventory2 as InventoryIcon, Today as TodayIcon, Image as ImageIcon, AutoAwesome as AiIcon } from '@mui/icons-material';
export const formatDate = (d) => {
    if (!d) return 'Unknown';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

export const LeadCard = ({ lead, onConvert, onQuote, converting, isSelected, onToggleSelect }) => {
    const contact = lead.leadContact || lead.notes?.replace('Contact: ', '') || '';
    const contactIsEmail = isEmail(contact);

    return (
        <Box sx={{ position: 'relative' }}>
            <Box
                sx={{
                    position: 'absolute',
                    top: 8, left: 8,
                    zIndex: 2,
                }}
            >
                <Checkbox
                    checked={!!isSelected}
                    onChange={() => onToggleSelect?.(lead.repairID)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        color: REPAIRS_UI.border,
                        '&.Mui-checked': { color: REPAIRS_UI.accent },
                        backgroundColor: `${REPAIRS_UI.bgPanel}cc`,
                        borderRadius: 1,
                        p: 0.5,
                    }}
                />
            </Box>
            <Box
                sx={{
                    borderRadius: 3,
                    outline: isSelected ? `2px solid ${REPAIRS_UI.accent}` : '2px solid transparent',
                    transition: 'outline 0.15s ease',
                }}
            >
        <Box
            sx={{
                backgroundColor: REPAIRS_UI.bgPanel,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 3,
                boxShadow: REPAIRS_UI.shadow,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            {lead.picture && (
                <Box
                    component="img"
                    src={lead.picture}
                    alt="Repair item"
                    sx={{ width: '100%', height: 160, objectFit: 'cover', borderBottom: `1px solid ${REPAIRS_UI.border}` }}
                />
            )}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem', color: REPAIRS_UI.textMuted }}>
                        {lead.repairID}
                    </Typography>
                    <Chip
                        icon={<BotIcon sx={{ fontSize: 12 }} />}
                        label="GEMINI Lead"
                        size="small"
                        sx={{
                            backgroundColor: REPAIRS_UI.bgCard,
                            color: REPAIRS_UI.accent,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: REPAIRS_UI.accent }
                        }}
                    />
                </Box>

                <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: REPAIRS_UI.textHeader, lineHeight: 1.3 }}>
                    {lead.clientName}
                </Typography>

                {contact && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {contactIsEmail
                            ? <EmailIcon sx={{ fontSize: 13, color: REPAIRS_UI.textMuted }} />
                            : <PhoneIcon sx={{ fontSize: 13, color: REPAIRS_UI.textMuted }} />
                        }
                        <Typography
                            variant="body2"
                            component={contactIsEmail ? 'a' : 'span'}
                            href={contactIsEmail ? `mailto:${contact}` : undefined}
                            sx={{ color: REPAIRS_UI.accent, textDecoration: 'none', fontSize: '0.82rem', '&:hover': { textDecoration: contactIsEmail ? 'underline' : 'none' } }}
                        >
                            {contact}
                        </Typography>
                    </Box>
                )}

                <Typography
                    variant="body2"
                    sx={{
                        color: REPAIRS_UI.textSecondary,
                        flex: 1,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        fontSize: '0.82rem'
                    }}
                >
                    {lead.description || 'No description provided.'}
                </Typography>

                {lead.taskHints?.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {lead.taskHints.map((hint) => (
                            <Chip
                                key={hint}
                                label={hint}
                                size="small"
                                sx={{
                                    fontSize: '0.68rem',
                                    backgroundColor: REPAIRS_UI.bgCard,
                                    color: REPAIRS_UI.textSecondary,
                                    border: `1px solid ${REPAIRS_UI.border}`
                                }}
                            />
                        ))}
                    </Box>
                )}

                {(lead.metalType || lead.karat) && (
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                        {[lead.metalType, lead.karat, lead.goldColor].filter(Boolean).join(' · ')}
                        {lead.isRing ? ' · Ring' : ''}
                    </Typography>
                )}

                <Divider sx={{ borderColor: REPAIRS_UI.border }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                        {formatDate(lead.createdAt)}
                    </Typography>
                    {lead.aiConfidence > 0 && (
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                            AI {Math.round(lead.aiConfidence * 100)}% confident
                        </Typography>
                    )}
                </Box>

                {lead.quote?.status && lead.quote.status !== 'draft' && (
                    <Chip
                        size="small"
                        label={lead.quote.status === 'sent'
                            ? `Quoted $${Number(lead.quote.total || 0).toFixed(0)} · awaiting reply`
                            : `Estimate ${lead.quote.status}`}
                        sx={{
                            mb: 1, height: 22, fontSize: 11,
                            backgroundColor: 'transparent', border: '1px solid',
                            borderColor: lead.quote.status === 'declined' ? '#B4736A' : REPAIRS_UI.accent,
                            color: lead.quote.status === 'declined' ? '#B4736A' : REPAIRS_UI.accent,
                        }}
                    />
                )}

                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        startIcon={<QuoteIcon sx={{ fontSize: 14 }} />}
                        onClick={(e) => { e.stopPropagation(); onQuote(lead); }}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        {lead.quote ? 'Estimate' : 'Quote'}
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        href={`/dashboard/repairs/${lead.repairID}`}
                        onClick={(e) => { e.stopPropagation(); }}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        View
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        startIcon={converting === lead.repairID ? <CircularProgress size={12} sx={{ color: REPAIRS_UI.accent }} /> : <ConvertIcon />}
                        onClick={() => onConvert(lead)}
                        disabled={!!converting}
                        sx={{
                            color: REPAIRS_UI.accent,
                            borderColor: REPAIRS_UI.accent,
                            backgroundColor: REPAIRS_UI.bgCard,
                            '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary }
                        }}
                    >
                        {converting === lead.repairID ? 'Converting…' : 'Dropped off'}
                    </Button>
                </Stack>
            </Box>
        </Box>
            </Box>
        </Box>
    );
};

export const statCards = [
    { key: 'total', label: 'Total Leads', icon: InventoryIcon, getValue: (leads) => leads.length },
    { key: 'today', label: 'New Today', icon: TodayIcon, getValue: (leads) => leads.filter(r => r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString()).length },
    { key: 'photo', label: 'With Photo', icon: ImageIcon, getValue: (leads) => leads.filter(r => r.picture).length },
    { key: 'ai', label: 'AI Analyzed', icon: AiIcon, getValue: (leads) => leads.filter(r => (r.taskHints?.length || 0) > 0).length },
];

