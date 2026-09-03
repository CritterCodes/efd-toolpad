'use client';

/**
 * Facelift primitives — MUI-free.
 *
 * Plain elements plus a CSS module: no MUI, no emotion, no Tailwind, no
 * dependencies.
 *
 * Install:
 *   src/components/facelift/index.js
 *   src/components/facelift/facelift.module.css
 *
 * MOBILE-FIRST. Every interactive surface is >= 44px. Text inputs are 16px so
 * iOS doesn't zoom the viewport on focus. Grids are single-column until there
 * is room. If a control here looks too big on a desktop mock, it is the right
 * size for the phone it will be used on.
 *
 * ── Which control for which job ───────────────────────────────────────────
 *
 * This kit exists so you never have to reach for a MUI form control on a
 * facelift screen. In particular:
 *
 *   Small option set (<= ~12 visible)   → <ChoiceList> + <ChoiceRow>
 *                                          NOT <Select>, NOT <Autocomplete>
 *   Two or three exclusive options      → <Segmented>
 *                                          NOT a <Select>, NOT a read-only chip
 *   A number you nudge (qty, hours)     → <QtyStepper>
 *                                          NOT a <TextField type="number">
 *   Large catalog you must search       → <FilterBar> / <SearchField>
 *   One primary action per screen        → <GoldButton>, in an <ActionBar>
 *
 * The pattern to avoid: a scoped list of eleven clients behind an autocomplete.
 * If the options are already narrowed, show them and let people tap.
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
  tap: 44,
};

/** Tint a hue into the chip triplet: translucent fill, border, bright fg. */
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
export function PageHeader({ badge, badgeIcon, title, subtitle, actions, boxed = true, children }) {
  return (
    <div className={cx(s.header, boxed && s.headerBoxed)}>
      <div className={s.headerBody}>
        {badge && <div className={s.badge}>{badgeIcon}{badge}</div>}
        {title && <h1 className={cx(s.title, badge && s.titleSpaced)}>{title}</h1>}
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

/** Auto-fit row of MetricCards. Single column below 480px. */
export function MetricRow({ children, min = 190 }) {
  return <div className={s.metricRow} style={{ '--fl-min': `${min}px` }}>{children}</div>;
}

/** Status chip. Tinted pill. `solid` for the one status that must shout. */
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

/** Surface card. Pass `as="button"` when the whole card activates something. */
export function SurfaceCard({ children, interactive = false, accent, as: Tag = 'div', className, style, ...rest }) {
  return (
    <Tag
      {...rest}
      className={cx(s.card, accent && s.cardAccented, interactive && s.cardInteractive, className)}
      style={accent ? { '--fl-accent': accent, ...style } : style}
    >
      {children}
    </Tag>
  );
}

/** Auto-fit card grid. Single column below 560px. */
export function CardGrid({ children, min = 300 }) {
  return <div className={s.cardGrid} style={{ '--fl-min': `${min}px` }}>{children}</div>;
}

/** The mono overline that separates stacked regions. */
export function SectionLabel({ children, className, ...rest }) {
  return <div {...rest} className={cx(s.sectionLabel, className)}>{children}</div>;
}

/**
 * Tap-to-pick list. Use this instead of a <Select> or <Autocomplete> whenever
 * the options are already narrow enough to show — a store's clients, a handful
 * of statuses, the jewelers on shift.
 *
 *   <ChoiceList>
 *     {clients.map((c) => (
 *       <ChoiceRow
 *         key={c.id}
 *         lead={initials(c)}
 *         title={c.name}
 *         meta={`${c.phone} · ${c.repairCount} repairs`}
 *         selected={c.id === selectedId}
 *         onClick={() => pick(c)}
 *       />
 *     ))}
 *     <ChoiceRow add title="New client at this store" onClick={openDialog} />
 *   </ChoiceList>
 */
export function ChoiceList({ children, className, ...rest }) {
  return <div {...rest} className={cx(s.choiceList, className)}>{children}</div>;
}

export function ChoiceRow({
  lead,
  title,
  meta,
  trailing,
  selected = false,
  add = false,
  className,
  ...rest
}) {
  return (
    <button
      type="button"
      aria-pressed={add ? undefined : selected}
      {...rest}
      className={cx(s.choiceRow, selected && s.choiceRowSelected, add && s.choiceRowAdd, className)}
    >
      {lead && <span className={s.choiceLead}>{lead}</span>}
      {add ? title : (
        <span className={s.choiceBody}>
          <span className={s.choiceTitle}>{title}</span>
          {meta && <span className={s.choiceMeta}>{meta}</span>}
        </span>
      )}
      {trailing}
    </button>
  );
}

/**
 * Two or three mutually exclusive options, as equal-width 48px targets.
 *
 *   <Segmented
 *     options={['Retail', 'Wholesale']}
 *     value={accountType}
 *     onChange={setAccountType}
 *   />
 *
 * Options may be strings or `{ value, label }`. This is a CONTROL — if the
 * choice is already made and unchangeable, use a StatusChip instead.
 */
export function Segmented({ options = [], value, onChange, className, ...rest }) {
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div role="group" {...rest} className={cx(s.segmented, className)}>
      {norm.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange && onChange(o.value)}
          className={cx(s.segment, o.value === value && s.segmentActive)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A number you nudge rather than type. 44px targets on both buttons.
 *
 *   <QtyStepper value={item.quantity} min={1} onChange={(q) => update(item, q)} />
 */
export function QtyStepper({ value = 1, min = 1, max, step = 1, onChange, label = 'Quantity' }) {
  const num = Number(value) || min;
  const set = (next) => {
    if (next < min) return;
    if (max !== undefined && next > max) return;
    if (onChange) onChange(next);
  };
  return (
    <span className={s.stepper}>
      <button
        type="button"
        className={s.stepperButton}
        onClick={() => set(num - step)}
        disabled={num <= min}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className={s.stepperValue} aria-live="polite">{num}</span>
      <button
        type="button"
        className={s.stepperButton}
        onClick={() => set(num + step)}
        disabled={max !== undefined && num >= max}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </span>
  );
}

const SearchGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/** Standalone search field, for when you need one without the filter panel. */
export function SearchField({ placeholder = 'Search…', value, onChange, className, ...rest }) {
  return (
    <div className={cx(s.search, className)}>
      <SearchGlyph />
      <input
        type="search"
        className={s.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        {...rest}
      />
    </div>
  );
}

/** Search field plus filter pills. Use for catalogs too big to list. */
export function FilterBar({ placeholder = 'Search…', value, onChange, children, boxed = true }) {
  return (
    <div className={cx(s.filterBar, boxed && s.filterBarBoxed)}>
      <SearchField placeholder={placeholder} value={value} onChange={onChange} />
      {children}
    </div>
  );
}

/** A single filter pill. Give it an onClick and anchor your own menu to it. */
export function FilterPill({ children, active = false, className, ...rest }) {
  return (
    <button type="button" {...rest} className={cx(s.pill, active && s.pillActive, className)}>
      {children}
    </button>
  );
}

/** Gold primary action. One per screen. 48px. */
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

/** Icon-only action at a full 44px target. Requires an aria-label. */
export function IconButton({ children, className, ...rest }) {
  return (
    <button type="button" {...rest} className={cx(s.iconButton, className)}>
      {children}
    </button>
  );
}

/**
 * Sticky bottom action bar. On a phone the primary action belongs under the
 * thumb, not at the end of a scroll.
 *
 *   <ActionBar>
 *     <QuietButton onClick={back}>Back</QuietButton>
 *     <GoldButton onClick={next}>Next — the work</GoldButton>
 *   </ActionBar>
 *
 * The GoldButton inside stretches; secondary actions keep their width.
 */
export function ActionBar({ children, className, ...rest }) {
  return <div {...rest} className={cx(s.actionBar, className)}>{children}</div>;
}
