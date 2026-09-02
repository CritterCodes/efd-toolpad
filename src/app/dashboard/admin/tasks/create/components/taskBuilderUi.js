import React from 'react';
import { Box, Typography } from '@mui/material';

export const TASK_UI = {
  bgPrimary: '#08090B',
  bgPanel: '#131416',
  bgCard: '#12141A',
  bgTertiary: '#1B1C1E',
  border: 'rgba(255,255,255,0.12)',
  textPrimary: '#FFFFFF',
  textHeader: '#D1D5DB',
  textSecondary: 'rgba(255,255,255,0.66)',
  textMuted: 'rgba(255,255,255,0.5)',
  accent: '#FBBF24',
  shadow: '0 8px 24px rgba(0,0,0,0.45)'
};

export const taskSectionSx = {
  px: { xs: 0.5, sm: 2.5, md: 3 },
  py: { xs: 2, sm: 2.5 },
  backgroundColor: { xs: 'transparent', sm: TASK_UI.bgPanel },
  border: { xs: 'none', sm: '1px solid' },
  borderColor: TASK_UI.border,
  borderRadius: { xs: 0, sm: 3 },
  boxShadow: { xs: 'none', sm: TASK_UI.shadow },
  borderTop: { xs: '1px solid', sm: 'none' }
};

export const taskSectionLabelSx = {
  color: TASK_UI.textSecondary,
  fontWeight: 700,
  display: 'block',
  mb: 1.25,
  lineHeight: 1,
  letterSpacing: '0.08em'
};

export const taskSelectionCardSx = {
  mb: 1.5,
  p: { xs: 1.5, sm: 2 },
  border: '1px solid',
  borderColor: TASK_UI.border,
  borderRadius: 2,
  backgroundColor: TASK_UI.bgCard,
  boxShadow: TASK_UI.shadow
};

export const taskAutocompleteSlotProps = {
  paper: {
    sx: {
      mt: 0.5,
      backgroundColor: TASK_UI.bgCard,
      color: TASK_UI.textPrimary,
      border: '1px solid',
      borderColor: TASK_UI.border,
      boxShadow: TASK_UI.shadow,
      backgroundImage: 'none'
    }
  },
  listbox: {
    sx: {
      py: 0.5,
      '& .MuiAutocomplete-option': {
        alignItems: 'flex-start',
        borderBottom: '1px solid',
        borderColor: TASK_UI.border,
        px: 1.5,
        py: 1.25,
        '&:last-of-type': {
          borderBottom: 'none'
        },
        '&[aria-selected="true"]': {
          backgroundColor: TASK_UI.bgTertiary
        },
        '&.Mui-focused, &.Mui-focusVisible': {
          backgroundColor: TASK_UI.bgPanel
        }
      }
    }
  },
  popper: {
    sx: {
      '& .MuiAutocomplete-noOptions': {
        color: TASK_UI.textSecondary,
        backgroundColor: TASK_UI.bgCard
      }
    }
  }
};

export const taskSelectMenuProps = {
  PaperProps: {
    sx: {
      mt: 0.5,
      backgroundColor: TASK_UI.bgCard,
      color: TASK_UI.textPrimary,
      border: '1px solid',
      borderColor: TASK_UI.border,
      boxShadow: TASK_UI.shadow,
      backgroundImage: 'none',
      '& .MuiMenuItem-root': {
        borderBottom: '1px solid',
        borderColor: TASK_UI.border,
        '&:last-of-type': {
          borderBottom: 'none'
        },
        '&.Mui-selected': {
          backgroundColor: TASK_UI.bgTertiary
        },
        '&.Mui-focusVisible, &:hover': {
          backgroundColor: TASK_UI.bgPanel
        }
      }
    }
  },
  MenuListProps: {
    sx: {
      py: 0.5
    }
  }
};

export function TaskFormSection({ title, subtitle, children, sx }) {
  return (
    <Box sx={{ ...taskSectionSx, ...sx }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" sx={taskSectionLabelSx}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: TASK_UI.textSecondary }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}
