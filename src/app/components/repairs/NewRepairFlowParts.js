import { Box, Typography, TextField, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { IconButton as TapIconButton, facelift, Segmented, ChoiceList, ChoiceRow, SearchField, SurfaceCard, StatusChip, QtyStepper } from '@/components/facelift';
import { useState, useRef, useEffect } from 'react';
import { RING_SIZES } from '@/services/repairs/smartIntakeExtractors';
import { toNumber } from '@/hooks/repairs/useNewRepairForm';
export const STEPS = [
  { key: 'who', title: 'New repair', next: 'Next — the piece' },
  { key: 'piece', title: 'The piece', next: 'Next — the work' },
  { key: 'work', title: 'Work items', next: 'Next — review' },
  { key: 'review', title: 'Review', next: null },
];

export const initials = (name = '') =>
  String(name).trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

export const CheckGlyph = ({ size = 11 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
       strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
       style={{ marginRight: 5, flexShrink: 0 }}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);

export const TrashGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const PrintGlyph = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
       style={{ marginRight: 7, flexShrink: 0 }}>
    <rect x="6" y="3" width="12" height="6" rx="1.5" />
    <path d="M6 14H4v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3h-2" />
    <rect x="6" y="13" width="12" height="8" rx="1.5" />
  </svg>
);

/**
 * The mock's per-step header: ✕ (cancel) on step 1, ‹ (back) after, the step
 * title, and right-aligned dot bars — past dim gold, current gold, rest grey.
 */
export function StepHeader({ step, title, onBack, onCancel }) {
  const isFirst = step === 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* ‹ goes back a step; ✕ always leaves the intake (a jeweler shouldn't need three backs to get out). */}
      <TapIconButton aria-label={isFirst ? 'Cancel new repair' : 'Back a step'} onClick={isFirst ? onCancel : onBack}>
        <span style={{ fontSize: 18, lineHeight: 1, color: 'rgba(255,255,255,0.6)' }}>{isFirst ? '✕' : '‹'}</span>
      </TapIconButton>
      <Typography component="h1" sx={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.016em', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title || STEPS[step].title}
      </Typography>
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <Box
            key={s.key}
            sx={{
              width: 16,
              height: 4,
              borderRadius: 999,
              backgroundColor: i < step ? 'rgba(251,191,36,0.45)' : i === step ? facelift.gold : 'rgba(255,255,255,0.16)',
            }}
          />
        ))}
        {!isFirst && (
          <TapIconButton aria-label="Cancel new repair" onClick={onCancel} style={{ marginLeft: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1, color: 'rgba(255,255,255,0.6)' }}>✕</span>
          </TapIconButton>
        )}
      </Box>
    </Box>
  );
}

/** Segmented for 2–3 options, tap-list for more. Never a dropdown. */
export function OptionPicker({ options, value, onChange, ariaLabel }) {
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  if (norm.length <= 3) {
    return <Segmented options={norm} value={value} onChange={onChange} aria-label={ariaLabel} />;
  }
  return (
    <ChoiceList aria-label={ariaLabel}>
      {norm.map((o) => (
        <ChoiceRow key={o.value} title={o.label} selected={o.value === value} onClick={() => onChange(o.value)} />
      ))}
    </ChoiceList>
  );
}

