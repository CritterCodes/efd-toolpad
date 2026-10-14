import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * EVERY route that recomputes an invoice's amountPaid must count ONLY completed payments.
 *
 * The cash route did not. An abandoned terminal intent sits in `payments` at status `pending`, and
 * summing the array without filtering added that phantom money to the cash actually handed over.
 * Three production invoices were overstated by $754.32 between them, every one a cash payment taken
 * after a terminal attempt was given up on.
 *
 * It was a reporting error by luck rather than by design: amountPaid feeds computePaymentStatus, so
 * a big enough pending intent would mark an invoice PAID while the customer still owed the balance.
 *
 * This reads the source of every payment route rather than exercising them, because the routes need
 * a session, a database and Stripe. A new sibling route that forgets the filter fails here.
 */

const PAYMENTS_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'repair-invoices', '[invoiceID]', 'payments');

const routeFiles = () => fs.readdirSync(PAYMENTS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => ({ name: e.name, file: path.join(PAYMENTS_DIR, e.name, 'route.js') }))
  .filter((r) => fs.existsSync(r.file));

describe('every payment route counts only completed money', () => {
  it('finds the payment routes at all', () => {
    const names = routeFiles().map((r) => r.name);
    expect(names.length).toBeGreaterThanOrEqual(4);
    expect(names).toContain('cash');
    expect(names).toContain('terminal');
  });

  for (const { name, file } of routeFiles()) {
    it(`${name}: sums payments only after filtering on status`, () => {
      const src = fs.readFileSync(file, 'utf8');

      // Does this route recompute amountPaid from the payments array at all?
      const recomputes = /const\s+amountPaid\s*=\s*(payments|correctedPayments)/.test(src)
        || /\.reduce\(\s*\(sum,\s*payment\)/.test(src);
      if (!recomputes) return; // a route that never touches amountPaid has nothing to get wrong

      // A bare `payments.reduce(` with no status filter in front of it is the defect.
      const bareSum = /(?:^|[^)])\b(payments|correctedPayments)\s*\.\s*reduce\(/m.test(src);
      const filtersOnCompleted = /status\s*===\s*'completed'/.test(src);

      expect(
        filtersOnCompleted,
        `${name}/route.js recomputes amountPaid but never filters on status === 'completed'. `
        + 'A pending or cancelled payment would be counted as money received.',
      ).toBe(true);
      expect(
        bareSum,
        `${name}/route.js sums the payments array directly. Filter to completed payments first.`,
      ).toBe(false);
    });
  }
});
