export const REPAIRS_UI = {
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

export const repairsMenuProps = {
    PaperProps: {
        sx: {
            mt: 0.5,
            backgroundColor: REPAIRS_UI.bgCard,
            color: REPAIRS_UI.textPrimary,
            border: '1px solid',
            borderColor: REPAIRS_UI.border,
            boxShadow: REPAIRS_UI.shadow,
            backgroundImage: 'none',
            '& .MuiMenuItem-root': {
                borderBottom: '1px solid',
                borderColor: REPAIRS_UI.border,
                '&:last-of-type': {
                    borderBottom: 'none'
                },
                '&.Mui-selected': {
                    backgroundColor: REPAIRS_UI.bgTertiary
                },
                '&.Mui-focusVisible, &:hover': {
                    backgroundColor: REPAIRS_UI.bgPanel
                }
            }
        }
    }
};
