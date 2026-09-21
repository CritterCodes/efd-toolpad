export const TASKS_UI = {
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

export const taskListSelectMenuProps = {
  PaperProps: {
    sx: {
      mt: 0.5,
      backgroundColor: TASKS_UI.bgCard,
      color: TASKS_UI.textPrimary,
      border: '1px solid',
      borderColor: TASKS_UI.border,
      boxShadow: TASKS_UI.shadow,
      backgroundImage: 'none',
      '& .MuiMenuItem-root': {
        borderBottom: '1px solid',
        borderColor: TASKS_UI.border,
        '&:last-of-type': {
          borderBottom: 'none'
        },
        '&.Mui-selected': {
          backgroundColor: TASKS_UI.bgTertiary
        },
        '&.Mui-focusVisible, &:hover': {
          backgroundColor: TASKS_UI.bgPanel
        }
      }
    }
  },
  MenuListProps: {
    sx: { py: 0.5 }
  }
};
