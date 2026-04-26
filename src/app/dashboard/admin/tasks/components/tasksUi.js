export const TASKS_UI = {
  bgPrimary: '#0F1115',
  bgPanel: '#15181D',
  bgCard: '#171A1F',
  bgTertiary: '#1F232A',
  border: '#2A2F38',
  textPrimary: '#E6E8EB',
  textHeader: '#D1D5DB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#D4AF37',
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
