import DashboardLayout, { 
  AdminOverview,
  AdminPendingApproval,
  AdminCollections,
  AdminDrops,
  AdminNotifications,
  ArtisanProducts,
  ArtisanCollections,
  ArtisanDrops,
  WholesalerCatalog
} from '@/components/dashboard/DashboardLayout';

// ============================================
// ADMIN ROUTES
// ============================================

export default function AdminOverviewPage() {
  return (
    <DashboardLayout>
      <AdminOverview />
    </DashboardLayout>
  );
}
