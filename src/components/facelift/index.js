'use client';

/**
 * Facelift primitives.
 *
 * The repeating patterns from the Admin Facelift mock, as real components.
 * Install at src/components/facelift/index.js and import by name:
 *
 *   import { PageHeader, MetricRow, StatusChip } from '@/components/facelift';
 *
 * Why these exist: the theme handles color/type/radii and AppShell handles the
 * frame, but every page body still arranges its own content. Across the mock's
 * nineteen screens the same six patterns carry almost all of it. Converting a
 * page with these is a swap, not a redesign — which is the only way 138 pages
 * is tractable.
 *
 * These deliberately use Box + sx with literal values rather than MUI's Card /
 * Chip / Paper. The mock's card fill is a translucent white wash over the
 * ground, which is not a palette slot, and MUI's defaults fight it. Literals
 * here keep the primitives honest; the theme still governs everything built
 * from ordinary MUI components elsewhere on the page.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const GOLD = '#FBBF24';

export const facelift = {
  mono: MONO,
  gold: GOLD,
  ground: '#08090B',
  border: 'rgba(255,255,255,0.12)',
  hairline: 'rgba(255,255,255,0.09)',
  surface: 'rgba(255,255,255,0.045)',
  surfaceQuiet: 'rgba(255,255,255,0.03)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.66)',
  text3: 'rgba(255,255,255,0.5)',
  text4: 'rgba(255,255,255,0.34)',
};

/**
 * Tint a hue into the mock's chip triplet: translucent fill, matching border,
 * bright foreground. Pass any hex; get back an sx-ready object.
 *
 *   const t = tint('#34D399');  // → { backgroundColor, borderColor, color }
 */
export function tint(hue, { fill = 0.13, stroke = 0.42 } = {}) {
  const hex = hue.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return {
    backgroundColor: `rgba(${r},${g},${b},${fill})`,
    borderColor: `rgba(${r},${g},${b},${stroke})`,
    color: hue,
  };
}

/**
 * Page header. Badge + title + subtitle, optional actions on the right.
 *
 *   <PageHeader
 *     badge="Custom orders"
 *     badgeIcon={<DiamondIcon sx={{ fontSize: 14 }} />}
 *     title="Customs"
 *     subtitle="Bespoke pieces from consultation to delivery."
 *     actions={<GoldButton>New Custom</GoldButton>}
 *   />
 *
 * Omit `boxed` for a bare header (no surrounding panel) — right when the page
 * leads straight into a tab strip.
 */
export function PageHeader({
  badge,
  badgeIcon,
  title,
  subtitle,
  actions,
  boxed = true,
  children,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2.25,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        ...(boxed && {
          p: 2.75,
          border: `1px solid ${facelift.border}`,
          borderRadius: '20px',
          backgroundColor: facelift.surfaceQuiet,
        }),
      }}
    >
      <Box sx={{ flex: 1, minWidth: 280, maxWidth: 920 }}>
        {badge && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.625,
              border: `1px solid ${facelift.border}`,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.05)',
              fontFamily: MONO,
              fontSize: '0.625rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: facelift.text2,
              '& svg': { color: GOLD },
            }}
          >
            {badgeIcon}
            {badge}
          </Box>
        )}
        {title && (
          <Typography
            component="h1"
            sx={{
              mt: badge ? 1.75 : 0,
              fontWeight: 700,
              fontSize: '2.125rem',
              lineHeight: 1.03,
              letterSpacing: '-0.036em',
            }}
          >
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography
            sx={{
              mt: 1.375,
              fontSize: '0.906rem',
              lineHeight: 1.6,
              color: facelift.text2,
              textWrap: 'pretty',
            }}
          >
            {subtitle}
          </Typography>
        )}
        {children}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', flexShrink: 0 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}

/**
 * Metric card. Icon tile, big figure, mono label.
 *
 *   <MetricCard icon={<GemIcon />} value="14" label="Active" accent="#FBBF24" />
 *
 * `accent` colors the icon only. `emphasis` puts a matching border on the card,
 * for the one metric that leads.
 */
