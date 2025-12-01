import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import ArtisanAnalytics from '@/components/artisan/ArtisanAnalytics';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export const metadata = {
  title: 'Analytics | EFD Artisan Dashboard',
  description: 'View your artisan performance analytics and metrics'
};

export default async function ArtisanAnalyticsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'artisan') {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <ArtisanAnalytics />
    </DashboardLayout>
  );
}
