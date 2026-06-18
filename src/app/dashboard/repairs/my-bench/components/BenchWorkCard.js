import React, { useRef } from 'react';
import {
  Card, CardContent, CardActions, Typography, Box, Chip, Divider, Button, Checkbox,
  TextField, MenuItem, Alert,
} from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import PartsIcon from '@mui/icons-material/Category';
import QCIcon from '@mui/icons-material/VerifiedUser';
import UploadIcon from '@mui/icons-material/UploadFile';
import CommunicationsIcon from '@mui/icons-material/Forum';
import { useRouter } from 'next/navigation';

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import RepairThumbnail from '@/app/dashboard/repairs/components/RepairThumbnail';
import { BENCH_QUEUE } from '@/services/repairWorkflow';

const LANE = {
  bench_jewelry: { label: 'Bench', color: 'primary', Icon: HandymanIcon },
  cad: { label: 'CAD', color: 'info', Icon: DesignServicesIcon },
  engraving: { label: 'Engraving', color: 'secondary', Icon: HandymanIcon },
  gem_cutting: { label: 'Gem Cutting', color: 'warning', Icon: DiamondIcon },
};

const QUEUE_META = {
  [BENCH_QUEUE.UNCLAIMED]: { label: 'UNCLAIMED', color: REPAIRS_UI.textMuted },
  [BENCH_QUEUE.IN_PROGRESS]: { label: 'IN PROGRESS', color: '#0088FE' },
  [BENCH_QUEUE.COMMUNICATIONS]: { label: 'COMMUNICATIONS', color: '#A855F7' },
  [BENCH_QUEUE.WAITING_PARTS]: { label: 'NEEDS PARTS', color: '#FF8042' },
  [BENCH_QUEUE.QC]: { label: 'QC', color: '#00C49F' },
};

const btn = (extra = {}) => ({ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, fontSize: '0.75rem', ...extra });
const goldBtn = { bgcolor: REPAIRS_UI.accent, color: '#000', fontSize: '0.75rem', '&:hover': { bgcolor: '#c9a227' } };

function sourceTitle(wo) {
  const s = wo.source || {};
  if (s.kind === 'repair') return s.clientName || s.businessName || wo.sourceID;
  if (s.kind === 'piece') return s.designName || s.sku || wo.title || wo.sourceID;
  return wo.title || wo.sourceType;
}

function sourceTag(wo) {
  const s = wo.source || {};
  if (s.kind === 'repair') return 'Repair';
  if (s.kind === 'piece') return 'Piece';
  return wo.sourceType;
}

