import { ListItemButton, ListItemIcon, ListItemText, Collapse, List, Divider, Typography, Box, Avatar, IconButton } from '@mui/material';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { ExpandLess, ExpandMore, Logout } from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
/**
 * The sidebar: its tokens, the three pure helpers that decide where a nav item points and whether it is the current
 * page, and the item/group/leaf components built from them. Moved verbatim out of AppShell.js on 2026-10-02 for
 * max-lines; AppShell keeps the frame (app bar, drawer, main) and renders SidebarContent.
 *
 * `buildHref` has to cope with every shape the nav configs use — a bare child segment under a parent, an absolute
 * path, and a `dashboard/…` segment with no leading slash — and `isLeafActive` special-cases `/dashboard` because a
 * prefix match there would light up every page in the app. Both are tested in AppShellNav.test.js.
 */
export const SIDEBAR_WIDTH = 216;

export const MONO = "'IBM Plex Mono', ui-monospace, monospace";
export const GOLD = '#FBBF24';
export const GOLD_WASH = 'rgba(251, 191, 36, 0.13)';
export const GOLD_WASH_HOVER = 'rgba(251, 191, 36, 0.19)';

export function buildHref(segment, parentSegment) {
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

export function isLeafActive(pathname, href, isChild) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (isChild) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function getInitials(user) {
  if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user?.firstName) return user.firstName[0].toUpperCase();
  if (user?.name) {
    const parts = user.name.trim().split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
  }
  if (user?.email) return user.email[0].toUpperCase();
  return '?';
}

export function NavLeaf({ item, href, active, onClose, indent }) {
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

export function NavGroup({ item, pathname, onClose }) {
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
        aria-expanded={isOpen}
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

export function NavItem({ item, pathname, onClose }) {
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

export function SidebarContent({ navigation, user, onClose }) {
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

