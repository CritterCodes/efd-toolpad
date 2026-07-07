import { redirect } from 'next/navigation';

/** Production catalog has no index of its own — land on Drops. */
export default function ProductionIndexPage() {
  redirect('/dashboard/production/drops');
}
