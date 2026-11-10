import { Alert, Box, Button, Stack } from '@mui/material';
import { AI_DOWN_MESSAGE } from '@/hooks/repairs/useSmartIntake';

/** What the sizing-stock check says, in the jeweler's words. */
export const stockCheckMessage = ({ want, have, moved, orphan, width }) => {
  if (width) return `"${width.task}" is on this ticket with "${width.stock}". Switch the sizing stock under Material if the shank is ${width.wide ? 'over' : 'under'} 3mm.`;
  if (orphan) return `There is no size-up on this ticket, so it needs no sizing stock. This ticket has ${have}.`;
  if (!(moved > 0)) return `The ring is not going up in size, so it needs no sizing stock. This ticket has ${have}.`;
  const sizes = `Sizing up ${moved} size${moved === 1 ? '' : 's'}`;
  return want > have
    ? `${sizes} needs ${want} sizing stock. This ticket has ${have}.`
    : `${sizes} needs ${want === 0 ? 'no' : want} sizing stock. This ticket has ${have}.`;
};

/**
 * What smart intake wants said, and the rulings held against the ticket as it stands: the read's warnings, the ticket
 * checks (rhodium, the metal's own task, the sizing direction) and the sizing-stock check, each with its one-tap fix.
 *
 * ONE component, shown wherever the ticket can be changed or saved. It used to live on the Work step only — but the
 * metal and the sizes are edited on Review, which is also where the save buttons are, and the classic form showed
 * none of it. A check that fires on a screen nobody is looking at is not a check (review, 2026-11-09).
 */
/** `Added "X": …` is only true while X is on the ticket. Once he deletes the line the sentence goes too. */
export const stillTrue = (note, tasks) => {
  const added = String(note).match(/^Added "(.+?)"/);
  return !added || !Array.isArray(tasks) || tasks.some((t) => String(t.title || '') === added[1]);
};

export function IntakeChecks({ applyCheck, checks, removeItem, showWarnings = true, smartIntakeNotes, stockCheck, tasks, updateItem }) {
  const warnings = showWarnings ? (smartIntakeNotes?.warnings || []).filter((note) => stillTrue(note, tasks)) : [];
  if (!smartIntakeNotes?.fallback && !warnings.length && !(checks || []).length && !stockCheck) return null;
  return (
    <Stack spacing={1.25}>
      {/* The AI was down when the sentence was read: nothing on the ticket came from it. */}
      {smartIntakeNotes?.fallback && <Alert severity="warning">{AI_DOWN_MESSAGE}</Alert>}
      {warnings.length > 0 && (
        <Alert severity="info" aria-label="What smart intake changed">
          {warnings.map((note) => <Box key={note}>{note}</Box>)}
        </Alert>
      )}
      {(checks || []).map((check) => (
        <Alert
          key={check.key}
          severity="warning"
          action={check.action ? <Button color="inherit" size="small" onClick={() => applyCheck(check)}>{check.action}</Button> : undefined}
        >
          {check.message}
        </Alert>
      ))}
      {stockCheck && (
        <Alert
          severity="warning"
          action={stockCheck.line ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => (stockCheck.lineQuantity > 0
                ? updateItem('materials', stockCheck.line.id, 'quantity', stockCheck.lineQuantity)
                : removeItem('materials', stockCheck.line.id))}
            >
              {stockCheck.lineQuantity > 0 ? `Make it ${stockCheck.want}` : 'Remove it'}
            </Button>
          ) : undefined}
        >
          {stockCheckMessage(stockCheck)}{!stockCheck.line && !stockCheck.width && ' Add it under Material.'}
        </Alert>
      )}
    </Stack>
  );
}
