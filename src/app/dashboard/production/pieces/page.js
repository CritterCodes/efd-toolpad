import { redirect } from 'next/navigation';

/** Pieces are managed from a Drop detail page. Redirect to canonical Products > Drops. */
export default function ProductionPiecesRedirect() {
  redirect('/dashboard/products/drops');
}
