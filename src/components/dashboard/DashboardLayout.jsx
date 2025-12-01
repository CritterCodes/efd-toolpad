'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import RoleBasedNavigation from '@/components/navigation/RoleBasedNavigation';
import PendingProductsPanel from '@/components/admin/PendingProductsPanel';
import CollectionManager from '@/components/admin/CollectionManager';
import DropOrchestrationDashboard from '@/components/admin/DropOrchestrationDashboard';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import ArtisanProductManager from '@/components/artisan/ArtisanProductManager';
import ArtisanDropParticipation from '@/components/artisan/ArtisanDropParticipation';
import ArtisanEarnings from '@/components/artisan/ArtisanEarnings';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Redirect is happening
  }

  return (
    <div className={styles.dashboardLayout}>
      <aside className={styles.sidebar}>
        <RoleBasedNavigation />
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.topBarContent}>
            <h1>Dashboard</h1>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{session?.user?.name}</span>
              <span className={styles.userRole}>{session?.user?.role}</span>
            </div>
          </div>
        </header>

        <div className={styles.contentArea}>
          {children}
        </div>
      </main>
    </div>
  );
}

// Export dashboard sections as separate exports for routing
export function AdminOverview() {
  return (
    <div className={styles.sectionContainer}>
      <h2>Admin Overview</h2>
      <p>Welcome to your admin dashboard. Manage products, collections, drops, and artisans.</p>
      {/* TODO: Add overview cards/stats */}
    </div>
  );
}

export function AdminPendingApproval() {
  return (
    <div className={styles.sectionContainer}>
      <PendingProductsPanel />
    </div>
  );
}

export function AdminCollections() {
  return (
    <div className={styles.sectionContainer}>
      <CollectionManager />
    </div>
  );
}

export function AdminDrops() {
  return (
    <div className={styles.sectionContainer}>
      <DropOrchestrationDashboard />
    </div>
  );
}

export function AdminNotifications() {
  return (
    <div className={styles.sectionContainer}>
      <NotificationCenter />
    </div>
  );
}

export function AdminAnalyticsView() {
  return (
    <div className={styles.sectionContainer}>
      <AdminAnalytics />
    </div>
  );
}

// Artisan/Wholesaler views
export function ArtisanProducts() {
  return (
    <div className={styles.sectionContainer}>
      <ArtisanProductManager />
    </div>
  );
}

export function ArtisanCollections() {
  return (
    <div className={styles.sectionContainer}>
      <CollectionManager />
    </div>
  );
}

export function ArtisanDrops() {
  return (
    <div className={styles.sectionContainer}>
      <ArtisanDropParticipation />
    </div>
  );
}

export function ArtisanEarningsCenter() {
  return (
    <div className={styles.sectionContainer}>
      <ArtisanEarnings />
    </div>
  );
}

export function WholesalerCatalog() {
  return (
    <div className={styles.sectionContainer}>
      <h2>Product Catalog</h2>
      {/* TODO: Show published products available for wholesale */}
    </div>
  );
}
