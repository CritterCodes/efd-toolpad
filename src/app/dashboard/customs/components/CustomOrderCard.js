import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Box, Chip, Stack, Divider, Avatar, LinearProgress, Tooltip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import EventIcon from '@mui/icons-material/Event';
import ImageIcon from '@mui/icons-material/Image';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { customOrderLabel } from '@/constants/customRequest.constants';

const STATUS_COLOR = {
  pending: 'default', consultation: 'info', design: 'info', quote: 'warning',
  deposit: 'warning', in_production: 'primary', qc: 'secondary',
  completed: 'success', delivered: 'success', cancelled: 'error',
};

// How long an order can sit in a status before the card flags it. Terminal
// statuses never go stale; production is allowed the longest runway.
const STALE_DAYS = {
  pending: 7, consultation: 14, design: 21, quote: 14, deposit: 21,
  in_production: 45, qc: 7,
};

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** What this order is waiting on — the "so what" the status chip alone doesn't say. */
function nextAction(o) {
  const paid = o.payment?.totalPaid || 0;
  const total = o.quote?.total ?? o.quote?.quoteTotal ?? 0;
  const to50 = Math.max(0, total * 0.5 - paid);
  switch (o.status) {
    case 'pending': return 'Review request';
    case 'consultation': return 'Consult & start design';
    case 'design': return 'Design in progress';
    case 'quote': return o.quote?.quotePublished ? 'Awaiting client approval' : 'Publish quote';
    case 'deposit': return to50 > 0 ? `${money(to50)} more to start production` : 'Collect balance';
    case 'in_production': return o.castingReceivedAt ? 'At the bench' : 'Awaiting casting';
    case 'qc': return 'QC review';
    case 'completed': return o.payment?.isFullyPaid ? 'Arrange delivery / pickup' : 'Collect final balance';
    default: return null;
  }
}

/** Days the order has sat in its current status (from the last statusHistory entry). */
function daysInStatus(o) {
  const history = Array.isArray(o.statusHistory) ? o.statusHistory : [];
  const last = history.length ? history[history.length - 1].changedAt : o.createdAt;
  if (!last) return null;
  const ms = Date.now() - new Date(last).getTime();
  return ms > 0 ? Math.floor(ms / 86400000) : 0;
}

function Thumbs({ images = [] }) {
  if (!images.length) {
    return (
      <Box sx={{ width: 56, height: 56, borderRadius: 1, flexShrink: 0, border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', color: REPAIRS_UI.textMuted }}>
        <ImageIcon fontSize="small" />
      </Box>
    );
  }
  const shown = images.slice(0, 3);
  const extra = images.length - shown.length;
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
      {shown.map((img, i) => (
        <Box key={img.id || i} component="img" src={img.url} alt="" sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover', border: `1px solid ${REPAIRS_UI.border}` }} />
      ))}
      {extra > 0 && (
        <Box sx={{ width: 56, height: 56, borderRadius: 1, border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', fontWeight: 600 }}>
          +{extra}
        </Box>
      )}
    </Stack>
  );
}

function PaymentBar({ order }) {
  const p = order.payment;
  const total = order.quote?.total ?? order.quote?.quoteTotal ?? 0;
  if (!(total > 0)) return null;
  if (!p) {
    // Payment summary unavailable (older API response / allocation error) — still show the price.
    return (
      <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: 600, color: REPAIRS_UI.accent }}>{money(total)}</Typography>
    );
  }
  const pct = Math.min(100, p.paymentProgress || 0);
  const color = p.isFullyPaid ? '#66BB6A' : p.hasReached50 ? '#64B5F6' : '#FFB74D';
  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
          {money(p.totalPaid)} of {money(total)} paid
        </Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
          {p.isFullyPaid ? 'Paid in full' : `${pct}%`}
        </Typography>
      </Stack>
      <Tooltip title={p.isFullyPaid ? 'Paid in full' : `${money(p.remainingAmount)} outstanding · production starts at 50%`}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 5, borderRadius: 3, backgroundColor: REPAIRS_UI.bgTertiary,
            '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 },
          }}
        />
      </Tooltip>
    </Box>
  );
}

export default function CustomOrderCard({ order, onOpen }) {
  const o = order;
  const days = daysInStatus(o);
  const staleAfter = STALE_DAYS[o.status];
  const isStale = staleAfter != null && days != null && days > staleAfter;
  const action = nextAction(o);
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${isStale ? '#FFB74D66' : REPAIRS_UI.border}`, borderRadius: 2, transition: 'box-shadow 120ms ease, transform 120ms ease', '&:hover': { boxShadow: REPAIRS_UI.shadow, transform: 'translateY(-2px)' } }}>
      <CardActionArea onClick={() => onOpen(o.customID)} sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1, gap: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={(o.status || '').replace('_', ' ')} color={STATUS_COLOR[o.status] || 'default'} />
              {o.isRush && <Chip size="small" icon={<PriorityHighIcon />} label="RUSH" sx={{ bgcolor: '#FF4444', color: '#fff', height: 22 }} />}
              {o.priority === 'high' && !o.isRush && <Chip size="small" label="High" color="error" variant="outlined" />}
              {isStale && (
                <Tooltip title={`In ${(o.status || '').replace('_', ' ')} for ${days} days — needs a nudge`}>
                  <Chip size="small" label={`${days}d`} sx={{ height: 22, backgroundColor: '#FFB74D22', color: '#FFB74D', fontWeight: 700 }} />
                </Tooltip>
              )}
            </Stack>
            <Typography sx={{ fontSize: '0.7rem', color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }} noWrap>{o.customID}</Typography>
          </Stack>

          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Thumbs images={o.images} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary }} noWrap title={customOrderLabel(o)}>
                {customOrderLabel(o)}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                <Avatar sx={{ width: 18, height: 18, bgcolor: REPAIRS_UI.bgTertiary }}><PersonIcon sx={{ fontSize: 12, color: REPAIRS_UI.textSecondary }} /></Avatar>
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }} noWrap>{o.customerName || o.clientID || '—'}</Typography>
              </Stack>
              {o.description && (
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.8rem' }}>
                  {o.description}
                </Typography>
              )}
            </Box>
          </Stack>

          <PaymentBar order={o} />

          <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1 }}>
            {action ? (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                <ArrowForwardIcon sx={{ fontSize: 14, color: REPAIRS_UI.accent, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }} noWrap>{action}</Typography>
              </Stack>
            ) : <span />}
            {o.dueDate && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                <EventIcon sx={{ fontSize: 15, color: REPAIRS_UI.textSecondary }} />
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Due {new Date(o.dueDate).toLocaleDateString()}</Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
