'use client';

/**
 * Facelift primitives — MUI-free.
 *
 * Same API as the MUI version, so conversions written against either one work
 * unchanged. Plain elements plus a CSS module: no MUI, no emotion, no
 * Tailwind, no dependencies.
 *
 * Install:
 *   src/components/facelift/index.js
 *   src/components/facelift/facelift.module.css
 *
 * Usage:
 *   import { PageHeader, MetricRow, MetricCard, StatusChip, SurfaceCard,
 *            CardGrid, FilterBar, FilterPill, SectionLabel, GoldButton,
 *            QuietButton, tint, facelift } from '@/components/facelift';
 *
 * One setup requirement: the token block lives on `.tokens`, so a facelift
 * subtree needs it as an ancestor. Easiest is to put it on the page wrapper:
 *
 *   import { FaceliftRoot } from '@/components/facelift';
 *   <FaceliftRoot style={{ padding: 30 }}> … </FaceliftRoot>
 *
 * Or, once you're committed, copy the `--fl-*` block from the CSS module into
 * `:root` in globals.css and drop FaceliftRoot entirely.
 */

import React from 'react';
import s from './facelift.module.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

export const facelift = {
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  gold: '#FBBF24',
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
 * bright foreground.
 *
 *   tint('#34D399')  // → { bg, border, fg }
 */
export function tint(hue, { fill = 0.13, stroke = 0.42 } = {}) {
  const hex = String(hue).replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return {
    bg: `rgba(${r},${g},${b},${fill})`,
    border: `rgba(${r},${g},${b},${stroke})`,
    fg: hue,
  };
}

/** Carries the `--fl-*` custom properties. Wrap a page (or the app) in this. */
export function FaceliftRoot({ children, className, ...rest }) {
  return (
    <div {...rest} className={cx(s.tokens, className)}>
      {children}
    </div>
  );
}

/** Page header. Badge + title + subtitle, optional actions on the right. */
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
    <div className={cx(s.header, boxed && s.headerBoxed)}>
      <div className={s.headerBody}>
        {badge && (
          <div className={s.badge}>
            {badgeIcon}
            {badge}
          </div>
        )}
        {title && (
          <h1 className={cx(s.title, badge && s.titleSpaced)}>{title}</h1>
        )}
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className={s.headerActions}>{actions}</div>}
    </div>
  );
}

/** Metric card. Icon tile, big figure, mono label. */
export function MetricCard({ icon, value, label, accent = facelift.gold, emphasis = false }) {
  const style = { '--fl-accent': accent };
  if (emphasis) style['--fl-metric-border'] = tint(accent).border;
  return (
    <div className={s.metric} style={style}>
      {icon && <div className={s.metricIcon}>{icon}</div>}
      <div style={{ minWidth: 0 }}>
        <div className={s.metricValue}>{value}</div>
        <div className={s.metricLabel}>{label}</div>
      </div>
    </div>
  );
}

/** Responsive auto-fit row of MetricCards. */
export function MetricRow({ children, min = 190 }) {
  return (
    <div className={s.metricRow} style={{ '--fl-min': `${min}px` }}>
      {children}
    </div>
  );
}

/**
 * Status chip. Tinted pill for any status vocabulary.
 *
 * `solid` inverts to a filled chip on dark text — for the one status that must
 * shout (rush, overdue). Use it sparingly; two shouting chips is none.
 */
export function StatusChip({ label, hue = facelift.gold, solid = false, title }) {
  const t = tint(hue);
  return (
    <span
      className={cx(s.chip, solid && s.chipSolid)}
      title={title}
      style={{
        '--fl-chip-bg': solid ? hue : t.bg,
        '--fl-chip-border': t.border,
        '--fl-chip-fg': solid ? facelift.ground : t.fg,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Surface card. The mock's default content container.
 *
 * `interactive` adds hover, pointer, and a focus ring. When the whole card
 * activates something, pass `as="button"` so it's keyboard-reachable.
 */
export function SurfaceCard({
  children,
  interactive = false,
  accent,
  as: Tag = 'div',
  className,
  style,
  ...rest
}) {
  return (
    <Tag
      {...rest}
      className={cx(
        s.card,
        accent && s.cardAccented,
        interactive && s.cardInteractive,
        className,
      )}
      style={accent ? { '--fl-accent': accent, ...style } : style}
    >
      {children}
    </Tag>
  );
}

/** Auto-fit card grid. */
export function CardGrid({ children, min = 300 }) {
  return (
    <div className={s.cardGrid} style={{ '--fl-min': `${min}px` }}>
      {children}
    </div>
  );
}

/** Section label. The mono overline that separates stacked regions. */
export function SectionLabel({ children, className, ...rest }) {
  return (
    <div {...rest} className={cx(s.sectionLabel, className)}>
      {children}
    </div>
  );
}

const SearchGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/**
 * Filter bar. Search field plus filter pills.
 *
 * The pills are presentational — wire each to your own menu. This exists so
 * the row looks right without dictating how filtering works.
 */
export function FilterBar({
  placeholder = 'Search…',
  value,
  onChange,
  children,
  boxed = true,
}) {
  return (
    <div className={cx(s.filterBar, boxed && s.filterBarBoxed)}>
      <div className={s.search}>
        <SearchGlyph />
        <input
          type="search"
          className={s.searchInput}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-label={placeholder}
        />
      </div>
      {children}
    </div>
  );
}

/** A single filter pill. Give it an onClick and anchor your own menu to it. */
export function FilterPill({ children, active = false, className, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(s.pill, active && s.pillActive, className)}
    >
      {children}
    </button>
  );
}

/** Gold primary action. One per view. */
export function GoldButton({ children, startIcon, className, ...rest }) {
  return (
    <button type="button" {...rest} className={cx(s.goldButton, className)}>
      {startIcon}
      {children}
    </button>
  );
}

/** Secondary action — outlined, quiet. */
export function QuietButton({ children, startIcon, className, ...rest }) {
  return (
    <button type="button" {...rest} className={cx(s.quietButton, className)}>
      {startIcon}
      {children}
    </button>
  );
}
