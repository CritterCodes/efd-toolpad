import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { formatPrice } from '@/services/products/catalogFilter';
import { formatMargin } from '@/services/products/catalogFilter';
import { Card } from '@mui/material';
import { CardContent } from '@mui/material';
import { Box } from '@mui/material';
import { Typography } from '@mui/material';
import { getProductThumb } from '@/services/products/catalogFilter';
import DiamondIcon from '@mui/icons-material/Diamond';
import { Skeleton } from '@mui/material';
import { useState } from 'react';
import { Chip } from '@mui/material';
import { Tooltip } from '@mui/material';
import { IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Stack } from '@mui/material';
import { TableRow } from '@mui/material';
import { TableCell } from '@mui/material';
export const STATUS_OPTIONS = ['all', 'published', 'draft', 'approved', 'archived', 'pending'];
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

export const TYPE_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'gemstone', label: 'Gemstones' },
  { value: 'jewelry', label: 'Jewelry' },
];

export const STATUS_COLOR = {
  active: '#66BB6A',
  published: '#66BB6A',
  approved: '#66BB6A',
  Available: '#66BB6A',
  draft: REPAIRS_UI.textMuted,
  archived: REPAIRS_UI.textMuted,
  pending: '#FFB74D',
};

export function getStatusLabel(s) {
  if (!s || s === 'draft') return 'Draft';
  if (s === 'published' || s === 'active') return 'Active';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getStatusColor(s) {
  return STATUS_COLOR[s] || REPAIRS_UI.textMuted;
}

export function fmtPrice(product) {
  const p = formatPrice(product);
  if (p == null) return '—';
  return `$${p.toLocaleString()}`;
}

export function fmtMargin(product) {
  const m = formatMargin(product);
  if (m == null) return null;
  return `${Math.round(m)}%`;
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '14px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}` }}>
          <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.74rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function ProductThumb({ product, size = 56 }) {
  const url = getProductThumb(product);
  return (
    <Box sx={{ width: size, height: size, flexShrink: 0, borderRadius: 1, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <Box component="img" src={url} alt={product.title || 'Product'} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <DiamondIcon sx={{ color: REPAIRS_UI.border, fontSize: size * 0.4 }} />
      )}
    </Box>
  );
}

export function SkeletonCard() {
  return (
    <Card sx={{ height: 260, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <CardContent>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1, mb: 1, bgcolor: REPAIRS_UI.bgTertiary }} />
        <Skeleton width="60%" height={18} sx={{ bgcolor: REPAIRS_UI.bgTertiary, mb: 0.5 }} />
        <Skeleton width="40%" height={14} sx={{ bgcolor: REPAIRS_UI.bgTertiary }} />
      </CardContent>
    </Card>
  );
}

export function ProductCard({ product, selected, onToggle, onEdit, onDuplicate }) {
  const [hovered, setHovered] = useState(false);
  const isSelected = selected.has(String(product._id));
  const margin = fmtMargin(product);

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        height: '100%',
        backgroundColor: REPAIRS_UI.bgCard,
        backgroundImage: 'none',
        border: `1px solid ${isSelected ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
        borderRadius: 2,
        boxShadow: 'none',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        position: 'relative',
        '&:hover': { borderColor: REPAIRS_UI.accent },
      }}
      onClick={() => onToggle(String(product._id))}
    >
      {/* Thumbnail area */}
      <Box sx={{ position: 'relative', pt: '100%', overflow: 'hidden', borderRadius: '8px 8px 0 0', backgroundColor: REPAIRS_UI.bgTertiary }}>
        {(() => {
          const url = getProductThumb(product);
          return url ? (
            <Box component="img" src={url} alt={product.title || 'Product'} sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DiamondIcon sx={{ color: REPAIRS_UI.border, fontSize: 48 }} />
            </Box>
          );
        })()}

        {/* Type badge TL */}
        <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
          <Chip size="small" label={product.productType === 'gemstone' ? 'Gemstone' : 'Jewelry'} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: `${REPAIRS_UI.bgPanel}CC`, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />
        </Box>

        {/* Status pill TR */}
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Box sx={{ height: 20, px: 1, borderRadius: 1, display: 'flex', alignItems: 'center', backgroundColor: `${getStatusColor(product.status)}22`, border: `1px solid ${getStatusColor(product.status)}44` }}>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: getStatusColor(product.status) }}>{getStatusLabel(product.status)}</Typography>
          </Box>
        </Box>

        {/* Hover actions */}
        {hovered && (
          <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(product); }} sx={{ backgroundColor: `${REPAIRS_UI.bgPanel}DD`, color: REPAIRS_UI.accent, '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Duplicate">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDuplicate(product); }} sx={{ backgroundColor: `${REPAIRS_UI.bgPanel}DD`, color: REPAIRS_UI.textSecondary, '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <CardContent sx={{ pt: 1.25, pb: '10px !important' }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: REPAIRS_UI.textHeader, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, mb: 0.5 }}>
          {product.title || 'Untitled'}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{fmtPrice(product)}</Typography>
          {margin && <Typography sx={{ fontSize: '0.72rem', color: '#66BB6A' }}>{margin}</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProductTableRow({ product, selected, onToggle, onEdit }) {
  const isSelected = selected.has(String(product._id));
  const margin = fmtMargin(product);

  return (
    <TableRow
      onClick={() => onToggle(String(product._id))}
      sx={{ cursor: 'pointer', backgroundColor: isSelected ? `${REPAIRS_UI.accent}11` : 'transparent', '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary } }}
    >
      <TableCell sx={{ borderColor: REPAIRS_UI.border, py: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ProductThumb product={product} size={40} />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: REPAIRS_UI.textHeader }}>{product.title || 'Untitled'}</Typography>
        </Stack>
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>
        {product.productType === 'gemstone' ? 'Gemstone' : 'Jewelry'}
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>
        {product.artisanInfo?.businessName || product.artisanId || '—'}
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{fmtPrice(product)}</Typography>
          {margin && <Typography sx={{ fontSize: '0.72rem', color: '#66BB6A' }}>{margin}</Typography>}
        </Stack>
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textMuted, fontSize: '0.78rem' }}>
        {fmtDate(product.updatedAt || product.createdAt)}
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border }}>
        <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 1, backgroundColor: `${getStatusColor(product.status)}22` }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: getStatusColor(product.status) }}>{getStatusLabel(product.status)}</Typography>
        </Box>
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border }}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(product); }} sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

