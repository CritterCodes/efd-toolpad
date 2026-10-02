import { Box, Typography, Button, Stack } from '@mui/material';
import { facelift, SurfaceCard, SectionLabel } from '@/components/facelift';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value) {
  if (!value) return 'No recent activity';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * 40px icon tile. Neutral, not gold: there is one of these on every stat card and every queue row, so
 * gold here spends the page's single accent six times before the reader reaches an action (DESIGN.md,
 * "one gold per view").
 */
export function IconTile({ children }) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '12px',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: `1px solid ${facelift.border}`,
        color: facelift.text2,
        flexShrink: 0,
        '& svg': { fontSize: 19 },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Stat card with a supporting line (and optional progress). The facelift
 * MetricCard carries value + label only; the dashboard's stats each explain
 * themselves with a sentence, which is worth keeping.
 */
export function StatCard({ label, value, subtext, icon, progress }) {
  return (
    <SurfaceCard>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <SectionLabel>{label}</SectionLabel>
          <Typography
            sx={{
              mt: 1,
              fontSize: '1.75rem',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </Typography>
        </Box>
        <IconTile>{icon}</IconTile>
      </Box>
      <Typography sx={{ mt: 'auto', pt: 1.5, fontSize: '0.8125rem', lineHeight: 1.55, color: facelift.text2 }}>
        {subtext}
      </Typography>
      {typeof progress === 'number' && (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
            <Box sx={{ width: `${progress}%`, height: '100%', borderRadius: 999, backgroundColor: facelift.text2 }} />
          </Box>
          <Typography sx={{ mt: 1, fontFamily: facelift.mono, fontSize: '0.66rem', color: facelift.text3 }}>
            {progress}% of total repair volume completed
          </Typography>
        </Box>
      )}
    </SurfaceCard>
  );
}

/** Mono overline + section title, with an optional action on the right. */
export function PanelHeader({ overline, title, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box>
        <SectionLabel>{overline}</SectionLabel>
        <Typography sx={{ mt: 0.75, fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.022em' }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}

/**
 * The text link-button at the end of rows and panels. White, not gold — there are five or six on the
 * dashboard, and "Open" is navigation, not the one thing to do next.
 */
export function OpenLink({ onClick, children = 'Open' }) {
  return (
    <Button
      endIcon={<ArrowForwardIcon />}
      onClick={onClick}
      sx={{
        color: facelift.text,
        minWidth: 0,
        p: 0,
        textTransform: 'none',
        fontWeight: 600,
        '&:hover': { backgroundColor: 'transparent', opacity: 0.9 },
      }}
    >
      {children}
    </Button>
  );
}

export const rowDividerSx = {
  py: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  '& + &': { borderTop: `1px solid ${facelift.hairline}` },
};

export function QueuePanel({ items, onNavigate }) {
  return (
    <SurfaceCard sx={{ height: '100%' }}>
      <PanelHeader overline="Operational queues" title="Focus for today" />
      <Box sx={{ mt: 1 }}>
        {items.map((item) => (
          <Box key={item.label} sx={rowDividerSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <IconTile>{item.icon}</IconTile>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>{item.label}</Typography>
                <Typography sx={{ color: facelift.text2, fontSize: '0.8125rem' }}>{item.detail}</Typography>
              </Box>
            </Box>
            <Stack alignItems="flex-end" spacing={0.75} sx={{ flexShrink: 0 }}>
              <Typography
                sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
              >
                {item.value}
              </Typography>
              <OpenLink onClick={() => onNavigate(item.href)} />
            </Stack>
          </Box>
        ))}
      </Box>
    </SurfaceCard>
  );
}

export function PriorityNotice({ hue = facelift.gold, children }) {
  return (
    <SurfaceCard accent={hue} sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, py: 1.75 }}>
      <Typography sx={{ fontSize: '0.875rem' }}>{children}</Typography>
    </SurfaceCard>
  );
}

export const DONE_STATUSES = ['READY FOR PICKUP', 'READY FOR PICK-UP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'COMPLETED'];

export function statusHue(status) {
  return DONE_STATUSES.includes(status) ? facelift.gold : '#A1A1AA';
}

export function getRepairSearchText(repair) {
  return [
    repair.repairID,
    repair.clientName,
    repair.customerName,
    repair.businessName,
    repair.description,
    repair.repairType,
    repair.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getRepairDisplayName(repair) {
  return repair.clientName || repair.customerName || repair.businessName || 'Unknown customer';
}

