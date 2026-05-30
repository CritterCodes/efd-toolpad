"use client";

import * as React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, TextField, Chip, Stack, Alert, CircularProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Format a `YYYY-MM-DD` string as e.g. "Tue, Jun 9, 2026" in local time. */
function formatHumanDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildReason(breakdown, context) {
  if (!breakdown) return "";
  if (breakdown.isRush) return "rush: next day";

  const parts = [];
  if (breakdown.usedTurnaroundFallback) {
    parts.push(`no logged hours — using ~${breakdown.avgTurnaroundDays}d shop avg`);
  } else {
    if (breakdown.jobHours) parts.push(`${breakdown.jobHours}h job`);
    if (breakdown.queueHours) {
      parts.push(`${breakdown.queueHours}h queued (${context?.openJobCount ?? 0} open)`);
    }
    parts.push(`${breakdown.dailyCapacityHours}h/day capacity`);
  }
  if (breakdown.deliveryAdjusted) parts.push("snapped to delivery day");
  if (!breakdown.usedTurnaroundFallback && breakdown.avgTurnaroundDays) {
    parts.push(`shop avg ~${breakdown.avgTurnaroundDays}d`);
  }
  return parts.join(" · ");
}

/**
 * Shows the auto-suggested promise date with its reasoning.
 *
 * In the default (editable) mode the suggestion is an overridable default —
 * `value` is the source of truth (formData.promiseDate) and "Use suggested"
 * writes the suggested date into it.
 *
 * In `readOnly` mode (wholesale intake) the date is shown prominently and is
 * NOT editable: the estimate keeps `value` in sync so it still submits, but the
 * wholesaler can only read it.
 */
export default function PromiseDateSuggestion({ estimate, context, loading, error, value, onChange, deliveryDays, readOnly = false }) {
  const suggested = estimate?.suggestedDateString;
  const breakdown = estimate?.breakdown;

  // Keep the submitted value tracking the estimate. In read-only mode the user
  // can't edit, so always mirror the suggestion; otherwise only prefill an
  // empty field so a manual override is preserved.
  React.useEffect(() => {
    if (!suggested) return;
    if (readOnly) {
      if (value !== suggested) onChange(suggested);
    } else if (!value) {
      onChange(suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

  if (readOnly) {
    return (
      <Box
        sx={{
          mt: 2,
          p: 2.5,
          borderRadius: 2,
          border: 2,
          borderColor: "primary.main",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
          textAlign: "center",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
          <AutoAwesomeIcon fontSize="small" color="primary" />
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
            Estimated Promise Date
          </Typography>
          {loading && <CircularProgress size={14} />}
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mb: 1, textAlign: "left" }}>
            Couldn&apos;t load the shop schedule — we&apos;ll confirm your promise date shortly. ({error})
          </Alert>
        )}

        {suggested ? (
          <>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.light", lineHeight: 1.2 }}>
              {formatHumanDate(suggested)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {breakdown?.isRush
                ? "Rush job — returned the next day."
                : "Based on current shop workload and your delivery schedule."}
            </Typography>
            {breakdown && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {buildReason(breakdown, context)}
              </Typography>
            )}
          </>
        ) : (
          !loading && (
            <Typography variant="body2" color="text.secondary">
              Add at least one repair task to see your estimated promise date.
            </Typography>
          )
        )}
      </Box>
    );
  }

  const matchesSuggestion = suggested && value === suggested;

  return (
    <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <AutoAwesomeIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2">Suggested Promise Date</Typography>
        {loading && <CircularProgress size={14} />}
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Couldn&apos;t load shop schedule data — enter a date manually. ({error})
        </Alert>
      )}

      {suggested && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
          <Chip
            label={suggested}
            color={matchesSuggestion ? "primary" : "default"}
            onClick={() => onChange(suggested)}
            variant={matchesSuggestion ? "filled" : "outlined"}
          />
          {!matchesSuggestion && (
            <Button size="small" onClick={() => onChange(suggested)}>
              Use suggested
            </Button>
          )}
        </Stack>
      )}

      {breakdown && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {buildReason(breakdown, context)}
        </Typography>
      )}

      <TextField
        fullWidth
        label="Promise Date"
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        helperText={
          deliveryDays?.length
            ? `Wholesale delivery days: ${deliveryDays.map((d) => DOW_LABELS[d]).join(" / ")}`
            : "You can override the suggestion."
        }
      />
    </Box>
  );
}

PromiseDateSuggestion.propTypes = {
  estimate: PropTypes.object,
  context: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  deliveryDays: PropTypes.arrayOf(PropTypes.number),
  readOnly: PropTypes.bool,
};
