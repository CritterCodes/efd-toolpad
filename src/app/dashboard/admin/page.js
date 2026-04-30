'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import {
  Build as TasksIcon,
  Settings as SettingsIcon,
  Inventory as MaterialsIcon,
  Add as AddIcon,
  List as ListIcon,
  Person as ArtisanIcon,
  ArrowForward as ArrowIcon,
  Work as BenchIcon,
  QrCodeScanner as ScanIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const C = {
  bgPanel: '#15181D', bgCard: '#171A1F', bgTertiary: '#1F232A',
  border: '#2A2F38', textHeader: '#D1D5DB', textSecondary: '#9CA3AF',
  textMuted: '#6B7280', accent: '#D4AF37', shadow: '0 8px 24px rgba(0,0,0,0.45)',
};

export default function AdminPage() {
  const router = useRouter();

  const adminSections = [
    {
      title: 'Task Management',
      description: 'Manage repair tasks, laser engraving, and 3D design',
      icon: <TasksIcon />,
      actions: [
        { label: 'View All Tasks', path: '/dashboard/admin/tasks', icon: <ListIcon fontSize="small" />, primary: true },
        { label: 'Create Task', path: '/dashboard/admin/tasks/create', icon: <AddIcon fontSize="small" /> },
      ]
    },
    {
      title: 'Repair Tools',
      description: 'Open bench work, scan tickets, and move repairs through the shop',
      icon: <BenchIcon />,
      actions: [
        { label: 'My Bench', path: '/dashboard/repairs/my-bench', icon: <BenchIcon fontSize="small" />, primary: true },
        { label: 'Scan Tickets', path: '/dashboard/repairs/move?mode=scan', icon: <ScanIcon fontSize="small" /> },
      ]
    },
    {
      title: 'Materials Management',
      description: 'Manage repair materials, supplies, and inventory',
      icon: <MaterialsIcon />,
      actions: [
        { label: 'Manage Materials', path: '/dashboard/admin/tasks/materials', icon: <MaterialsIcon fontSize="small" />, primary: true },
      ]
    },
    {
      title: 'Artisan Management',
      description: 'Review and manage artisan partnership applications',
      icon: <ArtisanIcon />,
      actions: [
        { label: 'Manage Applications', path: '/dashboard/admin/artisans', icon: <ArtisanIcon fontSize="small" />, primary: true },
      ]
    },
    {
      title: 'System Settings',
      description: 'Configure pricing, business settings, and system preferences',
      icon: <SettingsIcon />,
      actions: [
        { label: 'System Settings', path: '/dashboard/admin/settings', icon: <SettingsIcon fontSize="small" />, primary: true },
      ]
    }
  ];

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: C.bgPanel,
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          boxShadow: C.shadow,
          p: { xs: 2, sm: 3 },
          mb: 3,
        }}
      >
        <Chip
          label="Admin workspace"
          sx={{ mb: 1.5, borderRadius: 2, backgroundColor: C.bgCard, color: C.textHeader, border: `1px solid ${C.border}`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em' }}
        />
        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: C.textHeader, mb: 0.5 }}>
          Admin Dashboard
        </Typography>
        <Typography sx={{ color: C.textSecondary }}>
          Manage tasks, materials, artisans, and system settings.
        </Typography>
      </Box>

      {/* Section cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {adminSections.map((section) => (
          <Grid item xs={12} sm={6} key={section.title}>
            <Box
              sx={{
                backgroundColor: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center',
                    backgroundColor: C.bgTertiary, color: C.accent, border: `1px solid ${C.border}`, flexShrink: 0,
                  }}
                >
                  {section.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: C.textHeader, fontSize: 15 }}>{section.title}</Typography>
                  <Typography variant="body2" sx={{ color: C.textSecondary, fontSize: 13 }}>{section.description}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
                {section.actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outlined"
                    size="small"
                    startIcon={action.icon}
                    onClick={() => router.push(action.path)}
                    sx={{
                      color: action.primary ? C.accent : C.textSecondary,
                      borderColor: action.primary ? C.accent : C.border,
                      fontSize: 12,
                      textTransform: 'none',
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Quick actions */}
      <Box
        sx={{
          backgroundColor: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          p: 2.5,
        }}
      >
        <Typography sx={{ color: C.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.5 }}>
          Quick actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { label: 'Create New Task', path: '/dashboard/admin/tasks/create', icon: <AddIcon fontSize="small" /> },
            { label: 'My Bench', path: '/dashboard/repairs/my-bench', icon: <BenchIcon fontSize="small" /> },
            { label: 'Scan Tickets', path: '/dashboard/repairs/move?mode=scan', icon: <ScanIcon fontSize="small" /> },
            { label: 'Add Material', path: '/dashboard/admin/tasks/materials', icon: <MaterialsIcon fontSize="small" /> },
            { label: 'Settings', path: '/dashboard/admin/settings', icon: <SettingsIcon fontSize="small" /> },
          ].map((action) => (
            <Button
              key={action.label}
              variant="outlined"
              size="small"
              startIcon={action.icon}
              endIcon={<ArrowIcon fontSize="small" />}
              onClick={() => router.push(action.path)}
              sx={{ color: C.textSecondary, borderColor: C.border, fontSize: 12, textTransform: 'none' }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
