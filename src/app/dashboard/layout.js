"use client";
import React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import FloatingActionButton from '../components/fab/component';
import RoleAwareLayout from '@/components/RoleAwareLayout';

export default function Layout({ children }) {
  return (
    <DashboardLayout>
      <PageContainer>
        <RoleAwareLayout>
          {children}
        </RoleAwareLayout>
      </PageContainer>
      <FloatingActionButton />
    </DashboardLayout>
  );
}
