import { redirect } from 'next/navigation';

/** Production catalog has no index of its own — land on Collections (Drops). */
export default function ProductionIndexPage() {
  redirect('/dashboard/production/collections');
}
