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
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Avatar,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ExpandMore,
  ExpandLess,
  Logout,
} from '@mui/icons-material';
import NotificationBell from '@/components/notifications/NotificationBell';
import { getNavigationForRole, getEffectiveRole } from '@/lib/roleBasedNavigation';

const SIDEBAR_WIDTH = 216;

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const GOLD = '#FBBF24';
const GOLD_WASH = 'rgba(251, 191, 36, 0.13)';
const GOLD_WASH_HOVER = 'rgba(251, 191, 36, 0.19)';

function buildHref(segment, parentSegment) {
  if (!segment) {
    return parentSegment ? `/${parentSegment}` : '/';
  }

  if (segment.startsWith('/')) {
    return segment;
  }

  if (segment.startsWith('dashboard/')) {
    return `/${segment}`;
  }

  if (parentSegment !== undefined) {
    return segment ? `/${parentSegment}/${segment}` : `/${parentSegment}`;
  }
  return `/${segment}`;
}

function isLeafActive(pathname, href, isChild) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (isChild) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

function getInitials(user) {
  if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user?.firstName) return user.firstName[0].toUpperCase();
  if (user?.name) {
    const parts = user.name.trim().split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
  }
  if (user?.email) return user.email[0].toUpperCase();
  return '?';
}

function NavLeaf({ item, href, active, onClose, indent }) {
  return (
    <ListItemButton
      component={Link}
      href={href}
      onClick={onClose}
      selected={active}
      sx={{
        mx: 0.75,
        pl: indent ? 3 : 1.5,
        pr: 1.5,
        py: 0.9,
        minHeight: 38,
        borderRadius: '10px',
        color: active ? GOLD : 'rgba(255,255,255,0.6)',
        backgroundColor: active ? GOLD_WASH : 'transparent',
        '&.Mui-selected': {
          backgroundColor: GOLD_WASH,
          '&:hover': { backgroundColor: GOLD_WASH_HOVER },
        },
        '&:hover': {
          backgroundColor: active ? GOLD_WASH_HOVER : 'rgba(255,255,255,0.05)',
          color: active ? GOLD : '#fff',
        },
      }}
    >
      {item.icon && (
        <ListItemIcon
          sx={{
            minWidth: 30,
            color: 'inherit',
            opacity: active ? 1 : 0.72,
          }}
        >
          {React.cloneElement(item.icon, { sx: { fontSize: 18 } })}
        </ListItemIcon>
      )}
      <ListItemText
        primary={item.title}
        primaryTypographyProps={{
          sx: {
            fontFamily: MONO,
            fontSize: indent ? '0.75rem' : '0.781rem',
            fontWeight: active ? 500 : 400,
            letterSpacing: '-0.005em',
            lineHeight: 1.35,
            color: 'inherit',
          },
        }}
      />
    </ListItemButton>
  );
}

function NavGroup({ item, pathname, onClose }) {
  const childHrefs = item.children.map(child => buildHref(child.segment, item.segment));
  const hasActiveChild = childHrefs.some(href =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
  );
  const [manualOpen, setManualOpen] = useState(hasActiveChild);
  const isOpen = manualOpen || hasActiveChild;

  useEffect(() => {
    if (hasActiveChild) {
      setManualOpen(true);
    }
  }, [hasActiveChild]);

  const handleToggle = () => {
    if (hasActiveChild) return;
    setManualOpen(prev => !prev);
  };

  return (
    <>
      <ListItemButton
        onClick={handleToggle}
        sx={{
          mx: 0.75,
          pl: 1.5,
          pr: 1.25,
          py: 0.9,
          minHeight: 38,
          borderRadius: '10px',
          color: hasActiveChild ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.6)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#fff',
          },
        }}
      >
        {item.icon && (
          <ListItemIcon sx={{ minWidth: 30, color: 'inherit', opacity: 0.72 }}>
            {React.cloneElement(item.icon, { sx: { fontSize: 18 } })}
          </ListItemIcon>
        )}
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{
            sx: {
              fontFamily: MONO,
              fontSize: '0.781rem',
              fontWeight: 400,
              letterSpacing: '-0.005em',
              lineHeight: 1.35,
              color: 'inherit',
            },
          }}
        />
        {isOpen
          ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.34)', fontSize: 17 }} />
          : <ExpandMore sx={{ color: 'rgba(255,255,255,0.34)', fontSize: 17 }} />
        }
      </ListItemButton>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pb: 0.5 }}>
          {item.children.map((child, idx) => {
            const childHref = buildHref(child.segment, item.segment);
            const childActive = isLeafActive(pathname, childHref, true);
            return (
              <NavLeaf
                key={idx}
                item={child}
                href={childHref}
                active={childActive}
                onClose={onClose}
                indent
              />
            );
          })}
        </List>
      </Collapse>
    </>
  );
}

function NavItem({ item, pathname, onClose }) {
  if (item.kind === 'divider') {
    return <Divider sx={{ my: 0.75, mx: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />;
  }

  if (item.kind === 'header') {
    return (
      <Typography
        component="div"
        sx={{
          display: 'block',
          mx: 1.5,
          mt: 2.25,
          mb: 0.75,
          fontFamily: MONO,
          fontSize: '0.594rem',
          fontWeight: 400,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.34)',
        }}
      >
        {item.title}
      </Typography>
    );
  }

  if (item.children && item.children.length > 0) {
    return <NavGroup item={item} pathname={pathname} onClose={onClose} />;
  }

  const href = buildHref(item.segment);
  const active = isLeafActive(pathname, href, false);
  return <NavLeaf item={item} href={href} active={active} onClose={onClose} indent={false} />;
}

function SidebarContent({ navigation, user, onClose }) {
  const pathname = usePathname();
  const initials = getInitials(user);
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : (user?.name || 'User');

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Branding */}
      <Box
        sx={{
          px: 2,
          display: 'flex',
          alignItems: 'center',
          minHeight: 64,
          flexShrink: 0,
        }}
      >
        <Image
          src="/logos/[efd]LogoBlack.png"
          alt="EFD"
          width={120}
          height={60}
          style={{ width: 'auto', height: 28, filter: 'invert(1) brightness(1)' }}
          priority
        />
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 1.5 }}>
        <List disablePadding>
          {navigation.map((item, idx) => (
            <NavItem key={idx} item={item} pathname={pathname} onClose={onClose} />
          ))}
        </List>
      </Box>

      {/* User section */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'rgba(255,255,255,0.09)',
          px: 1.75,
          py: 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar
            sx={{
              width: 30,
              height: 30,
              bgcolor: GOLD_WASH,
              color: GOLD,
              fontSize: '0.72rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="div"
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
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
              }}
            >
              {user?.role || ''}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            title="Sign out"
            sx={{
              color: 'rgba(255,255,255,0.44)',
              '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' },
            }}
          >
            <Logout sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

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
