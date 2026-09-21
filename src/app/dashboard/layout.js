import React from 'react';
import DashboardClientLayout from '@/components/layouts/DashboardClientLayout';
import '@/styles/dashboard-print.css';

export const dynamic = 'force-dynamic';

export default function Layout({ children }) {
  return (
    <DashboardClientLayout>
      {children}
    </DashboardClientLayout>
  );
}
