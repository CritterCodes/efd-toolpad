/**
 * Breadcrumb Utilities
 * Helper functions for managing custom breadcrumbs in special cases
 */

/**
 * Custom breadcrumb hook for pages that need special breadcrumb handling
 * Use this in specific pages that need to override the default breadcrumb behavior
 */

import { useEffect } from 'react';

export function useCustomBreadcrumbs(breadcrumbs) {
  useEffect(() => {
    // This could be expanded to work with a global breadcrumb context
    // For now, it's a placeholder for future functionality
    console.log('Custom breadcrumbs set:', breadcrumbs);
  }, [breadcrumbs]);
}

/**
 * Example usage in a specific page:
 * 
 * ```jsx
 * // In your page component
 * import { useCustomBreadcrumbs } from '@/utils/breadcrumbUtils';
 * 
 * export default function SpecialPage() {
 *   // Override default breadcrumbs for this page
 *   useCustomBreadcrumbs([
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Special Section', href: '/dashboard/special' },
 *     { label: 'Special Page', href: '/dashboard/special/page' }
 *   ]);
 * 
 *   return <div>Your page content</div>;
 * }
 * ```
 */

/**
 * Utility to generate breadcrumbs for dynamic content
 */
export function generateDynamicBreadcrumbs(baseRoute, itemName, itemId) {
  const baseBreadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' }
  ];

  // Split base route and add segments
  const segments = baseRoute.split('/').filter(Boolean);
  let currentPath = '';

  segments.forEach((segment) => {
    if (segment === 'dashboard') return;
    
    currentPath += `/${segment}`;
    baseBreadcrumbs.push({
      label: formatSegmentLabel(segment),
      href: `/dashboard${currentPath}`
    });
  });

  // Add the specific item
  if (itemName && itemId) {
    baseBreadcrumbs.push({
      label: `${itemName} #${itemId.slice(-8)}`,
      href: `${baseRoute}/${itemId}`
    });
  }

  return baseBreadcrumbs;
}

/**
 * Format segment labels consistently
 */
function formatSegmentLabel(segment) {
  const labels = {
    'custom-tickets': 'Custom Tickets',
    'design-requests': 'Design Requests',
    'requests': 'Requests',
    'products': 'Products',
    'gemstones': 'Gemstones'
  };

  return labels[segment] || segment.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Breadcrumb configuration for complex nested routes
 */
export const BREADCRUMB_CONFIGS = {
  // Custom ticket detail page
  customTicketDetail: (ticketId) => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Custom Tickets', href: '/dashboard/custom-tickets' },
    { label: `Ticket #${ticketId.slice(-8)}`, href: `/dashboard/custom-tickets/${ticketId}` }
  ],

  // Design request detail page
  designRequestDetail: (requestId) => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Requests', href: '/dashboard/requests' },
    { label: 'Design Requests', href: '/dashboard/requests/design-requests' },
    { label: `Request #${requestId.slice(-8)}`, href: `/dashboard/requests/design-requests/${requestId}` }
  ],

  // Artisan custom tickets
  artisanCustomTickets: () => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Requests', href: '/dashboard/requests' },
    { label: 'My Custom Tickets', href: '/dashboard/requests/custom-tickets' }
  ],

  // Gemstone detail page
  gemstoneDetail: (gemstoneId) => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Products', href: '/dashboard/products' },
    { label: 'Gemstones', href: '/dashboard/products/gemstones' },
    { label: `Gemstone #${gemstoneId.slice(-8)}`, href: `/dashboard/products/gemstones/${gemstoneId}` }
  ]
};