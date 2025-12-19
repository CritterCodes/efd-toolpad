import React from 'react';
import type { ReactElement } from 'react';
import RepairCostingPage from './demo/RepairCostingPage';
import GuardedRoute from '../../components/admin/GuardedRoute';

export type AdminRoute = {
  path: string;
  element: ReactElement;
};

// Demo-only admin routes for this branch. Integrate into your app router by spreading into your routes tree.
export const adminDemoRoutes: AdminRoute[] = [
  {
    path: '/admin/demo/repair-costing',
    element: (
      <GuardedRoute>
        <RepairCostingPage />
      </GuardedRoute>
    ),
  },
];


