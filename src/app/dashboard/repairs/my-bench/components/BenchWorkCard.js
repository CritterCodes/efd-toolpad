import React, { useRef, useState } from 'react';
import {
  Card, CardContent, CardActions, Typography, Box, Chip, Divider, Button, Checkbox,
  TextField, MenuItem, Alert, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
} from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import PartsIcon from '@mui/icons-material/Category';
import FactoryIcon from '@mui/icons-material/Factory';
import QCIcon from '@mui/icons-material/VerifiedUser';
import UploadIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import ThreeDIcon from '@mui/icons-material/ViewInAr';
import PaletteIcon from '@mui/icons-material/Palette';
import CommunicationsIcon from '@mui/icons-material/Forum';
import { useRouter } from 'next/navigation';

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import RepairThumbnail from '@/app/dashboard/repairs/components/RepairThumbnail';
import GlbReviewModal from '@/components/viewers/GlbReviewModal';
import { BENCH_QUEUE } from '@/services/repairWorkflow';

const LANE = {
  bench_jewelry: { label: 'Bench', color: 'primary', Icon: HandymanIcon },
  cad: { label: 'CAD', color: 'info', Icon: DesignServicesIcon },
  engraving: { label: 'Engraving', color: 'secondary', Icon: HandymanIcon },
  gem_cutting: { label: 'Gem Cutting', color: 'warning', Icon: DiamondIcon },
  casting: { label: 'Casting', color: 'success', Icon: FactoryIcon },
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
  if (s.kind === 'piece') return s.custom?.label || s.designName || s.sku || wo.title || wo.sourceID;
  return wo.title || wo.sourceType;
}

// wo.tasks is unified across sources: repair WOs mirror the repair's rich task docs
// (title/description/processes/materials/laborHours); piece/custom WOs carry
// { process, estLaborHours }. These normalize either shape for display.
function taskLabel(t) {
  return t.title || t.process || t.processName || t.name || t.displayName || t.description || 'Task';
}
function taskHours(t) {
  const direct = Number(t.estLaborHours ?? t.laborHours ?? t.totalLaborHours ?? 0);
  if (direct > 0) return direct;
  return (t.processes || []).reduce((s, p) => s + (Number(p.laborHours) || 0), 0);
}
function taskMaterials(t) {
  return (t.materials || []).map((m) => m.displayName || m.materialName || m.name).filter(Boolean);
}

function sourceTag(wo) {
  const s = wo.source || {};
  if (s.kind === 'repair') return 'Repair';
  if (s.kind === 'piece') return s.custom ? 'Custom' : 'Piece';
  return wo.sourceType;
}

