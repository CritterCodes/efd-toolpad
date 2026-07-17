import { redirect } from 'next/navigation';

/** Designs are now managed from a Drop detail page. Redirect to canonical Products > Drops. */
export default function ProductionDesignsRedirect() {
  redirect('/dashboard/products/drops');
}
