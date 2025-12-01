/**
 * Dashboard Breadcrumbs Component
 * Automatic breadcrumbs generation based on current route
 */

'use client';

import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext, Home } from '@mui/icons-material';
import { useDashboardBreadcrumbs } from '@/hooks/useDashboardBreadcrumbs';

export default function DashboardBreadcrumbs() {
  const breadcrumbs = useDashboardBreadcrumbs();

  // Don't render if no breadcrumbs or only dashboard
  if (!breadcrumbs || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Box sx={{ mb: 2, px: 1 }}>
      <Breadcrumbs 
        separator={<NavigateNext fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ 
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary'
          }
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          if (isLast) {
            return (
              <Typography 
                key={index} 
                color="text.primary" 
                sx={{ fontWeight: 500 }}
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              color="inherit"
              href={item.href}
              underline="hover"
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main'
                }
              }}
            >
              {index === 0 && <Home sx={{ mr: 0.5, fontSize: 18 }} />}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}