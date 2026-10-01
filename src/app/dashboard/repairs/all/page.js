import { redirect } from 'next/navigation';

export default function AllRepairsPage() {
    // My Bench replaced Ready for Work (owner, 2026-10-01).
    redirect('/dashboard/repairs/my-bench');
}