/** Collapsed value row that expands into a searchable tap-list of ring sizes. */
export function RingSizePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sizes = RING_SIZES.filter((size) => !query || String(size).startsWith(query.trim()));
  return (
    <Box>
      <ChoiceRow
        title={value ? `${label}: ${value}` : `${label} — tap to pick`}
        selected={!!value}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Box sx={{ mt: 1 }}>
          <SearchField placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Box sx={{ mt: 1, maxHeight: 240, overflowY: 'auto' }}>
            <ChoiceList>
              {sizes.map((size) => (
                <ChoiceRow
                  key={size}
                  title={String(size)}
                  selected={String(value) === String(size)}
                  onClick={() => { onChange(size); setOpen(false); setQuery(''); }}
                />
              ))}
            </ChoiceList>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** A work-item row: stepper for qty, 44px delete, price per the item kind. */
export function TicketRow({ kind, hue, item, title, fromSentence, onQuantityChange, onPriceChange, priceEditable, extraFields, beforePrice, onRemove }) {
  const unitPrice = toNumber(item.price);
  const lineTotal = unitPrice * (item.quantity || 1);
  // THE engine couldn't price this line (no metal chosen, not stocked in it…): no number, and why.
  const unpriced = item.price == null && !priceEditable;
  return (
    <SurfaceCard sx={{ p: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip label={kind} hue={hue} />
          {item.isStullerItem && <StatusChip label="Stuller" hue="#A1A1AA" />}
          {fromSentence && <StatusChip label={<><CheckGlyph size={10} />from your sentence</>} hue="#34D399" />}
        </Box>
        <TapIconButton aria-label={`Remove ${item.title || item.displayName || item.name || 'line'}`} onClick={onRemove}>
          <TrashGlyph />
        </TapIconButton>
      </Box>
      {title !== undefined ? (
        <Box sx={{ mt: 0.75 }}>{title}</Box>
      ) : (
        <Typography sx={{ mt: 0.75, fontWeight: 600, fontSize: '0.9375rem' }}>
          {item.title || item.displayName || item.name || 'Custom line'}
        </Typography>
      )}
      {title === undefined && item.description && (item.title || item.displayName || item.name) !== item.description && (
        <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.description}
        </Typography>
      )}
      {item.isStullerItem && item.stullerData && (
        <Typography variant="caption" sx={{ color: facelift.gold, display: 'block', fontFamily: facelift.mono, fontSize: '0.6875rem' }}>
          SKU {item.stullerData.itemNumber} · Stuller cost ${toNumber(item.stullerData.originalPrice).toFixed(2)}{item.stullerData.pricedAs ? ` · priced ${item.stullerData.pricedAs}` : ''}
        </Typography>
      )}
      {extraFields}
      <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <QtyStepper value={item.quantity || 1} min={1} onChange={onQuantityChange} label={`${item.title || item.description || 'item'} quantity`} />
        {beforePrice}
        {priceEditable ? (
          <TextField
            type="number"
            label="Price"
            value={item.price}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01, style: { fontSize: 16 } }}
            sx={{ width: 120 }}
          />
        ) : unpriced ? (
          <Typography sx={{ fontSize: '0.8125rem', color: '#F87171' }}>
            {item.pricingError || "Can't price this."}
          </Typography>
        ) : item.quantityTier ? (
          /* A volume tier fired: show what it would have been, so the break is visible on the
             ticket instead of the price just looking wrong. */
          <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.8125rem', color: facelift.text2 }}>
            <Box component="span" sx={{ textDecoration: 'line-through', opacity: 0.6, mr: 0.75 }}>
              ${toNumber(item.listUnitPrice).toFixed(2)}
            </Box>
            <Box component="span" sx={{ color: facelift.gold }}>${unitPrice.toFixed(2)} each</Box>
            <Box component="span" sx={{ display: 'block', fontSize: '0.6875rem' }}>
              qty {item.quantityTier.label} price
            </Box>
          </Typography>
        ) : (
          <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.8125rem', color: facelift.text2 }}>
            ${unitPrice.toFixed(2)} each
          </Typography>
        )}
        <Typography sx={{ ml: 'auto', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {unpriced ? '—' : `$${lineTotal.toFixed(2)}`}
        </Typography>
      </Box>
    </SurfaceCard>
  );
}

/** A line's description edited in place, styled as the row title — one row, not a title plus a field. */
export function InlineTitleField({ value, onChange, placeholder, ariaLabel }) {
  return (
    <TextField
      fullWidth
      variant="standard"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputProps={{ 'aria-label': ariaLabel, style: { fontSize: 16, fontWeight: 600, padding: '2px 0' } }}
      InputProps={{ disableUnderline: true }}
      sx={{ '& .MuiInputBase-root': { fontSize: '0.9375rem' } }}
    />
  );
}

/** Full-screen add sheet chrome (mock frames 3a/3b/3c). */
export function AddSheet({ open, title, onClose, children, isMobile }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
        <TapIconButton aria-label={`Close ${title}`} onClick={onClose}>
          <span style={{ fontSize: 18, lineHeight: 1, color: 'rgba(255,255,255,0.6)' }}>✕</span>
        </TapIconButton>
        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.016em' }}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>{children}</DialogContent>
    </Dialog>
  );
}

/** A review row: label · value, tap to expand its editor beneath. */
export function ReviewRow({ label, value, valueColor, editor, defaultOpen = false, autoCollapse = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const touched = useRef(false);
  // Opened by default while waiting on a value (e.g. the promise-date suggestion) → fold shut
  // when it arrives, unless the jeweler opened it themselves.
  useEffect(() => {
    if (autoCollapse && open && !touched.current) setOpen(false);
  }, [autoCollapse]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Box sx={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
      <Box
        component={editor ? 'button' : 'div'}
        type={editor ? 'button' : undefined}
        onClick={editor ? () => { touched.current = true; setOpen((o) => !o); } : undefined}
        aria-expanded={editor ? open : undefined}
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          width: '100%',
          minHeight: 44,
          py: 0.5,
          cursor: editor ? 'pointer' : 'default',
        }}
      >
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', color: facelift.text2 }}>{label}</Typography>
        <Typography sx={{ flexShrink: 0, fontFamily: facelift.mono, fontSize: '0.8125rem', fontWeight: 500, color: valueColor || '#fff', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
          {value}
        </Typography>
        {editor && <Typography component="span" sx={{ color: facelift.gold, fontFamily: facelift.mono, fontSize: '0.6875rem', flexShrink: 0 }}>{open ? 'Done' : 'Edit'}</Typography>}
      </Box>
      {editor && open && <Box sx={{ pb: 1.75 }}>{editor}</Box>}
    </Box>
  );
}