export default function BenchWorkCard({
  wo, currentUserID, isAdmin, jewelers = [], busy,
  selectable = false, isSelected = false, onToggleSelect,
  onAction, onOpenPartsDialog, onUploadStl, onUploadGlb, error,
}) {
  const router = useRouter();
  const stlInputRef = useRef(null);
  const [glbReviewOpen, setGlbReviewOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [signedOff, setSignedOff] = useState({}); // task index → checked
  const [handoffTarget, setHandoffTarget] = useState('');
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
  const customOrderID = wo.source?.custom?.customID || null;
  // Admins can split any task off a multi-task piece WO to a specific jeweler (before QC).
  const canSplit = isAdmin && isPiece && (wo.tasks?.length > 1) && wo.benchQueue !== BENCH_QUEUE.QC && jewelers.length > 0;
  const isMine = wo.assignedToUserID && wo.assignedToUserID === currentUserID;
  const repairID = wo.sourceID;
  const custom = wo.source?.custom || null;
  const desc = wo.source?.description || wo.description || '';

  // Bench handoff: the assignee (or an admin on their behalf) signs off the tasks they did
  // and hands the rest off. Tasks already stamped completedByUserID are done/credited.
  const repairTasks = isRepair && Array.isArray(wo.tasks) ? wo.tasks : [];
  const uncreditedTaskIndexes = repairTasks.reduce((acc, t, i) => { if (!t?.completedByUserID) acc.push(i); return acc; }, []);
  const canHandoff = isRepair && wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && (isMine || isAdmin) && uncreditedTaskIndexes.length > 0;
  const checkedIndexes = uncreditedTaskIndexes.filter((i) => signedOff[i]);
  const allUncreditedChecked = uncreditedTaskIndexes.length > 0 && checkedIndexes.length === uncreditedTaskIndexes.length;
  const closeHandoff = () => { setHandoffOpen(false); setSignedOff({}); setHandoffTarget(''); };
  const submitHandoff = () => {
    if (!checkedIndexes.length) return;
    onAction(wo, 'handoff', { completedTaskIndexes: checkedIndexes, assignToUserID: allUncreditedChecked ? null : (handoffTarget || null) });
    closeHandoff();
  };

  return (
    <>
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
            {custom?.customerName && (
              <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textSecondary }}>
                Customer: {custom.customerName}
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

        {Array.isArray(wo.tasks) && wo.tasks.length > 0 && (
          <Box sx={{ mt: 1.25, pt: 1, borderTop: `1px dashed ${REPAIRS_UI.border}` }}>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
              Tasks ({wo.tasks.length})
            </Typography>
            <Stack spacing={0.5}>
              {wo.tasks.map((t, i) => {
                const hours = taskHours(t);
                const mats = taskMaterials(t);
                const detail = t.description && t.description !== taskLabel(t) ? t.description : '';
                return (
                  <Box key={i} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline', minWidth: 0 }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: REPAIRS_UI.accent, mt: '5px', flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textPrimary, fontSize: '0.78rem' }}>
                          {taskLabel(t)}{hours > 0 && <Box component="span" sx={{ color: REPAIRS_UI.textMuted }}> · {hours}h</Box>}
                        </Typography>
                        {detail && <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, fontSize: '0.68rem' }}>{detail.slice(0, 90)}{detail.length > 90 ? '…' : ''}</Typography>}
                        {mats.length > 0 && <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, fontSize: '0.68rem' }}>parts: {mats.join(', ')}</Typography>}
                      </Box>
                    </Box>
                    {canSplit && (
                      <TextField
                        select size="small" value="" disabled={busy}
                        SelectProps={{ displayEmpty: true, renderValue: () => 'Split →' }}
                        onChange={(e) => { if (e.target.value) onAction(wo, 'split-task', { taskIndex: i, assignToUserID: e.target.value }); }}
                        sx={{ flexShrink: 0, minWidth: 96, '& .MuiInputBase-root': { fontSize: '0.7rem', bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textSecondary }, '& .MuiSelect-icon': { color: REPAIRS_UI.textMuted } }}
                      >
                        {jewelers.map((j) => (
                          <MenuItem key={j.userID} value={j.userID} sx={{ fontSize: '0.75rem' }}>
                            {[j.firstName, j.lastName].filter(Boolean).join(' ').trim() || j.name || j.email || j.userID}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
      </CardContent>

      <Divider sx={{ borderColor: REPAIRS_UI.border }} />

      <CardActions sx={{ px: 1.5, py: 1, gap: 0.5, flexWrap: 'wrap' }}>
        {isRepair && (
          <Button size="small" variant="outlined" onClick={() => router.push(`/dashboard/repairs/${repairID}`)} sx={btn()}>
            View
          </Button>
        )}

        {isPiece && custom?.customID && (
          <Button size="small" variant="outlined" onClick={() => router.push(`/dashboard/customs/${custom.customID}`)} sx={btn()}>
            View Custom
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

        {/* Repair in progress (the assignee, or an admin acting on their behalf):
            Unclaim / Needs Parts / Sign off & hand off / Move to QC */}
        {isRepair && (isMine || isAdmin) && wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && (
          <>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => onAction(wo, 'unclaim')} sx={btn({ color: REPAIRS_UI.textSecondary })}>Unclaim</Button>
            <Button size="small" variant="outlined" startIcon={<PartsIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => onOpenPartsDialog?.(wo)} sx={btn({ color: REPAIRS_UI.textSecondary })}>Needs Parts</Button>
            {canHandoff && repairTasks.length > 1 && (
              <Button size="small" variant="outlined" startIcon={<HandymanIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => setHandoffOpen(true)} sx={btn({ color: '#E0A33E', borderColor: '#E0A33E' })}>Sign off &amp; hand off</Button>
            )}
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

        {/* Piece in progress: STL uploads → QC; GLB uploads then needs materials assigned
            (Assign materials → that submits to QC). Others move to QC (logs labor). */}
        {isPiece && wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && isCad && (
          <>
            <input
              ref={stlInputRef} type="file" hidden
              accept={isGlbStage ? '.glb,model/gltf-binary,application/octet-stream' : '.stl,model/stl,application/octet-stream'}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) (isGlbStage ? onUploadGlb : onUploadStl)?.(wo, f); e.target.value = ''; }}
            />
            <Button size="small" variant="outlined" startIcon={<UploadIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => stlInputRef.current?.click()} sx={btn({ color: '#64B5F6', borderColor: '#64B5F6' })}>
              {hasFile ? `Replace ${fileLabel}` : (isGlbStage ? 'Upload GLB' : 'Upload STL (→ QC)')}
            </Button>
            {isGlbStage && hasFile && customOrderID && (
              <Button size="small" variant="contained" startIcon={<PaletteIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => router.push(`/dashboard/customs/${customOrderID}/assign-materials?wo=${wo.workOrderID}`)} sx={goldBtn}>
                Assign materials → QC
              </Button>
            )}
          </>
        )}
        {isPiece && wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && !isCad && (
          <Button size="small" variant="outlined" startIcon={<QCIcon sx={{ fontSize: 14 }} />} disabled={busy} onClick={() => onAction(wo, 'move-to-qc')} sx={btn({ color: '#00C49F', borderColor: '#00C49F' })}>Move to QC</Button>
        )}

        {/* CAD QC peer review (another CAD designer): review the model, then approve (pays QC fee) or reject.
            GLB → inspect in the REFRAKT 3D viewer (same renderer the client sees); STL → download to review. */}
        {isCadQc && (
          <>
            {isGlbStage ? (
              <Button
                size="small" variant="outlined" startIcon={<ThreeDIcon sx={{ fontSize: 14 }} />}
                disabled={!fileUrl} onClick={() => setGlbReviewOpen(true)}
                sx={btn({ color: '#64B5F6', borderColor: '#64B5F6' })}
              >
                {hasFile ? 'Review GLB (3D)' : 'No GLB to review'}
              </Button>
            ) : (
              <Button
                size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                component="a" href={fileUrl || undefined} target="_blank" rel="noreferrer" disabled={!fileUrl}
                sx={btn({ color: '#64B5F6', borderColor: '#64B5F6' })}
              >
                {hasFile ? `Review ${fileLabel}` : `No ${fileLabel} to review`}
              </Button>
            )}
            <Button size="small" variant="contained" startIcon={<QCIcon sx={{ fontSize: 14 }} />} disabled={busy || !hasFile} onClick={() => onAction(wo, 'cad-qc-approve')} sx={goldBtn}>Approve (QC review)</Button>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => onAction(wo, 'cad-qc-reject')} sx={btn({ color: '#EF5350', borderColor: '#EF5350' })}>Reject</Button>
          </>
        )}
      </CardActions>
    </Card>
    {isCadQc && isGlbStage && (
      <GlbReviewModal
        open={glbReviewOpen}
        onClose={() => setGlbReviewOpen(false)}
        glbUrl={fileUrl}
        title={`GLB — ${sourceTitle(wo)}`}
      />
    )}

    <Dialog open={handoffOpen} onClose={closeHandoff} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Sign off &amp; hand off</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5 }}>
          Check the tasks you completed — you&apos;re credited for those when the repair passes QC.
          Hand the rest to another jeweler, or leave it for the open queue. Check everything to send it straight to QC.
        </Typography>
        <Stack spacing={0.5}>
          {repairTasks.map((t, i) => (
            t.completedByUserID ? (
              <Typography key={i} variant="body2" sx={{ color: REPAIRS_UI.textMuted, pl: 0.5 }}>
                ✓ {taskLabel(t)}{taskHours(t) > 0 ? ` · ${taskHours(t)}h` : ''}{t.completedByName ? ` — ${t.completedByName}` : ''}
              </Typography>
            ) : (
              <FormControlLabel
                key={i}
                control={<Checkbox checked={!!signedOff[i]} disabled={busy}
                  onChange={(e) => setSignedOff((s) => ({ ...s, [i]: e.target.checked }))}
                  sx={{ color: REPAIRS_UI.border, '&.Mui-checked': { color: REPAIRS_UI.accent } }} />}
                label={`${taskLabel(t)}${taskHours(t) > 0 ? ` · ${taskHours(t)}h` : ''}`}
                sx={{ color: REPAIRS_UI.textPrimary, '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
              />
            )
          ))}
        </Stack>
        {!allUncreditedChecked && (
          <TextField
            select fullWidth size="small" label="Hand to (optional — blank = open queue)"
            value={handoffTarget} disabled={busy} onChange={(e) => setHandoffTarget(e.target.value)}
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary }, '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted } }}
          >
            <MenuItem value="">Open queue (anyone can claim)</MenuItem>
            {jewelers.filter((j) => j.userID !== wo.assignedToUserID).map((j) => (
              <MenuItem key={j.userID} value={j.userID}>
                {[j.firstName, j.lastName].filter(Boolean).join(' ').trim() || j.name || j.email || j.userID}
              </MenuItem>
            ))}
          </TextField>
        )}
        {allUncreditedChecked && (
          <Alert severity="info" sx={{ mt: 2, bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }}>
            All remaining tasks checked — this will send the repair to QC.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={closeHandoff} disabled={busy} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button variant="contained" disabled={busy || !checkedIndexes.length} onClick={submitHandoff} sx={goldBtn}>
          {allUncreditedChecked ? 'Sign off & send to QC' : 'Sign off & hand off'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
