'use client';

import React from 'react';
import FloatingActionButton from '@/app/components/fab/component';
import RoleAwareLayout from '@/components/RoleAwareLayout';
import AppShell from '@/components/AppShell';
import PageOpenBeacon from '@/components/usage/PageOpenBeacon';

export default function DashboardClientLayout({ children }) {
  return (
    <AppShell>
      <>
        <RoleAwareLayout>
          {children}
        </RoleAwareLayout>
        <FloatingActionButton />
        <PageOpenBeacon />
      </>
    </AppShell>
  );
}
