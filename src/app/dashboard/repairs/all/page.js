import { redirect } from 'next/navigation';

export default function AllRepairsPage() {
    redirect('/dashboard/repairs/ready-for-work');
}
