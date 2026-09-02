/**
 * Tier 1 — drop-in replacement for src/lib/theme.js
 *
 * Same structure as the existing admin theme, retokenized to the shop
 * redesign: brighter gold, near-black grounds, Space Grotesk display type,
 * IBM Plex Mono for metadata/labels, larger radii, softer borders.
 *
 * Every one of the 138 dashboard routes picks this up with no page edits.
 */
import { createTheme } from '@mui/material/styles';

// ── Shop tokens ────────────────────────────────────────────────────────────
const GROUND     = '#08090B'; // page ground (was #0F1115)
const SIDEBAR_BG = '#0A0B0E';
const PANEL      = 'rgba(255,255,255,0.045)'; // cards sit ON the ground, not above it
const PANEL_HOVER = 'rgba(255,255,255,0.075)';
const RAISED     = '#12141A'; // menus, dialogs, popovers — need opacity
const BORDER     = 'rgba(255,255,255,0.12)';
const BORDER_SOFT = 'rgba(255,255,255,0.09)';

const TEXT       = '#FFFFFF';
const TEXT_2     = 'rgba(255,255,255,0.66)';
const TEXT_3     = 'rgba(255,255,255,0.50)';

const GOLD       = '#FBBF24';
const GOLD_HOVER = '#FFCF4D';
const GOLD_WASH  = 'rgba(251,191,36,0.12)';
const GOLD_EDGE  = 'rgba(251,191,36,0.45)';

const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO    = "'IBM Plex Mono', ui-monospace, monospace";

