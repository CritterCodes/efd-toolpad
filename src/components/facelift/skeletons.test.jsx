// @vitest-environment jsdom
//
// The loading state is the one screen nobody can screenshot: it exists for the few hundred milliseconds
// between a click and the data, and the views crawl only ever photographs the settled page. So it is
// rendered here instead — the shape, the counts, and what a screen reader is told.
//
// What the shapes are FOR: `/dashboard/loading.js` already stopped routes blanking, but it drew the same
// three soft panels whichever route was coming, so the page still changed shape under the reader at the
// moment it loaded.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { LoadingPage, SkeletonTable, SkeletonCards } from './skeletons';

const bars = (c) => c.querySelectorAll('[class*=skeleton]');

afterEach(cleanup);

describe('a skeleton table', () => {
  it('draws a header row and a body row per record', () => {
    const { container } = render(<SkeletonTable rows={6} cols={4} />);
    const rows = container.querySelectorAll('[class*=skeletonRow]');
    expect(rows).toHaveLength(7); // 6 + the header
    expect(rows[0].className).toMatch(/skeletonRowHead/);
  });

  it('draws one bar per column', () => {
    const { container } = render(<SkeletonTable rows={2} cols={5} />);
    expect(container.querySelectorAll('[class*=skeletonRow]')[1].children).toHaveLength(5);
  });
});

describe('a skeleton card grid', () => {
  it('uses the same grid as the real cards, so columns do not move when data lands', () => {
    const { container } = render(<SkeletonCards count={4} min={260} />);
    const grid = container.firstChild;
    expect(grid.className).toMatch(/cardGrid/);
    expect(grid.getAttribute('style')).toContain('260px');
    expect(grid.children).toHaveLength(4);
  });
});

describe('the loading page', () => {
  it('stays a narrow panel by default, so nothing that exists changed', () => {
    const { container } = render(<LoadingPage />);
    expect(container.firstChild.className).toMatch(/statePage\b|statePage_/);
    expect(container.querySelectorAll('[class*=skeletonRow]')).toHaveLength(0);
    expect(container.querySelectorAll('[class*=cardGrid]')).toHaveLength(0);
  });

  it('draws a table when the route is a table', () => {
    const { container } = render(<LoadingPage shape="table" label="Loading repairs" />);
    expect(container.querySelectorAll('[class*=skeletonRow]').length).toBeGreaterThan(1);
    expect(container.querySelectorAll('[class*=cardGrid]')).toHaveLength(0);
  });

  it('draws cards when the route is cards', () => {
    const { container } = render(<LoadingPage shape="cards" label="Loading the catalogue" />);
    expect(container.querySelectorAll('[class*=cardGrid]')).toHaveLength(1);
    expect(container.querySelectorAll('[class*=skeletonRow]')).toHaveLength(0);
  });

  it('announces itself once, and the bars not at all', () => {
    const { container } = render(<LoadingPage shape="table" label="Loading repairs" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveAccessibleName('Loading repairs');
    // Every bar is decoration. A screen reader reading forty of them would be worse than silence.
    for (const bar of bars(container)) {
      if (bar.tagName === 'SPAN') expect(bar).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('is wider than the panel for a table or a grid, which need the page', () => {
    const { container: panel } = render(<LoadingPage />);
    const panelCls = panel.firstChild.className;
    cleanup();
    const { container: wide } = render(<LoadingPage shape="table" />);
    expect(wide.firstChild.className).not.toBe(panelCls);
  });
});
