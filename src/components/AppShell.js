'use client';

/**
 * AppShell — restyled to match the Admin Facelift mock.
 *
 * Drop-in replacement for src/components/AppShell.js. Behaviour is unchanged:
 * same role-based navigation, same collapse logic, same mobile/permanent
 * drawers, same sign-out, same NotificationBell, same event listeners.
 * Only the presentation changed.
 *
 * Why this file exists: the theme sets palette, type, and radii, but the shell
 * is STRUCTURE — sidebar width, label voice, the active-item treatment, the
 * role chip. No theme can produce those. This is the frame around all 138
 * pages, so it's the single highest-leverage file for making the admin read
 * as redesigned.
 *
 * What changed from the previous shell:
 *   - Sidebar 260 → 216px, matching the mock.
 *   - Nav labels move to IBM Plex Mono 12.5px (the shop's label voice).
 *     Section headers are mono 9.5px, uppercase, .18em tracked.
 *   - Active item is a gold wash + gold text, not MUI's default selected grey.
 *   - Nav icons drop to 18px and sit muted until active.
 *   - Top bar gains the "Viewing as <ROLE>" chip and loses the duplicated
 *     brand block (the sidebar already carries the logo).
 *
 * Colours are read from the theme where a token exists and written literally
 * where the mock uses a value the palette doesn't name (the gold washes).
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
} from '@mui/icons-material';
import NotificationBell from '@/components/notifications/NotificationBell';
import { getNavigationForRole, getEffectiveRole } from '@/lib/roleBasedNavigation';
import { GOLD, GOLD_WASH, MONO, SIDEBAR_WIDTH, SidebarContent, getInitials } from './AppShellNav';

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigation, setNavigation] = useState([]);
  const { data: session } = useSession();

  const handleDrawerClose = () => setMobileOpen(false);

  useEffect(() => {
    if (!session?.user?.role) return;

    const computeNav = () => {
      const role = getEffectiveRole(session.user.role);
      setNavigation(getNavigationForRole(
        role,
        session.user.artisanTypes,
        session.user.staffCapabilities,
        session.user.employment
      ));
    };

    computeNav();

    const handleRoleChange = () => computeNav();
    const handleStorage = (e) => { if (e.key === 'devViewRole') computeNav(); };

    window.addEventListener('roleViewChanged', handleRoleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('roleViewChanged', handleRoleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [session?.user?.role, session?.user?.artisanTypes, session?.user?.staffCapabilities, session?.user?.employment]);

  const user = session?.user;
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : (user?.name || user?.email || 'User');
  const initials = getInitials(user);
  const effectiveRole = getEffectiveRole(user?.role || '');
  const roleLabel = effectiveRole.replace(/_/g, ' ');

  const sidebarContent = (
    <SidebarContent
      navigation={navigation}
      user={user}
      onClose={handleDrawerClose}
    />
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar nav */}
      <Box component="nav" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(255,255,255,0.09)',
            },
          }}
        >
          {sidebarContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              position: 'fixed',
              height: '100vh',
              overflowX: 'hidden',
              borderRight: '1px solid rgba(255,255,255,0.09)',
            },
          }}
          open
        >
          {sidebarContent}
        </Drawer>
      </Box>

      {/* Main area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'background.default',
        }}
      >
        {/* Top bar — joined to the shell, no white band, no seam. */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            zIndex: (t) => t.zIndex.drawer - 1,
            backgroundColor: 'transparent',
            backgroundImage: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <Toolbar sx={{ px: { xs: 2, md: 3.75 }, gap: 1.5, minHeight: '64px !important' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{
                mr: 0.5,
                display: { md: 'none' },
                border: 1,
                borderColor: 'rgba(255,255,255,0.14)',
              }}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flex: 1, minWidth: 0 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              {/* Role chip — the mock's "Viewing as ADMIN". */}
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  height: 28,
                  px: 1.5,
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  fontFamily: MONO,
                  fontSize: '0.625rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.62)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Viewing as {roleLabel}
              </Box>

              <Box
                sx={{
                  display: { xs: 'none', lg: 'block' },
                  textAlign: 'right',
                  minWidth: 0,
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: MONO,
                    fontSize: '0.656rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.44)',
                    lineHeight: 1.3,
                  }}
                >
                  {roleLabel}
                </Typography>
              </Box>

              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: GOLD_WASH,
                  color: GOLD,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: { xs: 'none', sm: 'flex' },
                  flexShrink: 0,
                }}
              >
                {initials}
              </Avatar>

              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <NotificationBell />
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
