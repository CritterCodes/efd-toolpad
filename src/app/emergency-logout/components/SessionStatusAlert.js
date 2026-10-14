import React from 'react';
import { Alert, Typography } from '@mui/material';

/**
 * What the session currently is, on the page you reach when you cannot sign out normally.
 *
 * These four facts read as `<strong>Label:</strong> value`, which everywhere else in the app is the shape
 * `Field` replaces. **Still not here — but not for the reason this comment used to give.**
 *
 * It said the page renders on MUI's default light palette, a white card and a pale blue Alert, and that a
 * `Field` label came out white-on-pale-blue at about 1.1:1. **That is no longer true.** Measured in a
 * browser 2026-10-14: `body` is `rgb(8, 9, 11)`, the Alerts are dark (light blue text on a 10% blue tint),
 * and every string on the page passes AA with alpha composited — zero failures. The `RootLayout` theme fix
 * reached this page after that note was written.
 *
 * The exclusion stands on a different footing. `Field` styles itself from `--fl-text-3` and `--fl-text`
 * with **no fallback values**, and nothing here mounts `FaceliftRoot`, so both label and value would
 * inherit the Alert's severity colour: a 10px uppercase blue label above a blue value, with none of the
 * tonal separation the component exists to create. Wrapping the Alert in `FaceliftRoot` instead puts a
 * muted grey label on a blue-tinted ground, which is worse.
 *
 * So the real fix remains the page, not the row: four status facts are a readout, not an alert, and they
 * want a `SurfaceCard` with a `FieldList`. That is a design change to the one screen a locked-out person
 * depends on, so it is worth doing deliberately rather than as a sweep.
 * `src/components/facelift/fieldRows.guard.test.js` excludes this file.
 */
export default function SessionStatusAlert({ status, session }) {
  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Current Session Status</Typography>
      <Typography><strong>Status:</strong> {status}</Typography>
      <Typography><strong>Email:</strong> {session?.user?.email || 'Not available'}</Typography>
      <Typography><strong>Role:</strong> {session?.user?.role || 'Not available'}</Typography>
      <Typography><strong>Name:</strong> {session?.user?.name || 'Not available'}</Typography>
    </Alert>
  );
}
