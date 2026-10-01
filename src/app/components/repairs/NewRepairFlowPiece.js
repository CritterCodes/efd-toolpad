import { Stack, Box, TextField, InputAdornment, Typography, Alert, Chip } from '@mui/material';
import { SectionLabel, facelift, GoldButton, StatusChip, QuietButton } from '@/components/facelift';
import SmartIntakeMic from '@/app/components/repairs/SmartIntakeMic';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import { CheckGlyph } from './NewRepairFlowParts';
import CameraCapture from '@/components/shared/CameraCapture';

export function NewRepairFlowPiece({ analyzingSmartIntake, appendDictated, clientPill, dictation, extractedChips, formData, generatingImageDescription, handleAnalyzeSmartIntake, handleGenerateDescriptionFromImage, imageDescriptionError, onDictationStatus, picturePreviewUrl, setFormData, setImageDescriptionError, setSmartIntakeError, setStep, smartIntakeError, step }) {
  return (
    <>
      {/* ── Step 2 — The piece ────────────────────────────────────────── */}
      {step === 1 && (
        <Stack spacing={2.5}>
          {clientPill}

          <Box>
            <SectionLabel>What needs doing?</SectionLabel>
            <TextField
              fullWidth
              multiline
              rows={3}
              autoFocus
              value={formData.smartIntakeInput}
              onChange={(e) => {
                setSmartIntakeError('');
                setFormData((prev) => ({ ...prev, smartIntakeInput: e.target.value }));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleAnalyzeSmartIntake();
                }
              }}
              placeholder={dictation.listening ? 'Listening… say what needs doing' : 'Size down 14k white gold ring from 7 to 6.5, retip two prongs'}
              inputProps={{ style: { fontSize: 16 } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                    <SmartIntakeMic onTranscript={appendDictated} onStatus={onDictationStatus} />
                  </InputAdornment>
                ),
              }}
              sx={{ mt: 1.5 }}
            />
            {dictation.listening && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: facelift.gold }}>
                Listening{dictation.interim ? `: “${dictation.interim}”` : '…'} Tap the mic again to stop and analyze.
              </Typography>
            )}
            {dictation.error && <Alert severity="warning" sx={{ mt: 1.5 }}>{dictation.error}</Alert>}
            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
              <GoldButton onClick={handleAnalyzeSmartIntake} disabled={analyzingSmartIntake || dictation.listening} aria-label="Analyze the sentence">
                <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                {analyzingSmartIntake ? 'Reading the sentence…' : 'Analyze the sentence'}
              </GoldButton>
            </Box>
            {smartIntakeError && <Alert severity="warning" sx={{ mt: 1.5 }}>{smartIntakeError}</Alert>}

            {extractedChips.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ fontFamily: facelift.mono, color: facelift.text3 }}>
                  Picked up from that sentence — tap to fix on review
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {extractedChips.map((label) => (
                    <Box
                      key={label}
                      component="button"
                      type="button"
                      onClick={() => setStep(3)}
                      aria-label={`Edit ${label} on the review step`}
                      sx={{ all: 'unset', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                    >
                      <StatusChip label={<><CheckGlyph />{label}</>} hue="#34D399" />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          <Box>
            <SectionLabel>Photo of the piece</SectionLabel>
            <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mt: 0.5 }}>
              Optional — a photo also writes the customer-facing description for you.
            </Typography>
            <Stack spacing={2} alignItems="center" sx={{ mt: 1.5 }}>
              <CameraCapture
                onCapture={(file) => {
                  setImageDescriptionError('');
                  setFormData((prev) => ({ ...prev, picture: file }));
                  handleGenerateDescriptionFromImage(file);
                }}
              />
              {formData.picture && (
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <img
                    src={picturePreviewUrl}
                    alt="Captured item"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, objectFit: 'contain', border: `1px solid ${facelift.border}` }}
                  />
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Chip
                      label={typeof formData.picture === 'string' ? 'Existing photo' : (formData.picture.name || 'Captured photo')}
                      onDelete={() => setFormData((prev) => ({ ...prev, picture: null }))}
                      sx={{ maxWidth: 250, height: 44 }}
                    />
                    <QuietButton
                      onClick={() => handleGenerateDescriptionFromImage()}
                      disabled={generatingImageDescription}
                      aria-label="Rewrite the description from the photo"
                    >
                      {generatingImageDescription ? 'Writing…' : 'Rewrite description from photo'}
                    </QuietButton>
                  </Box>
                </Box>
              )}
              {imageDescriptionError && <Alert severity="error" sx={{ width: '100%' }}>{imageDescriptionError}</Alert>}
              {generatingImageDescription && (
                <Typography variant="caption" sx={{ color: facelift.text2 }}>
                  Writing a description from the photo…
                </Typography>
              )}
            </Stack>
          </Box>

          <Box>
            <SectionLabel>Customer-facing description</SectionLabel>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              required
              placeholder="What the ticket says. Filled from the photo when one is taken."
              inputProps={{ style: { fontSize: 16 } }}
              sx={{ mt: 1.5 }}
            />
          </Box>
        </Stack>
      )}
    </>
  );
}
