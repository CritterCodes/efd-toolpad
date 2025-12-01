/**
 * Enhanced Dashboard Breadcrumbs Hook
 * Provides breadcrumb data for complex routing scenarios
 */

'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

// Custom breadcrumb configurations for specific routes
const CUSTOM_BREADCRUMBS = {
  '/dashboard/requests/custom-tickets': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Requests', href: '/dashboard/requests' },
    { label: 'Custom Tickets', href: '/dashboard/requests/custom-tickets' }
  ],
  '/dashboard/requests/design-requests': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Requests', href: '/dashboard/requests' },
    { label: 'Design Requests', href: '/dashboard/requests/design-requests' }
  ],
  '/dashboard/products/gemstones': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'Gemstones', href: '/dashboard/products/gemstones' }
  ]
};

// Routes that should have special handling
const DYNAMIC_ROUTES = {
  'custom-tickets': (id) => `Custom Ticket #${id.slice(-8)}`,
  'design-requests': (id) => `Design Request #${id.slice(-8)}`,
  'gemstones': (id) => `Gemstone #${id.slice(-8)}`,
  'users': (id) => 'User Profile',
  'artisans': (id) => 'Artisan Profile'
};

export function useDashboardBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check for custom breadcrumb configurations first
    if (CUSTOM_BREADCRUMBS[pathname]) {
      return CUSTOM_BREADCRUMBS[pathname];
    }

    // Parse pathname for dynamic generation
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length <= 1 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return [];
    }

    const breadcrumbItems = [];
    let currentPath = '';

    // Always start with Dashboard
    breadcrumbItems.push({
      label: 'Dashboard',
      href: '/dashboard'
    });

    // Process each segment
    segments.forEach((segment, index) => {
      if (segment === 'dashboard') return;

      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      // Handle dynamic routes
      const previousSegment = segments[index - 1];
      if (previousSegment && DYNAMIC_ROUTES[previousSegment] && isUUID(segment)) {
        breadcrumbItems.push({
          label: DYNAMIC_ROUTES[previousSegment](segment),
          href: `/dashboard${currentPath}`,
          isLast
        });
        return;
      }

      // Handle regular segments
      const label = getSegmentLabel(segment);
      breadcrumbItems.push({
        label,
        href: `/dashboard${currentPath}`,
        isLast
      });
    });

    return breadcrumbItems;
  }, [pathname]);

  return breadcrumbs;
}

// Helper functions
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function getSegmentLabel(segment) {
  const labels = {
    'custom-tickets': 'Custom Tickets',
    'design-requests': 'Design Requests',
    'requests': 'Requests',
    'products': 'Products',
    'gemstones': 'Gemstones',
    'users': 'Users',
    'artisans': 'Artisans',
    'profile': 'Profile',
    'gallery': 'Gallery',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'admin': 'Admin'
  };

  return labels[segment] || segment.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}