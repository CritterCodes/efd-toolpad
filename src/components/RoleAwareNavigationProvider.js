/**
 * Role-Aware Navigation Provider
 * Legacy Toolpad provider replacement.
 * Keeps the shared MUI theme applied while Toolpad is removed.
 */

'use client';

import React from 'react';
import ClientThemeProvider from '@/components/ThemeProvider';

export default function RoleAwareNavigationProvider({ children }) {
  return <ClientThemeProvider>{children}</ClientThemeProvider>;
}
