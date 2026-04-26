'use client';

import React from 'react';
import NextLink from 'next/link';
import {
  Box,
  Breadcrumbs,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { NavigateNext } from '@mui/icons-material';

function normalizeBreadcrumb(item) {
  if (!item) return null;

  return {
    label: item.label || item.title || '',
    href: item.href || item.path || '',
  };
}

export function PageContainer({
  title,
  breadcrumbs,
  slots,
  children,
  maxWidth = false,
  sx,
}) {
  const normalizedBreadcrumbs = Array.isArray(breadcrumbs)
    ? breadcrumbs.map(normalizeBreadcrumb).filter((item) => item?.label)
    : [];

  const toolbar = slots?.toolbar ? slots.toolbar() : null;
  const hasHeader = Boolean(title || normalizedBreadcrumbs.length || toolbar);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: maxWidth || 'none',
        py: 2,
        ...sx,
      }}
    >
      <Stack spacing={3}>
        {hasHeader && (
          <Stack spacing={1.5}>
            {normalizedBreadcrumbs.length > 0 && (
              <Breadcrumbs
                separator={<NavigateNext fontSize="small" />}
                aria-label="breadcrumb"
              >
                {normalizedBreadcrumbs.map((item, index) => {
                  const isLast = index === normalizedBreadcrumbs.length - 1 || !item.href;

                  if (isLast) {
                    return (
                      <Typography key={`${item.label}-${index}`} color="text.primary" sx={{ fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                    );
                  }

                  return (
                    <Link
                      key={`${item.label}-${index}`}
                      component={NextLink}
                      href={item.href}
                      underline="hover"
                      color="inherit"
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            )}

            {(title || toolbar) && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'flex-start', md: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  flexDirection: { xs: 'column', md: 'row' },
                }}
              >
                {title ? (
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                    {title}
                  </Typography>
                ) : <Box />}
                {toolbar ? <Box sx={{ ml: { md: 'auto' } }}>{toolbar}</Box> : null}
              </Box>
            )}
          </Stack>
        )}

        <Box>{children}</Box>
      </Stack>
    </Box>
  );
}

export default PageContainer;
