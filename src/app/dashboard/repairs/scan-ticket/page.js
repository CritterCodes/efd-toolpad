import { redirect } from 'next/navigation';

export default function ScanTicketRedirectPage() {
  redirect('/dashboard/repairs/move?mode=scan');
}
