'use client';

import React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import FloatingActionButton from '@/app/components/fab/component';
import RoleAwareLayout from '@/components/RoleAwareLayout';
import DashboardBreadcrumbs from '@/components/DashboardBreadcrumbs';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function DashboardClientLayout({ children }) {
  return (
    <DashboardLayout slots={{ toolbarActions: NotificationBell }}>
      <PageContainer>
        <RoleAwareLayout>
          <DashboardBreadcrumbs />
          {children}
        </RoleAwareLayout>
      </PageContainer>
      <FloatingActionButton />
    </DashboardLayout>
  );
}