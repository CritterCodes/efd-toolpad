import React from 'react';
import { Alert, Typography } from '@mui/material';

/**
 * What the session currently is, on the page you reach when you cannot sign out normally.
 *
 * These four facts read as `<strong>Label:</strong> value`, which everywhere else in the app is the shape
 * `Field` replaces. **Not here.** `/emergency-logout` sits outside the dashboard providers and renders on
 * MUI's *default light* palette — a white card, a pale blue Alert. The kit is built for the black ground,
 * so a `Field` label came out white-on-pale-blue at about 1.1:1: measured in the browser, invisible.
 * `src/components/facelift/fieldRows.guard.test.js` excludes this file for that reason.
 *
 * The real fix is the page, not the row: it is the one screen left that never got the facelift.
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
