import { createTheme } from '@mui/material/styles';

// Design system tokens (match UI_REDESIGN_DESIGN_DOC.md)
const BG_PRIMARY   = '#0F1115';
const BG_SECONDARY = '#171A1F';
const BG_TERTIARY  = '#1F232A';
const BG_PANEL     = '#15181D';
const BORDER       = '#2A2F38';
const TEXT_PRIMARY  = '#E6E8EB';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_MUTED   = '#6B7280';
const ACCENT       = '#D4AF37';
const SIDEBAR_BG   = '#0B0D10';
const WHITE        = '#FFFFFF';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: ACCENT,
      light: '#E8CC6B',
      dark: '#A88B20',
      contrastText: '#000000',
    },
    secondary: {
      main: '#9CA3AF',
      light: '#D1D5DB',
      dark: '#6B7280',
      contrastText: BG_PRIMARY,
    },
    background: {
      default: BG_PRIMARY,
      paper: BG_SECONDARY,
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
      disabled: TEXT_MUTED,
    },
    divider: BORDER,
    error:   { main: '#EF4444', light: 'rgba(239,68,68,0.12)',   dark: '#B91C1C' },
    warning: { main: '#F59E0B', light: 'rgba(245,158,11,0.12)',  dark: '#B45309' },
    success: { main: '#10B981', light: 'rgba(16,185,129,0.12)',  dark: '#059669' },
    info:    { main: '#3B82F6', light: 'rgba(59,130,246,0.12)',  dark: '#1D4ED8' },
    action: {
      hover:    'rgba(255,255,255,0.05)',
      selected: 'rgba(255,255,255,0.08)',
      active:   'rgba(255,255,255,0.15)',
      disabled: 'rgba(255,255,255,0.26)',
      disabledBackground: 'rgba(255,255,255,0.06)',
    },
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem',     letterSpacing: '-0.025em', lineHeight: 1.2 },
    h2: { fontWeight: 700, fontSize: '1.5rem',   letterSpacing: '-0.02em',  lineHeight: 1.25 },
    h3: { fontWeight: 600, fontSize: '1.25rem',  letterSpacing: '-0.015em', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.125rem', letterSpacing: '-0.01em',  lineHeight: 1.35 },
    h5: { fontWeight: 600, fontSize: '1rem',     letterSpacing: '-0.005em' },
    h6: { fontWeight: 600, fontSize: '0.9375rem' },
    subtitle1: { fontWeight: 500, fontSize: '0.9375rem', letterSpacing: '-0.005em' },
    subtitle2: { fontWeight: 600, fontSize: '0.75rem',   letterSpacing: '0.04em', textTransform: 'uppercase', color: TEXT_MUTED },
    body1:   { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2:   { fontSize: '0.875rem',  lineHeight: 1.55 },
    caption: { fontSize: '0.75rem',   color: TEXT_MUTED, letterSpacing: '0.01em' },
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em' },
    button: {
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
  },

  shape: { borderRadius: 6 },

  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.05)',
    '0 1px 3px rgba(0,0,0,0.08)',
    '0 4px 6px -1px rgba(0,0,0,0.07)',
    '0 4px 8px -1px rgba(0,0,0,0.09)',
    '0 8px 12px -2px rgba(0,0,0,0.08)',
    '0 10px 15px -3px rgba(0,0,0,0.08)',
    '0 12px 20px -4px rgba(0,0,0,0.08)',
    '0 16px 24px -4px rgba(0,0,0,0.08)',
    '0 20px 30px -5px rgba(0,0,0,0.08)',
    '0 24px 36px -6px rgba(0,0,0,0.08)',
    '0 28px 40px -6px rgba(0,0,0,0.08)',
    '0 32px 48px -8px rgba(0,0,0,0.09)',
    '0 36px 52px -8px rgba(0,0,0,0.09)',
    '0 40px 56px -8px rgba(0,0,0,0.09)',
    '0 44px 60px -8px rgba(0,0,0,0.09)',
    '0 48px 64px -8px rgba(0,0,0,0.10)',
    '0 52px 68px -8px rgba(0,0,0,0.10)',
    '0 56px 72px -8px rgba(0,0,0,0.11)',
    '0 60px 76px -8px rgba(0,0,0,0.11)',
    '0 64px 80px -8px rgba(0,0,0,0.11)',
    '0 68px 84px -8px rgba(0,0,0,0.12)',
    '0 72px 88px -8px rgba(0,0,0,0.12)',
    '0 76px 92px -8px rgba(0,0,0,0.13)',
    '0 80px 96px -8px rgba(0,0,0,0.14)',
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; background-color: ${BG_PRIMARY}; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3A4050; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4A5060; }
      `,
    },

    // ── Buttons ──────────────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '7px 16px',
          fontSize: '0.875rem',
          minHeight: 36,
          transition: 'all 0.2s ease',
          '&:active': { transform: 'scale(0.98)' },
        },
        sizeSmall: { padding: '4px 10px', fontSize: '0.8125rem', minHeight: 30 },
        sizeLarge: { padding: '10px 20px', fontSize: '0.9375rem', minHeight: 44 },
        contained: {
          backgroundColor: ACCENT,
          color: '#000',
          fontWeight: 700,
          '&:hover': { backgroundColor: '#E8CC6B', transform: 'translateY(-1px)' },
        },
        outlined: {
          borderColor: BORDER,
          color: TEXT_PRIMARY,
          '&:hover': { borderColor: TEXT_SECONDARY, backgroundColor: 'rgba(255,255,255,0.04)' },
        },
        text: {
          color: TEXT_SECONDARY,
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)', color: TEXT_PRIMARY },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          transition: 'background-color 0.15s ease',
          color: TEXT_SECONDARY,
          '&:hover': { backgroundColor: BG_TERTIARY, color: TEXT_PRIMARY },
        },
      },
    },

    // ── Cards & Paper ─────────────────────────────────────────────────────────
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: BG_SECONDARY,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          backgroundImage: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root:     { padding: '16px 20px 8px' },
        title:    { fontSize: '0.9375rem', fontWeight: 600, color: TEXT_PRIMARY },
        subheader: { fontSize: '0.8125rem', color: TEXT_SECONDARY },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root:     { backgroundImage: 'none', backgroundColor: BG_SECONDARY },
        outlined: { border: `1px solid ${BORDER}` },
        rounded:  { borderRadius: 12 },
      },
    },

    // ── Sidebar / Drawer ──────────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: SIDEBAR_BG,
          color: TEXT_PRIMARY,
          borderRight: `1px solid ${BORDER}`,
          backgroundImage: 'none',
        },
      },
    },

    // ── AppBar (top header stays light/white per design) ─────────────────────
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: WHITE,
          color: '#1A1A1A',
          boxShadow: 'none',
          borderBottom: '1px solid #E8E8E8',
          backgroundImage: 'none',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px !important',
          '@media (min-width:600px)': { minHeight: '64px !important' },
        },
      },
    },

    // ── List ─────────────────────────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          transition: 'all 0.15s ease',
          '&:hover': { backgroundColor: BG_TERTIARY },
          '&.Mui-selected': { backgroundColor: `${ACCENT}18`, '&:hover': { backgroundColor: `${ACCENT}22` } },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 36, color: TEXT_SECONDARY },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.875rem', fontWeight: 500, color: TEXT_PRIMARY },
        secondary: { fontSize: '0.8125rem', color: TEXT_SECONDARY },
      },
    },

    // ── Chip ─────────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          fontSize: '0.75rem',
          fontWeight: 500,
          height: 24,
          backgroundColor: BG_TERTIARY,
          color: TEXT_PRIMARY,
          border: `1px solid ${BORDER}`,
        },
        label: { paddingLeft: 8, paddingRight: 8 },
        sizeSmall: { height: 20 },
        outlined: { borderColor: BORDER, backgroundColor: 'transparent' },
        filled:   { backgroundColor: BG_TERTIARY },
      },
    },

    // ── Table ────────────────────────────────────────────────────────────────
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: BG_SECONDARY,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderColor: BORDER,
          fontSize: '0.875rem',
          color: TEXT_PRIMARY,
        },
        head: {
          fontWeight: 600,
          color: TEXT_MUTED,
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          backgroundColor: BG_PANEL,
          borderBottom: `1px solid ${BORDER}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td, &:last-child th': { border: 0 },
          '&:hover': { backgroundColor: `${BG_TERTIARY}80` },
          transition: 'background-color 0.1s ease',
        },
      },
    },

    // ── Inputs ───────────────────────────────────────────────────────────────
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiSelect:    { defaultProps: { size: 'small' } },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: '0.875rem', color: TEXT_PRIMARY },
        input: {
          '&::placeholder': { color: TEXT_MUTED, opacity: 1 },
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${BG_SECONDARY} inset`,
            WebkitTextFillColor: TEXT_PRIMARY,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: BG_SECONDARY,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: TEXT_MUTED },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ACCENT, borderWidth: 1.5 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.875rem', color: TEXT_SECONDARY, '&.Mui-focused': { color: ACCENT } },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: '0.75rem', marginTop: 4, color: TEXT_SECONDARY } },
    },

    // ── Tabs ─────────────────────────────────────────────────────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 44,
          padding: '8px 16px',
          color: TEXT_SECONDARY,
          '&.Mui-selected': { color: ACCENT, fontWeight: 600 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${BORDER}` },
        indicator: { backgroundColor: ACCENT, height: 2, borderRadius: 1 },
      },
    },

    // ── Alerts ───────────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
          padding: '8px 16px',
          alignItems: 'flex-start',
          border: '1px solid',
        },
        standardSuccess: { backgroundColor: 'rgba(16,185,129,0.10)', color: '#34D399', borderColor: 'rgba(16,185,129,0.25)' },
        standardError:   { backgroundColor: 'rgba(239,68,68,0.10)',  color: '#F87171', borderColor: 'rgba(239,68,68,0.25)' },
        standardWarning: { backgroundColor: 'rgba(245,158,11,0.10)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.25)' },
        standardInfo:    { backgroundColor: 'rgba(59,130,246,0.10)', color: '#93C5FD', borderColor: 'rgba(59,130,246,0.25)' },
        filledSuccess:   { backgroundColor: 'rgba(16,185,129,0.20)' },
        filledError:     { backgroundColor: 'rgba(239,68,68,0.20)' },
        filledWarning:   { backgroundColor: 'rgba(245,158,11,0.20)' },
        filledInfo:      { backgroundColor: 'rgba(59,130,246,0.20)' },
      },
    },

    // ── Dialogs ──────────────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_SECONDARY,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '20px 24px 12px',
          fontSize: '1rem',
          fontWeight: 600,
          color: TEXT_PRIMARY,
          borderBottom: `1px solid ${BORDER}`,
        },
      },
    },
    MuiDialogContent: { styleOverrides: { root: { padding: '16px 24px' } } },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
          gap: 8,
          borderTop: `1px solid ${BORDER}`,
        },
      },
    },

    // ── Menus ────────────────────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_SECONDARY,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 160,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '7px 14px',
          borderRadius: 4,
          margin: '2px 4px',
          color: TEXT_PRIMARY,
          '&:hover': { backgroundColor: BG_TERTIARY },
          '&.Mui-selected': {
            backgroundColor: `${ACCENT}18`,
            '&:hover': { backgroundColor: `${ACCENT}25` },
          },
        },
      },
    },

    // ── Misc ─────────────────────────────────────────────────────────────────
    MuiDivider:       { styleOverrides: { root: { borderColor: BORDER } } },
    MuiBadge:         { styleOverrides: { badge: { fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, padding: '0 4px' } } },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 3, backgroundColor: BORDER, height: 4 },
        bar:  { borderRadius: 3, backgroundColor: ACCENT },
      },
    },
    MuiCircularProgress: { defaultProps: { size: 28 }, styleOverrides: { root: { color: ACCENT } } },
    MuiSkeleton:      { styleOverrides: { root: { borderRadius: 4, backgroundColor: BG_TERTIARY } } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { backgroundColor: '#374151', fontSize: '0.75rem', padding: '6px 10px', borderRadius: 5, border: `1px solid ${BORDER}` },
        arrow:   { color: '#374151' },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        thumb:  { width: 16, height: 16 },
        track:  { borderRadius: 8, opacity: 1, backgroundColor: BORDER },
        switchBase: {
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: ACCENT, opacity: 1 },
          '&.Mui-checked .MuiSwitch-thumb': { color: '#000' },
        },
      },
    },
    MuiAccordion: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: BG_SECONDARY,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: '8px !important',
          marginBottom: 8,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: '0 0 8px 0' },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: { padding: '0 16px', minHeight: 48, '&.Mui-expanded': { minHeight: 48 } },
        content: { '&.Mui-expanded': { margin: '12px 0' } },
        expandIconWrapper: { color: TEXT_SECONDARY },
      },
    },
    MuiAccordionDetails: { styleOverrides: { root: { padding: '0 16px 16px' } } },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: BORDER,
          '&.Mui-active': { color: ACCENT },
          '&.Mui-completed': { color: ACCENT },
        },
        text: { fontWeight: 700, fontSize: '0.75rem', fill: '#000' },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_SECONDARY,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        },
        listbox: {
          fontSize: '0.875rem',
          '& .MuiAutocomplete-option': {
            borderRadius: 4,
            margin: '2px 4px',
            color: TEXT_PRIMARY,
            '&[aria-selected="true"]': { backgroundColor: `${ACCENT}18` },
            '&.Mui-focused': { backgroundColor: BG_TERTIARY },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: TEXT_MUTED,
          '&.Mui-checked': { color: ACCENT },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: { color: TEXT_MUTED, '&.Mui-checked': { color: ACCENT } },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: { fontSize: '0.875rem', color: TEXT_PRIMARY },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: TEXT_MUTED },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(0,0,0,0.7)' },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: { backgroundColor: BG_TERTIARY, color: TEXT_PRIMARY, border: `1px solid ${BORDER}` },
      },
    },
  },
});

export default theme;
