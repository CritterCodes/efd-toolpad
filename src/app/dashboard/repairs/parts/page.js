import { redirect } from 'next/navigation';

export default function DeprecatedPartsPage() {
  redirect('/dashboard/repairs/my-bench');
}
