'use client';

/**
 * Skeletons — the shape of what is coming.
 *
 * Split out of `index.js` on 2026-10-02 when adding the table and card shapes pushed the kit past the
 * 400-line ceiling. The ratchet only goes down, so the file splits rather than the rule bending.
 *
 * Re-exported from `index.js`, so every caller still imports from '@/components/facelift'.
 */

import React from 'react';
import s from './facelift.module.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Skeleton({ width = '100%', height = 16, radius = 8, className, ...rest }) {
  return (
    <span
      {...rest}
      aria-hidden="true"
      className={cx(s.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/**
 * The route-level loading state. efd-admin has never had one: there are no `loading.js` files anywhere
 * under `src/app`, and 130 files place a `<CircularProgress />` by hand instead — usually centred in a
 * 50vh box, so the content area blanks, a spinner floats in the middle of nothing, and the page snaps in.
 *
 * This keeps the page's shape: a title bar and a few rows, in the sizes real content will take.
 */
export function LoadingPage({ label = 'Loading', rows = 3, shape = 'panel' }) {
  return (
    <div
      className={shape === 'panel' ? s.statePage : s.statePageWide}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <Skeleton width="42%" height={30} radius={10} />
      <Skeleton width="68%" height={14} />
      {shape === 'table' ? <SkeletonTable rows={rows > 3 ? rows : 8} /> : null}
      {shape === 'cards' ? <SkeletonCards count={rows > 3 ? rows : 8} /> : null}
      {shape === 'panel' ? (
        <div className={s.stateRows}>
          {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={74} radius={16} />)}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A list that is about to be a table.
 *
 * `/dashboard/loading.js` already stops every dashboard route from blanking, but it draws the same three
 * soft panels whether the destination is a table of 40 repair tickets or a grid of product cards — so the
 * page still *changes shape* under the reader the moment it loads. A skeleton that is the wrong shape is a
 * second layout shift wearing a disguise.
 *
 * The header row is dimmer than the body rows for the same reason a real table's is: it is not data.
 */
export function SkeletonTable({ rows = 8, cols = 5 }) {
  const widths = ['22%', '26%', '16%', '18%', '12%', '14%'];
  return (
    <div className={s.skeletonTable}>
      <div className={cx(s.skeletonRow, s.skeletonRowHead)}>
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} width={widths[c % widths.length]} height={10} radius={4} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={s.skeletonRow}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} width={widths[(c + r) % widths.length]} height={13} radius={5} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A grid that is about to be cards. Same `min` as `CardGrid`, so the columns land where they will land. */
export function SkeletonCards({ count = 8, min = 300 }) {
  return (
    <div className={s.cardGrid} style={{ '--fl-min': `${min}px` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.skeletonCard}>
          <Skeleton height={104} radius={12} />
          <Skeleton width="72%" height={15} />
          <Skeleton width="44%" height={11} />
        </div>
      ))}
    </div>
  );
}

/**
 * The route-level error state. Plain language, a way out, and the digest — never the stack, which tells a
 * jeweler nothing and tells everyone else too much.
 */
