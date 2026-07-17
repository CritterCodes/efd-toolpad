import { redirect } from 'next/navigation';

/** Production index lands on Casting — the only primary production board. */
export default function ProductionIndexPage() {
  redirect('/dashboard/production/casting');
}
