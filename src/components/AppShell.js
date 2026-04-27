'use client';

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

const SIDEBAR_WIDTH = 260;
const ACCENT = '#D4AF37';
const BG_PRIMARY = '#0F1115';
const BG_PANEL = '#15181D';
const BG_SECONDARY = '#171A1F';
const BG_TERTIARY = '#1F232A';
const BORDER_SUBTLE = '#2A2F38';
const TEXT_PRIMARY = '#E6E8EB';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_MUTED = '#6B7280';
const TEXT_HEADER = '#D1D5DB';

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
      sx={{
        mx: 0.75,
        pl: indent ? 4.5 : 1.75,
        pr: 1.5,
        py: 0.75,
        borderRadius: '10px',
        borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
        bgcolor: active ? BG_TERTIARY : 'transparent',
        '&:hover': {
          bgcolor: active ? BG_TERTIARY : BG_SECONDARY,
        },
        transition: 'all 0.2s ease',
        minHeight: 40,
      }}
    >
      {item.icon && (
        <ListItemIcon sx={{ minWidth: 34, color: active ? ACCENT : TEXT_SECONDARY }}>
          {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
        </ListItemIcon>
      )}
      <ListItemText
        primary={item.title}
        primaryTypographyProps={{
          sx: {
            fontSize: '0.875rem',
            fontWeight: active ? 600 : 400,
            color: active ? TEXT_PRIMARY : TEXT_SECONDARY,
            lineHeight: 1.3,
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
          pl: 1.75,
          pr: 1.5,
          py: 0.75,
          borderRadius: '10px',
          borderLeft: '2px solid transparent',
          '&:hover': { bgcolor: BG_SECONDARY },
          minHeight: 40,
        }}
      >
        {item.icon && (
          <ListItemIcon sx={{ minWidth: 34, color: TEXT_SECONDARY }}>
            {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
          </ListItemIcon>
        )}
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{
            sx: {
              fontSize: '0.875rem',
              fontWeight: 400,
              color: TEXT_SECONDARY,
              lineHeight: 1.3,
            },
          }}
        />
        {isOpen
          ? <ExpandLess sx={{ color: TEXT_MUTED, fontSize: 18 }} />
          : <ExpandMore sx={{ color: TEXT_MUTED, fontSize: 18 }} />
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
    return <Divider sx={{ borderColor: BORDER_SUBTLE, my: 0.5, mx: 1 }} />;
  }

  if (item.kind === 'header') {
    return (
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          px: 2.5,
          pt: 2,
          pb: 0.5,
          color: TEXT_MUTED,
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0B0D10' }}>
      {/* Branding */}
      <Box
        sx={{
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          minHeight: 64,
          borderBottom: `1px solid ${BORDER_SUBTLE}`,
          flexShrink: 0,
        }}
      >
        <Image
          src="/logos/[efd]LogoBlack.png"
          alt="EFD"
          width={120}
          height={60}
          style={{ width: 'auto', height: 32, filter: 'invert(1) brightness(1)' }}
          priority
        />
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List disablePadding>
          {navigation.map((item, idx) => (
            <NavItem key={idx} item={item} pathname={pathname} onClose={onClose} />
          ))}
        </List>
      </Box>

      {/* User section */}
      <Box sx={{ borderTop: `1px solid ${BORDER_SUBTLE}`, px: 2, py: 1.5, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: BG_TERTIARY,
              color: ACCENT,
              fontSize: '0.8rem',
              fontWeight: 700,
              flexShrink: 0,
              border: `1px solid ${BORDER_SUBTLE}`,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: TEXT_PRIMARY,
                fontWeight: 500,
                fontSize: '0.8125rem',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: TEXT_MUTED, textTransform: 'capitalize', fontSize: '0.7rem' }}
            >
              {user?.role || ''}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            title="Sign out"
            sx={{
              color: TEXT_MUTED,
              '&:hover': { color: TEXT_PRIMARY, bgcolor: BG_SECONDARY },
            }}
          >
            <Logout sx={{ fontSize: 18 }} />
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
  const roleLabel = getEffectiveRole(user?.role || '').replace(/_/g, ' ');

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
               bgcolor: '#0B0D10',
               border: 'none',
               borderRight: `1px solid ${BORDER_SUBTLE}`,
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
               bgcolor: '#0B0D10',
               border: 'none',
               borderRight: `1px solid ${BORDER_SUBTLE}`,
              position: 'fixed',
              height: '100vh',
              overflowX: 'hidden',
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
          backgroundColor: BG_PRIMARY,
        }}
      >
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: BG_PRIMARY,
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
            color: TEXT_PRIMARY,
            zIndex: (t) => t.zIndex.drawer - 1,
          }}
        >
          <Toolbar
            variant="dense"
            sx={{ minHeight: { xs: 56, md: 72 }, px: { xs: 2, md: 3 }, gap: 1.5 }}
          >
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{
                mr: 0.5,
                display: { md: 'none' },
                border: `1px solid ${BORDER_SUBTLE}`,
                bgcolor: BG_SECONDARY,
              }}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1.5,
                  gap: 1.25,
                  py: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: BG_SECONDARY,
                    color: ACCENT,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  [e]
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      color: TEXT_HEADER,
                      lineHeight: 1.2,
                    }}
                  >
                    Engel Fine Design
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: TEXT_SECONDARY,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontSize: '0.68rem',
                    }}
                  >
                    Admin workspace
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: { xs: 'none', lg: 'flex' },
                  alignItems: 'center',
                  gap: 1.25,
                  px: 0,
                  py: 0,
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    color: TEXT_MUTED,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }}
                >
                  Signed in
                </Typography>
                <Divider orientation="vertical" flexItem sx={{ borderColor: BORDER_SUBTLE }} />
                <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: TEXT_HEADER,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {displayName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: TEXT_SECONDARY,
                      textTransform: 'capitalize',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {roleLabel}
                  </Typography>
                </Box>
              </Box>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: BG_TERTIARY,
                  color: TEXT_PRIMARY,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: { xs: 'none', sm: 'flex' },
                  border: `1px solid ${BORDER_SUBTLE}`,
                }}
              >
                {initials}
              </Avatar>
              <Box
                sx={{
                  ml: 0.5,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `1px solid ${BORDER_SUBTLE}`,
                  bgcolor: BG_SECONDARY,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
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