export function MetricCard({ icon, value, label, accent = GOLD, emphasis = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.625,
        px: 2.25,
        py: 2.125,
        border: `1px solid ${emphasis ? tint(accent).borderColor : facelift.border}`,
        borderRadius: '16px',
        backgroundColor: facelift.surface,
      }}
    >
      {icon && (
        <Box
          sx={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            border: `1px solid ${facelift.border}`,
            borderRadius: '13px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: accent,
            '& svg': { fontSize: 19 },
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: '1.5rem',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
        <Typography
          component="div"
          sx={{
            mt: 0.375,
            fontFamily: MONO,
            fontSize: '0.625rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: facelift.text3,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

/** Responsive auto-fit row of MetricCards. `min` sets the wrap threshold. */
export function MetricRow({ children, min = 190 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap: 1.75,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Status chip. Tinted pill for any status vocabulary.
 *
 *   <StatusChip label="in production" hue="#7DD3FC" />
 *   <StatusChip label="RUSH" hue="#F87171" solid />
 *
 * `solid` inverts to a filled chip on dark text — for the one status that must
 * shout (rush, overdue). Use it sparingly; two shouting chips is none.
 */
export function StatusChip({ label, hue = GOLD, solid = false, title }) {
  const t = tint(hue);
  return (
    <Box
      component="span"
      title={title}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.375,
        border: solid ? 'none' : `1px solid ${t.borderColor}`,
        borderRadius: 999,
        backgroundColor: solid ? hue : t.backgroundColor,
        color: solid ? facelift.ground : t.color,
        fontFamily: MONO,
        fontSize: '0.625rem',
        fontWeight: solid ? 600 : 500,
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

/**
 * Surface card. The mock's default content container.
 *
 * `interactive` adds the hover lift and a pointer — use only when the whole
 * card is a link or opens something.
 */
export function SurfaceCard({ children, interactive = false, accent, sx, ...rest }) {
  return (
    <Box
      {...rest}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: 2.25,
        border: `1px solid ${facelift.border}`,
        ...(accent && { borderLeft: `2px solid ${accent}` }),
        borderRadius: '18px',
        backgroundColor: facelift.surface,
        ...(interactive && {
          cursor: 'pointer',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
          '&:hover': { backgroundColor: facelift.surfaceHover, borderColor: GOLD },
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Auto-fit card grid. `min` sets the wrap threshold. */
export function CardGrid({ children, min = 300 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap: 1.75,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Section label. The mono overline that separates stacked regions.
 *
 *   <SectionLabel>Pending Review</SectionLabel>
 */
export function SectionLabel({ children, sx }) {
  return (
    <Typography
      component="div"
      sx={{
        fontFamily: MONO,
        fontSize: '0.688rem',
        fontWeight: 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: facelift.text3,
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

/**
 * Filter bar. Search field plus filter pills, in the mock's panel.
 *
 *   <FilterBar
 *     placeholder="Search by ID, customer, description…"
 *     value={query}
 *     onChange={(e) => setQuery(e.target.value)}
 *   >
 *     <FilterPill>All types</FilterPill>
 *     <FilterPill>Newest</FilterPill>
 *   </FilterBar>
 *
 * The pills are presentational — wire each to your own Menu or Select. This
 * exists so the row LOOKS right without dictating how filtering works.
 */
export function FilterBar({ placeholder = 'Search…', value, onChange, children, boxed = true }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.375,
        flexWrap: 'wrap',
        alignItems: 'center',
        ...(boxed && {
          p: 1.75,
          border: `1px solid ${facelift.border}`,
          borderRadius: '16px',
          backgroundColor: facelift.surfaceQuiet,
        }),
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 260,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          height: 42,
          px: 1.875,
          border: `1px solid ${facelift.border}`,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <Box
          component="input"
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-label={placeholder}
          sx={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'none',
            outline: 'none',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: '0.8125rem',
            '&::placeholder': { color: facelift.text3 },
          }}
        />
      </Box>
      {children}
    </Box>
  );
}

/** A single filter pill. Give it an onClick and anchor your own menu to it. */
export function FilterPill({ children, active = false, ...rest }) {
  return (
    <Box
      component="button"
      type="button"
      {...rest}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.125,
        height: 42,
        px: 1.875,
        border: `1px solid ${active ? tint(GOLD).borderColor : facelift.border}`,
        borderRadius: 999,
        backgroundColor: active ? tint(GOLD).backgroundColor : 'rgba(255,255,255,0.04)',
        color: active ? GOLD : facelift.text2,
        fontFamily: MONO,
        fontSize: '0.781rem',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        '&:hover': { borderColor: 'rgba(255,255,255,0.28)' },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Gold primary button. The mock's one filled action.
 *
 * Only one per view — the theme's `<Button variant="contained">` already
 * matches this, so reach for that first. This exists for the cases where you
 * need the exact pill height outside a MUI Button.
 */
export function GoldButton({ children, startIcon, ...rest }) {
  return (
    <Box
      component="button"
      type="button"
      {...rest}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 42,
        px: 2.25,
        border: 'none',
        borderRadius: 999,
        backgroundColor: GOLD,
        color: facelift.ground,
        fontFamily: 'inherit',
        fontWeight: 600,
        fontSize: '0.844rem',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        '&:hover': { backgroundColor: '#FFCF4D' },
      }}
    >
      {startIcon}
      {children}
    </Box>
  );
}
