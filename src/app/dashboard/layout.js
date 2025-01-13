"use client";
import React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function Layout({ children }) {
  return (
    <DashboardLayout>
      <PageContainer>{children}</PageContainer>
    </DashboardLayout>
  );
}
