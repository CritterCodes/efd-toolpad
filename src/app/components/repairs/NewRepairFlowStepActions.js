import { Box, Typography, Stack, Alert } from '@mui/material';
import { STEPS, PrintGlyph } from './NewRepairFlowParts';
import { ActionBar, facelift, GoldButton, QuietButton } from '@/components/facelift';

export function NewRepairFlowStepActions({ canRequestQuote, errors, goNext, loading, quoteIntent, requestQuote, setQuoteIntent, step, stepBlocker, submitErrorRef, submitLabel, submitMode, submitWith }) {
  return (
    <>
      {/* ── Step actions — sticky, primary under the thumb ─────────────── */}
      {/* The sticky containing block must be the tall root, not a wrapper the size of the bar itself
          (position:sticky can't move outside its parent) — so the wrapper IS the sticky element. */}
      <Box sx={{ mt: 2.5, position: 'sticky', bottom: 0, zIndex: 5 }}>
        {STEPS[step].next ? (
          <ActionBar>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              {stepBlocker && (
                /* Solid pill: the bar's gradient is transparent at the top, so plain text here would
                   sit over whatever scrolls under it. */
                <Typography
                  variant="caption"
                  sx={{
                    alignSelf: 'center', color: facelift.text2, mb: 0.75, px: 1.5, py: 0.5, borderRadius: 999,
                    backgroundColor: facelift.ground, border: `1px solid ${facelift.hairline}`,
                  }}
                >
                  {stepBlocker}
                </Typography>
              )}
              <GoldButton onClick={goNext} disabled={Boolean(stepBlocker)} aria-disabled={Boolean(stepBlocker)}>
                {STEPS[step].next}
              </GoldButton>
            </Box>
          </ActionBar>
        ) : (
          /* Sticky like the other steps: the review rows scroll, the actions never leave the screen. */
          <ActionBar>
            <Stack spacing={0.75} sx={{ width: '100%' }}>
              {errors.submit && <Alert ref={submitErrorRef} severity="error" sx={{ py: 0 }}>{errors.submit}</Alert>}
              {quoteIntent && canRequestQuote ? (
                <>
                  <GoldButton onClick={requestQuote} disabled={loading} aria-label="Request quote and print ticket">
                    <PrintGlyph />
                    {loading ? 'Sending…' : 'Request quote & print ticket'}
                  </GoldButton>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <QuietButton onClick={() => setQuoteIntent(false)} disabled={loading} aria-label="Price it myself instead">
                      Price it myself instead
                    </QuietButton>
                  </Box>
                </>
              ) : (
                <>
                  <GoldButton onClick={() => submitWith(true)} disabled={loading} aria-label={submitMode === 'edit' ? 'Save and print ticket' : 'Create and print ticket'}>
                    <PrintGlyph />
                    {loading ? 'Saving…' : (submitLabel || (submitMode === 'edit' ? 'Save & print ticket' : 'Create & print ticket'))}
                  </GoldButton>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <QuietButton onClick={() => submitWith(false)} disabled={loading} aria-label="Save without printing">
                      Save without printing
                    </QuietButton>
                    {/* Stores are pushed to price their own jobs; when they can't, this creates the repair with
                        no tasks and asks EFD to quote it (services/repairs/quoteRequest.js). */}
                    {canRequestQuote && (
                      <QuietButton onClick={requestQuote} disabled={loading} aria-label="Request a quote instead">
                        Request a quote instead
                      </QuietButton>
                    )}
                  </Box>
                </>
              )}
            </Stack>
          </ActionBar>
        )}
      </Box>
    </>
  );
}
