import { redirect } from 'next/navigation';

/** Collections are now at Products > Collections. Redirect to canonical route. */
export default function ProductionCollectionsRedirect() {
  redirect('/dashboard/products/collections');
}