export default function BenchWorkCard({
  wo, currentUserID, isAdmin, jewelers = [], busy,
  selectable = false, isSelected = false, onToggleSelect,
  onAction, onOpenPartsDialog, onUploadStl, onUploadGlb, error,
}) {
  const router = useRouter();
  const stlInputRef = useRef(null);
  const lane = LANE[wo.discipline] || { label: wo.discipline, color: 'default', Icon: HandymanIcon };
  const LaneIcon = lane.Icon;
  const queue = QUEUE_META[wo.benchQueue] || { label: wo.status || '—', color: REPAIRS_UI.textMuted };
  const isRepair = wo.sourceType === 'repair';
  const isPiece = wo.sourceType === 'production_piece' || wo.sourceType === 'custom_piece';
  const isCad = wo.discipline === 'cad';
  const isGlbStage = isCad && wo.cadStage === 'glb';
  const fileObj = isGlbStage ? wo.files?.glb : wo.files?.stl;
  const hasFile = !!fileObj;
  const fileUrl = fileObj?.url;
  const fileLabel = isGlbStage ? 'GLB' : 'STL';
  const isCadQc = isPiece && isCad && wo.benchQueue === BENCH_QUEUE.QC;
  const isMine = wo.assignedToUserID && wo.assignedToUserID === currentUserID;
  const repairID = wo.sourceID;
  const desc = wo.source?.description || wo.description || '';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: REPAIRS_UI.bgPanel,
        backgroundImage: 'none',
        border: `1px solid ${isSelected ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
        borderLeft: '3px solid',
        borderLeftColor: `${lane.color}.main`,
        borderRadius: 2,
        boxShadow: isSelected ? `0 0 0 2px ${REPAIRS_UI.accent}33` : 'none',
      }}
    >
      <CardContent sx={{ pb: 1, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            {selectable && !isCadQc && (
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelect?.(wo.workOrderID)}
                sx={{ color: REPAIRS_UI.border, '&.Mui-checked': { color: REPAIRS_UI.accent }, p: 0 }}
              />
            )}
            <Chip
              size="small"
              icon={<LaneIcon sx={{ fontSize: 14 }} />}
              label={lane.label}
              color={lane.color}
              variant="outlined"
              sx={{ height: 22 }}
            />
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }} noWrap>
              {sourceTag(wo)} · {wo.sourceID}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {wo.isRush && <Chip label="RUSH" size="small" sx={{ bgcolor: '#FF4444', color: '#fff', fontSize: '0.65rem', height: 20 }} />}
            <Chip label={queue.label} size="small" sx={{ bgcolor: queue.color, color: '#fff', fontSize: '0.65rem', height: 20 }} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
          {isRepair && <RepairThumbnail repair={wo.source} size={82} />}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 0.5 }} noWrap>
              {sourceTitle(wo)}
            </Typography>
            {desc && (
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 1, fontSize: '0.8rem' }}>
                {desc.slice(0, 100)}{desc.length > 100 ? '…' : ''}
              </Typography>
            )}
            {wo.assignedJeweler && (
              <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted }}>
                Assigned to: {wo.assignedJeweler}
              </Typography>
            )}
            {wo.promiseDate && (
              <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.accent }}>
                Due: {new Date(wo.promiseDate).toLocaleDateString()}
              </Typography>
            )}
            {hasFile && (
              fileUrl
                ? <Typography component="a" href={fileUrl} target="_blank" rel="noreferrer" variant="caption" sx={{ display: 'block', color: '#66BB6A', textDecoration: 'underline' }}>{fileLabel} uploaded ✓ (open)</Typography>
                : <Typography variant="caption" sx={{ display: 'block', color: '#66BB6A' }}>{fileLabel} uploaded ✓</Typography>
            )}
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
      </CardContent>

      <Divider sx={{ borderColor: REPAIRS_UI.border }} />

      <CardActions sx={{ px: 1.5, py: 1, gap: 0.5, flexWrap: 'wrap' }}>
        {isRepair && (
          <Button size="small" variant="outlined" onClick={() => router.push(`/dashboard/repairs/${repairID}`)} sx={btn()}>
            View
          </Button>
        )}

        {isAdmin && isRepair && (
          <TextField
            select
            size="small"
            label="Assign Jeweler"
            value={wo.assignedToUserID || ''}
            disabled={busy || jewelers.length === 0}
            onChange={(e) => onAction(wo, e.target.value ? 'assign' : 'unclaim', e.target.value ? { userID: e.target.value } : {})}
            sx={{
              minWidth: 160,
              '& .MuiOutlinedInput-root': { bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, fontSize: '0.75rem' },
              '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted, fontSize: '0.75rem' },
              '& .MuiSelect-icon': { color: REPAIRS_UI.textSecondary },
            }}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {jewelers.map((j) => (
              <MenuItem key={j.userID} value={j.userID}>
                {[j.firstName, j.lastName].filter(Boolean).join(' ').trim() || j.name || j.email || j.userID}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* Repair: unclaimed → Claim */}
        {isRepair && !isMine && wo.benchQueue === BENCH_QUEUE.UNCLAIMED && (
          <Button size="small" variant="contained" disabled={busy} onClick={() => onAction(wo, 'claim')} sx={goldBtn}>Claim</Button>
        )}

        {/* Repair: mine in progress → Unclaim / Needs Parts / Move to QC */}
        {isRepair && isMine && wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && (
          <>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => onAction(wo, 'unclaim')} sx={btn({ color: REPAIRS_UI.textSecondary })}>Unclaim</Button>
            <Button size="small" variant="outlined" startIcon={<PartsIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => onOpenPartsDialog?.(wo)} sx={btn({ color: REPAIRS_UI.textSecondary })}>Needs Parts</Button>
            <Button size="small" variant="outlined" startIcon={<QCIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => onAction(wo, 'move-to-qc')} sx={btn({ color: '#00C49F', borderColor: '#00C49F' })}>Move to QC</Button>
          </>
        )}

        {/* Repair: waiting parts → Mark Parts Ordered / Move Back to Bench */}
        {isRepair && wo.benchQueue === BENCH_QUEUE.WAITING_PARTS && (
          <>
            {wo.status !== 'PARTS ORDERED' && (
              <Button size="small" variant="outlined" startIcon={<PartsIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => onAction(wo, 'mark-parts-ordered')} sx={btn({ color: REPAIRS_UI.textSecondary })}>Mark Parts Ordered</Button>
            )}
            <Button size="small" variant="contained" disabled={busy} onClick={() => onAction(wo, 'parts-ready-for-work')} sx={goldBtn}>Move Back to Bench</Button>
          </>
        )}

        {/* Repair: communications → Open / Complete */}
        {isRepair && wo.benchQueue === BENCH_QUEUE.COMMUNICATIONS && (
          <>
            <Button size="small" variant="outlined" startIcon={<CommunicationsIcon sx={{ fontSize: 14 }} />} onClick={() => router.push(`/dashboard/repairs/${repairID}`)} sx={btn({ color: '#A855F7', borderColor: '#A855F7' })}>Open Communication</Button>
            <Button size="small" variant="contained" disabled={busy} onClick={() => onAction(wo, 'communication-complete')} sx={goldBtn}>Communication Complete</Button>
          </>
        )}

        {/* Piece: unclaimed → Claim. QC → bulk approve bar. */}
        {isPiece && wo.benchQueue === BENCH_QUEUE.UNCLAIMED && (
          <Button size="small" variant="contained" disabled={busy} onClick={() => onAction(wo, 'claim')} sx={goldBtn}>Claim</Button>
        )}

        {/* Piece in progress: CAD uploads STL/GLB (→ QC, no hourly labor); others move to QC (logs labor). */}
        {isPiece && wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && isCad && (
          <>
            <input
              ref={stlInputRef} type="file" hidden
              accept={isGlbStage ? '.glb,model/gltf-binary,application/octet-stream' : '.stl,model/stl,application/octet-stream'}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) (isGlbStage ? onUploadGlb : onUploadStl)?.(wo, f); e.target.value = ''; }}
            />
            <Button size="small" variant="outlined" startIcon={<UploadIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => stlInputRef.current?.click()} sx={btn({ color: '#64B5F6', borderColor: '#64B5F6' })}>
              {hasFile ? `Replace ${fileLabel}` : `Upload ${fileLabel} (→ QC)`}
            </Button>
          </>
        )}
        {isPiece && wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && !isCad && (
          <Button size="small" variant="outlined" startIcon={<QCIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => onAction(wo, 'move-to-qc')} sx={btn({ color: '#00C49F', borderColor: '#00C49F' })}>Move to QC</Button>
        )}

        {/* CAD QC peer review (another CAD designer): approve (pays QC fee) or reject. */}
        {isCadQc && (
          <>
            <Button size="small" variant="contained" startIcon={<QCIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => onAction(wo, 'cad-qc-approve')} sx={goldBtn}>Approve (QC review)</Button>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => onAction(wo, 'cad-qc-reject')} sx={btn({ color: '#EF5350', borderColor: '#EF5350' })}>Reject</Button>
          </>
        )}
      </CardActions>
    </Card>
  );
}
