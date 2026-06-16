import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Box, Chip, IconButton, Menu, MenuItem, Divider, Avatar, Stack,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import HandymanIcon from '@mui/icons-material/Handyman';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const LANE = {
  bench_jewelry: { label: 'Bench', color: 'primary', Icon: HandymanIcon },
  cad: { label: 'CAD', color: 'info', Icon: DesignServicesIcon },
  engraving: { label: 'Engraving', color: 'secondary', Icon: HandymanIcon },
  gem_cutting: { label: 'Gem Cutting', color: 'warning', Icon: DiamondIcon },
};

function statusColor(s = '') {
  if (/PROGRESS/i.test(s)) return 'primary';
  if (/QC|QUALITY/i.test(s)) return 'secondary';
  if (/READY/i.test(s)) return 'info';
  if (/PARTS|COMMUNICATION/i.test(s)) return 'warning';
  return 'default';
}

function dueStatus(promiseDate) {
  if (!promiseDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(promiseDate); d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff < 0) return { color: 'error', label: `${Math.abs(diff)}d overdue`, filled: true };
  if (diff === 0) return { color: 'warning', label: 'Due today' };
  if (diff <= 3) return { color: 'info', label: `Due in ${diff}d` };
  return { color: 'default', label: `Due ${d.toLocaleDateString()}` };
}

function sourceLabel(wo) {
  const s = wo.source || {};
  if (s.kind === 'repair') return `Repair · ${s.clientName || s.businessName || wo.sourceID}`;
  if (s.kind === 'piece') return `Piece · ${s.designName || s.sku || wo.sourceID}`;
  return wo.sourceType;
}

export default function BenchWorkCard({ wo, busy, onClaim, onComplete, onOpenRepair }) {
  const [anchor, setAnchor] = useState(null);
  const lane = LANE[wo.discipline] || { label: wo.discipline, color: 'default', Icon: HandymanIcon };
  const LaneIcon = lane.Icon;
  const due = dueStatus(wo.promiseDate);
  const isPiece = wo.sourceType === 'production_piece';
  const isRepair = wo.sourceType === 'repair';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: REPAIRS_UI.bgCard,
        backgroundImage: 'none',
        border: `1px solid ${REPAIRS_UI.border}`,
        borderLeft: '3px solid',
        borderLeftColor: `${lane.color}.main`,
        borderRadius: 2,
        transition: 'box-shadow 120ms ease, transform 120ms ease',
        '&:hover': { boxShadow: REPAIRS_UI.shadow, transform: 'translateY(-2px)' },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <Chip size="small" icon={<LaneIcon sx={{ fontSize: 15 }} />} label={lane.label} color={lane.color} variant="outlined" />
            {wo.isRush && <Chip size="small" icon={<PriorityHighIcon />} label="RUSH" color="error" sx={{ height: 24 }} />}
          </Stack>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap title={wo.title || ''}>{wo.title || '—'}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{sourceLabel(wo)}</Typography>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={wo.status || '—'} color={statusColor(wo.status || '')} />
          {due && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeIcon fontSize="small" color="action" />
              <Chip size="small" label={due.label} color={due.color} variant={due.filled ? 'filled' : 'outlined'} />
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 1 }}>
          {wo.assignedJeweler
            ? <Chip size="small" variant="outlined" color="primary" avatar={<Avatar sx={{ width: 20, height: 20 }}><PersonIcon sx={{ fontSize: 13 }} /></Avatar>} label={wo.assignedJeweler} />
            : <Chip size="small" variant="outlined" label="Unclaimed" />}
        </Box>
      </CardContent>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} {...repairsMenuProps}>
        {isPiece && !wo.assignedToUserID && <MenuItem disabled={busy} onClick={() => { onClaim(wo); setAnchor(null); }}>Claim</MenuItem>}
        {isPiece && <MenuItem disabled={busy} onClick={() => { onComplete(wo); setAnchor(null); }}>Complete (log labor)</MenuItem>}
        {isRepair && <MenuItem onClick={() => { onOpenRepair(wo); setAnchor(null); }}>Open repair</MenuItem>}
      </Menu>
    </Card>
  );
}