// Mono, uppercase, wide-tracked — the shop's label voice. Used for table
// heads, overlines, chips, and any metadata that isn't prose.
const label = {
  fontFamily: MONO,
  fontWeight: 400,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: GOLD, light: GOLD_HOVER, dark: '#D19A00', contrastText: '#08090B' },
    secondary: { main: 'rgba(255,255,255,0.66)', light: '#FFFFFF', dark: 'rgba(255,255,255,0.4)', contrastText: GROUND },
    background: { default: GROUND, paper: SIDEBAR_BG },
    text: { primary: TEXT, secondary: TEXT_2, disabled: TEXT_3 },
    divider: BORDER_SOFT,
    error:   { main: '#F87171', light: 'rgba(248,113,113,0.12)', dark: '#EF4444' },
    warning: { main: '#FBBF24', light: 'rgba(251,191,36,0.12)',  dark: '#D19A00' },
    success: { main: '#34D399', light: 'rgba(52,211,153,0.12)',  dark: '#10B981' },
    info:    { main: '#7DD3FC', light: 'rgba(125,211,252,0.12)', dark: '#38BDF8' },
    action: {
      hover: 'rgba(255,255,255,0.06)',
      selected: GOLD_WASH,
      active: 'rgba(255,255,255,0.14)',
      disabled: 'rgba(255,255,255,0.28)',
      disabledBackground: 'rgba(255,255,255,0.05)',
    },
  },

  typography: {
    fontFamily: DISPLAY,
    h1: { fontWeight: 700, fontSize: '2rem',     letterSpacing: '-0.035em', lineHeight: 1.04 },
    h2: { fontWeight: 700, fontSize: '1.5rem',   letterSpacing: '-0.03em',  lineHeight: 1.12 },
    h3: { fontWeight: 600, fontSize: '1.25rem',  letterSpacing: '-0.022em', lineHeight: 1.2 },
    h4: { fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '-0.018em', lineHeight: 1.3 },
    h5: { fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.012em' },
    h6: { fontWeight: 600, fontSize: '0.875rem',  letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 500, fontSize: '0.9375rem', letterSpacing: '-0.01em' },
    subtitle2: { ...label, fontSize: '0.625rem', color: TEXT_3 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6, letterSpacing: '-0.005em' },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontFamily: MONO, fontSize: '0.71rem', color: TEXT_2, letterSpacing: '0.01em' },
    overline: { ...label, fontSize: '0.625rem' },
    button: { fontFamily: DISPLAY, fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.01em', textTransform: 'none' },
  },

  shape: { borderRadius: 12 },

  // Flat. The shop separates surfaces with 1px borders and background lift,
  // never with drop shadows — only truly floating layers get one.
  shadows: [
    'none',
    ...Array(3).fill('0 2px 8px rgba(0,0,0,0.4)'),
    ...Array(4).fill('0 8px 24px rgba(0,0,0,0.5)'),
    ...Array(17).fill('0 18px 48px rgba(0,0,0,0.62)'),
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: ${GROUND};
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }
        /* tabular figures everywhere numbers are compared in a column */
        td, th, input[type="number"] { font-variant-numeric: tabular-nums; }
      `,
    },

    // ── Buttons ────────────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '9px 18px',
          minHeight: 40,
          transition: 'background-color .15s ease, border-color .15s ease, color .15s ease',
        },
        sizeSmall: { padding: '6px 14px', minHeight: 34, fontSize: '0.8125rem' },
        sizeLarge: { padding: '13px 24px', minHeight: 48, fontSize: '0.9375rem' },
        contained: {
          backgroundColor: GOLD,
          color: '#08090B',
          fontWeight: 600,
          '&:hover': { backgroundColor: GOLD_HOVER },
        },
        outlined: {
          borderColor: BORDER,
          color: TEXT,
          '&:hover': { borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.05)' },
        },
        text: {
          color: TEXT_2,
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)', color: TEXT },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: 'rgba(255,255,255,0.85)',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)', color: TEXT },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          backgroundColor: GOLD,
          color: '#08090B',
          boxShadow: '0 0 0 4px #08090B, 0 0 0 5px rgba(255,255,255,.14), 0 12px 34px rgba(0,0,0,.6)',
          '&:hover': { backgroundColor: GOLD_HOVER },
        },
      },
    },

    // ── Surfaces ───────────────────────────────────────────────────────────
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: PANEL,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          boxShadow: 'none',
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: { root: { '&:hover': { backgroundColor: PANEL_HOVER } } },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 18, '&:last-child': { paddingBottom: 18 } } } },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: '16px 18px 6px' },
        title: { fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.012em', color: TEXT },
        subheader: { fontFamily: MONO, fontSize: '0.71rem', color: TEXT_2 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: PANEL },
        outlined: { border: `1px solid ${BORDER}` },
        rounded: { borderRadius: 16 },
      },
    },

    // ── Sidebar ────────────────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: SIDEBAR_BG,
          backgroundImage: 'none',
          color: TEXT,
          borderRight: `1px solid ${BORDER_SOFT}`,
        },
      },
    },

    // Top bar joins the dark shell — the old theme kept it white, which is the
    // single biggest reason the current admin reads as a different product.
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(8,9,11,0.86)',
          backdropFilter: 'blur(14px)',
          backgroundImage: 'none',
          color: TEXT,
          boxShadow: 'none',
          borderBottom: `1px solid ${BORDER_SOFT}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: '66px !important', '@media (min-width:600px)': { minHeight: '66px !important' } },
      },
    },

    // ── Nav lists ──────────────────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 11,
          minHeight: 46,
          color: TEXT_2,
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)', color: TEXT },
          '&.Mui-selected': {
            backgroundColor: GOLD_WASH,
            color: GOLD,
            '& .MuiListItemIcon-root': { color: GOLD },
            '& .MuiListItemText-primary': { color: GOLD },
            '&:hover': { backgroundColor: 'rgba(251,191,36,0.18)' },
          },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 32, color: 'inherit' } } },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.9rem', fontWeight: 500, letterSpacing: '-0.01em', color: 'inherit' },
        secondary: { fontFamily: MONO, fontSize: '0.71rem', color: TEXT_3 },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: { ...label, fontSize: '0.625rem', color: TEXT_3, backgroundColor: 'transparent', lineHeight: 2.4 },
      },
    },

    // ── Chips / status pills ───────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontFamily: MONO,
          fontSize: '0.6875rem',
          fontWeight: 500,
          letterSpacing: '0.03em',
          height: 26,
          backgroundColor: 'rgba(255,255,255,0.06)',
          color: TEXT,
          border: `1px solid ${BORDER}`,
        },
        label: { paddingLeft: 10, paddingRight: 10 },
        sizeSmall: { height: 22, fontSize: '0.625rem' },
        outlined: { backgroundColor: 'transparent', borderColor: BORDER },
        colorWarning: { backgroundColor: GOLD_WASH, color: GOLD, borderColor: GOLD_EDGE },
        colorSuccess: { backgroundColor: 'rgba(52,211,153,0.12)', color: '#34D399', borderColor: 'rgba(52,211,153,0.4)' },
        colorError:   { backgroundColor: 'rgba(248,113,113,0.12)', color: '#F87171', borderColor: 'rgba(248,113,113,0.4)' },
        colorInfo:    { backgroundColor: 'rgba(125,211,252,0.12)', color: '#7DD3FC', borderColor: 'rgba(125,211,252,0.4)' },
      },
    },

    // ── Tables ─────────────────────────────────────────────────────────────
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: PANEL,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          overflow: 'hidden',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '14px 18px',
          borderColor: BORDER_SOFT,
          fontSize: '0.875rem',
          letterSpacing: '-0.005em',
          color: TEXT,
        },
        head: {
          ...label,
          fontSize: '0.625rem',
          color: TEXT_3,
          padding: '12px 18px',
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderBottom: `1px solid ${BORDER}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td, &:last-child th': { border: 0 },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.035)' },
          transition: 'background-color .12s ease',
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: { color: 'inherit', '&:hover': { color: TEXT }, '&.Mui-active': { color: GOLD } },
        icon: { fontSize: 14 },
      },
    },

    // ── Inputs ─────────────────────────────────────────────────────────────
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: '0.9375rem', color: TEXT },
        input: {
          '&::placeholder': { color: TEXT_3, opacity: 1 },
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${RAISED} inset`,
            WebkitTextFillColor: TEXT,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.04)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.26)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GOLD, borderWidth: 1.5 },
        },
        input: { padding: '11px 14px' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.9375rem', color: TEXT_2, '&.Mui-focused': { color: GOLD } },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontFamily: MONO, fontSize: '0.71rem', marginTop: 6, color: TEXT_2 } },
    },
    MuiSelect: { defaultProps: { size: 'small' }, styleOverrides: { icon: { color: TEXT_3 } } },
    MuiCheckbox: { styleOverrides: { root: { color: TEXT_3, '&.Mui-checked': { color: GOLD } } } },
    MuiRadio: { styleOverrides: { root: { color: TEXT_3, '&.Mui-checked': { color: GOLD } } } },
    MuiSwitch: {
      styleOverrides: {
        track: { borderRadius: 999, opacity: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
        switchBase: {
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: GOLD, opacity: 1 },
          '&.Mui-checked .MuiSwitch-thumb': { color: '#08090B' },
        },
      },
    },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: '0.9375rem', color: TEXT } } },

    // ── Tabs ───────────────────────────────────────────────────────────────
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 48, borderBottom: `1px solid ${BORDER_SOFT}` },
        indicator: { backgroundColor: GOLD, height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          letterSpacing: '-0.01em',
          minHeight: 48,
          padding: '10px 4px',
          marginRight: 22,
          minWidth: 0,
          color: TEXT_2,
          '&.Mui-selected': { color: GOLD, fontWeight: 600 },
        },
      },
    },

    // ── Feedback ───────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 14, fontSize: '0.9375rem', padding: '12px 16px', border: '1px solid', alignItems: 'flex-start' },
        standardSuccess: { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34D399', borderColor: 'rgba(52,211,153,0.30)' },
        standardError:   { backgroundColor: 'rgba(248,113,113,0.10)', color: '#F87171', borderColor: 'rgba(248,113,113,0.30)' },
        standardWarning: { backgroundColor: GOLD_WASH, color: GOLD, borderColor: GOLD_EDGE },
        standardInfo:    { backgroundColor: 'rgba(125,211,252,0.10)', color: '#7DD3FC', borderColor: 'rgba(125,211,252,0.30)' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', height: 4 },
        bar: { borderRadius: 999, backgroundColor: GOLD },
      },
    },
    MuiCircularProgress: { defaultProps: { size: 28 }, styleOverrides: { root: { color: GOLD } } },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' } } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: RAISED,
          border: `1px solid ${BORDER}`,
          fontFamily: MONO,
          fontSize: '0.71rem',
          padding: '7px 11px',
          borderRadius: 8,
        },
        arrow: { color: RAISED },
      },
    },

    // ── Overlays (need opaque backgrounds) ─────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: RAISED,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '22px 24px 14px',
          fontSize: '1.0625rem',
          fontWeight: 600,
          letterSpacing: '-0.018em',
          borderBottom: `1px solid ${BORDER_SOFT}`,
        },
      },
    },
    MuiDialogContent: { styleOverrides: { root: { padding: '20px 24px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '14px 24px 20px', gap: 10, borderTop: `1px solid ${BORDER_SOFT}` } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: RAISED,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          minWidth: 180,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          padding: '10px 14px',
          borderRadius: 9,
          margin: '3px 6px',
          minHeight: 40,
          color: TEXT,
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' },
          '&.Mui-selected': { backgroundColor: GOLD_WASH, color: GOLD, '&:hover': { backgroundColor: 'rgba(251,191,36,0.18)' } },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { backgroundColor: RAISED, backgroundImage: 'none', border: `1px solid ${BORDER}`, borderRadius: 14 },
        listbox: {
          fontSize: '0.9375rem',
          '& .MuiAutocomplete-option': {
            borderRadius: 9,
            margin: '3px 6px',
            minHeight: 40,
            '&[aria-selected="true"]': { backgroundColor: GOLD_WASH, color: GOLD },
            '&.Mui-focused': { backgroundColor: 'rgba(255,255,255,0.07)' },
          },
        },
      },
    },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(8,9,11,0.78)' } } },
    MuiSnackbarContent: {
      styleOverrides: { root: { backgroundColor: RAISED, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 14 } },
    },

    // ── Misc ───────────────────────────────────────────────────────────────
    MuiDivider: { styleOverrides: { root: { borderColor: BORDER_SOFT } } },
    MuiBadge: {
      styleOverrides: {
        badge: { fontFamily: DISPLAY, fontSize: '0.66rem', fontWeight: 700, minWidth: 19, height: 19, padding: '0 5px', borderRadius: 999 },
        colorPrimary: { backgroundColor: GOLD, color: '#08090B' },
      },
    },
    MuiAccordion: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: PANEL,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: '16px !important',
          marginBottom: 10,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: '0 0 10px 0' },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: { padding: '0 18px', minHeight: 54, '&.Mui-expanded': { minHeight: 54 } },
        expandIconWrapper: { color: TEXT_3 },
      },
    },
    MuiAccordionDetails: { styleOverrides: { root: { padding: '0 18px 18px' } } },
    MuiStepIcon: {
      styleOverrides: {
        root: { color: 'rgba(255,255,255,0.16)', '&.Mui-active': { color: GOLD }, '&.Mui-completed': { color: GOLD } },
        text: { fontFamily: MONO, fontWeight: 500, fontSize: '0.72rem', fill: '#08090B' },
      },
    },
  },
});

export default theme;
