import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Chip,
} from '@mui/material';
import { Description as DocumentIcon } from '@mui/icons-material';
import { FaceliftRoot, SectionLabel, Field, FieldList, StatusChip, facelift } from '@/components/facelift';

/**
 * A wholesale application, read. Every fact used to be `<strong>Label:</strong> value` in 13px body text —
 * label and value in the same family, size, tracking and colour, so a screenful of facts had no hierarchy
 * and nothing scanned. `Field` carries the mono label voice DESIGN.md defines; `FieldList` columns them.
 */
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const STATUS_HUE = {
  approved: facelift.success,
  rejected: facelift.error,
  pending: facelift.gold,
};

export default function DetailDialog({ open, onClose, application }) {
  if (!application) return null;

  const { reconciliationState: reconciliation, documents } = application;
  const permit = documents?.salesTaxPermit;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Wholesale Application Details</DialogTitle>
      <DialogContent>
        <FaceliftRoot>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box>
              <SectionLabel>Business</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                <FieldList>
                  <Field label="Business name" value={application.businessName} strong />
                  <Field label="Address" value={application.businessAddress} />
                  <Field label="City" value={application.businessCity} />
                  <Field label="State" value={application.businessState} />
                  <Field label="ZIP" value={application.businessZip} mono />
                  <Field label="Country" value={application.businessCountry} />
                </FieldList>
              </Box>
            </Box>

            <Box>
              <SectionLabel>Contact</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                <FieldList>
                  <Field
                    label="Name"
                    value={[application.contactFirstName, application.contactLastName].filter(Boolean).join(' ')}
                    strong
                  />
                  <Field label="Title" value={application.contactTitle} />
                  <Field label="Email" value={application.contactEmail} mono />
                  <Field label="Phone" value={application.contactPhone} mono />
                </FieldList>
              </Box>
            </Box>

            <Box>
              <SectionLabel>Application</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                <FieldList>
                  <Field label="Status">
                    <StatusChip
                      label={application.status || 'unknown'}
                      hue={STATUS_HUE[application.status] || facelift.text3}
                    />
                  </Field>
                  {application.source && <Field label="Source" value={application.source} />}
                  <Field label="Submitted" value={formatDate(application.submittedAt)} />
                  {application.reviewedAt && <Field label="Reviewed" value={formatDate(application.reviewedAt)} />}
                </FieldList>
              </Box>

              {application.reviewNotes && (
                <Box sx={{ mt: 2 }}>
                  <Field label="Review notes" value={application.reviewNotes} />
                </Box>
              )}

              {reconciliation && (
                <Box sx={{ mt: 2 }}>
                  <Field label="Reconciliation" value={reconciliation.status} />
                  {reconciliation.candidates?.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {reconciliation.candidates.map((candidate) => (
                        <Chip
                          key={candidate.id}
                          label={candidate.businessName || candidate.email || candidate.userID}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {permit && (
              <Box>
                <SectionLabel>Documents</SectionLabel>
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DocumentIcon fontSize="small" />
                  <a href={permit.url} target="_blank" rel="noopener noreferrer">
                    Sales tax permit{permit.originalName ? ` (${permit.originalName})` : ''}
                  </a>
                </Box>
              </Box>
            )}
          </Box>
        </FaceliftRoot>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
